from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, init_db
import logging
from models import OrderCreateRequest, OrderResponse
from orders import create_order
import asyncio
from typing import List, Dict, Any, Optional
from bot_client import send_telegram_message
import uuid
import httpx
from config import config
from payments import process_mock_payment
from models import (
    OrderCreateRequest,
    OrderResponse,
    GiftOrderResponse,
    GiftOrderRequest,
    SteamOrderRequest,
    SteamOrderResponse,
    ProductSearchResult,
    Region,
    Nominal,
    Service
)
from services import (
    SERVICE_CATEGORIES, 
    get_all_services, 
    get_region_filters,
    CURRENCY_SUFFIXES
)
from foxreload import (
    FoxReloadClient,
    FoxReloadError,
    BalanceNotEnoughError,
    OrderAlreadyExistsError,
    OfferPriceNotMatchedError,
    OrderPaymentNotPossibleError,
    OrderNotFoundError
)


# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Создаем приложение
app = FastAPI(
    title="Relay API",
    description="API для Telegram Mini App Relay",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Создаем клиент FoxReload
fox = FoxReloadClient()

# Инициализация БД
init_db()

# =============================================
# ЭНДПОИНТ: СОЗДАНИЕ ЗАКАЗА
# =============================================

@app.post("/api/orders/create", response_model=OrderResponse)
async def create_order_endpoint(request: OrderCreateRequest, db: Session = Depends(get_db)):
    # Для Steam цена будет получена при выполнении заказа
    # Создаём заказ с amount = 0, позже обновим из FoxReload
    order = create_order(db, request.dict())
    
    # Отправляем сообщение с кнопкой
    keyboard = {
        "inline_keyboard": [[
            {"text": "💳 Оплатить", "url": f"https://t.me/{config.BOT_USERNAME}?start=order_{order.id}"}
        ]]
    }

    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{config.BOT_TOKEN}/sendMessage",
            json={
                "chat_id": request.user_id,
                "text": f"🛒 Заказ #{order.id} создан!\n\n"
                        f"Товар: {order.product_name}\n"
                        f"Сумма: {order.amount} {order.currency}",
                "reply_markup": keyboard
            }
        )
    
    return OrderResponse(
        order_id=order.id,
        status=order.status,
        payment_url="",
        created_at=order.created_at
    )

@app.get("/api/steam/price")
async def get_steam_price(product_id: str, quantity: int):
    """
    Получить реальную цену Steam Direct от FoxReload.
    Возвращает цену в рублях (пересчёт через курс FoxReload).
    """
    try:
        # 1. Получаем цену товара от FoxReload (в USD)
        product = await fox.get_product_details(product_id)
        price_per_unit_usd = float(product.get("price", 0))
        total_usd = price_per_unit_usd * quantity
        
        # 2. Получаем курс USD → RUB от FoxReload
        rates = await fox.get_exchange_rates("usd")
        usd_to_rub = None
        for rate in rates.get("rates", []):
            if rate.get("from") == "usd" and rate.get("to") == "rub":
                usd_to_rub = float(rate.get("rate", 0))
                break
        
        if not usd_to_rub:
            raise HTTPException(status_code=500, detail="Не удалось получить курс")
        
        # 3. Пересчёт в рубли
        total_rub = total_usd * usd_to_rub
        
        return {
            "price_usd": total_usd,
            "price_rub": round(total_rub, 2),
            "currency": "rub",
            "quantity": quantity
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения цены Steam: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ЭНДПОИНТ: ПОЛУЧИТЬ ЗАКАЗ (ДЛЯ БОТА)
# =============================================

@app.get("/api/orders/{order_id}")
async def get_order_endpoint(
    order_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Получить заказ по ID с проверкой владельца.
    Используется ботом для отображения заказа.
    """
    from orders import get_order
    
    order = get_order(db, order_id, user_id)
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден или не принадлежит вам")
    
    return order.to_dict()


# =============================================
# ЭНДПОИНТ: ПОЛУЧИТЬ СЕРВИСЫ (СУЩЕСТВУЮЩИЙ)
# =============================================

@app.get("/api/services")
async def get_services():
    """Получить список сервисов"""
    return get_all_services()


# =============================================
# ЗАПУСК
# =============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=config.DEBUG
    )

# =============================================
# БЛОК: ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ОЧИСТКИ НАЗВАНИЙ
# =============================================

def clean_region_name(name: str, slug: str) -> str:
    """
    Очищает название региона от валютных суффиксов.
    Например: "Австралия AUD" → "Австралия"
              "Европа EUR" → "Европа"
    """
    # Список валют для удаления из названия
    currency_names = ["AUD", "USD", "EUR", "GBP", "CAD", "BRL", "JPY", "DKK", 
                      "NOK", "SEK", "CHF", "PLN", "HKD", "SGD", "MYR", "MXN", 
                      "SAR", "AED", "IDR", "NZD", "RUB", "UAH", "KZT", "TRY"]
    
    # Удаляем валюту из названия
    for currency in currency_names:
        # Удаляем " AUD" в конце названия
        if name.endswith(f" {currency}"):
            name = name[:-len(f" {currency}")]
            break
    
    # Если название стало пустым — используем slug
    if not name.strip():
        name = slug.replace("-", " ").title()
    
    return name.strip()
# =============================================
# БЛОК: ЭНДПОИНТЫ СЕРВИСОВ
# =============================================

@app.get("/api/services", response_model=List[Service])
async def get_services():
    """Получить список всех доступных сервисов."""
    return get_all_services()


@app.get("/api/services/{service_slug}/regions", response_model=List[Region])
async def get_service_regions(service_slug: str):
    """
    Получить регионы для сервиса.
    Данные кешируются на 1 час для всех пользователей.
    """
    service = SERVICE_CATEGORIES.get(service_slug)
    if not service:
        raise HTTPException(status_code=404, detail=f"Сервис '{service_slug}' не найден")
    
    try:
        regions_data = await fox.get_regions(service["category_id"], with_stock_only=True)
        filters = get_region_filters(service_slug)
        
        regions = []
        for region in regions_data:
            region_name = region.get("name", "")
            region_slug = region.get("slug", "")
            in_stock = region.get("inStockCount", 0)
            
            # =============================================
            # ПРОПУСКАЕМ КАТЕГОРИИ-СЕРВИСЫ (НЕ РЕГИОНЫ)
            # =============================================
            if is_service_category(region):
                logger.info(f"Пропускаем категорию-сервис: {region_name} ({region_slug})")
                continue
            
            # ===== ПРИМЕНЯЕМ ФИЛЬТРЫ =====
            if filters:
                # 1. Фильтр по названию (исключаем)
                if filters.get("exclude_names"):
                    if any(exclude in region_name for exclude in filters["exclude_names"]):
                        continue
                
                # 2. Фильтр по slug (исключаем)
                if filters.get("exclude_slugs"):
                    if any(exclude in region_slug.lower() for exclude in filters["exclude_slugs"]):
                        continue
                
                # 3. Фильтр по наличию товаров (уже не нужен, но оставлен для совместимости)
                min_stock = filters.get("min_stock", 0)
                if in_stock < min_stock:
                    continue
                
                # 4. Фильтр дублей с валютами
                if filters.get("exclude_currency_suffixes", False):
                    slug_lower = region_slug.lower()
                    if any(suffix in slug_lower for suffix in CURRENCY_SUFFIXES):
                        continue
            
            # ===== ОЧИЩАЕМ НАЗВАНИЕ ОТ ВАЛЮТЫ =====
            clean_name = clean_region_name(region_name, region_slug)
            
            # ===== ПОЛУЧАЕМ COUNTRY_CODE =====
            country_code = region.get("attributes", {}).get("country_code", "")
            if not country_code:
                country_map = {
                    "turkey": "TR", "india": "IN", "usa": "US",
                    "united-kingdom": "GB", "germany": "DE",
                    "france": "FR", "italy": "IT", "spain": "ES",
                    "canada": "CA", "australia": "AU", "brazil": "BR",
                    "japan": "JP", "uae": "AE", "global": "WW"
                }
                slug_lower = region.get("slug", "").lower()
                for key, code in country_map.items():
                    if key in slug_lower:
                        country_code = code
                        break
            
            regions.append({
                "slug": region.get("slug"),
                "name": clean_name,
                "country_code": country_code,
                "in_stock": in_stock,
                "currency": region.get("attributes", {}).get("currency", "")
            })
        
        # ===== ДЕДУПЛИКАЦИЯ РЕГИОНОВ =====
        if filters and filters.get("deduplicate", False):
            regions = deduplicate_regions(regions)
        
        return regions
        
    except FoxReloadError as e:
        logger.error(f"Ошибка FoxReload при получении регионов: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при получении регионов")
    except Exception as e:
        logger.error(f"Ошибка получения регионов: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def deduplicate_regions(regions: List[Dict]) -> List[Dict]:
    """
    Удаляет дубликаты регионов, оставляя только те, у которых есть товары.
    Если дубликаты есть, выбирает тот, у которого больше товаров или есть предпочтительная валюта.
    """
    # Группируем по названию (без валюты)
    grouped = {}
    for region in regions:
        name = region.get("name", "")
        # Убираем валюту из названия для группировки
        clean_name = name.split(" (")[0].strip()
        
        if clean_name not in grouped:
            grouped[clean_name] = []
        grouped[clean_name].append(region)
    
    # Выбираем лучший вариант для каждой группы
    result = []
    for name, items in grouped.items():
        if len(items) == 1:
            result.append(items[0])
        else:
            # Сортируем по наличию товаров (in_stock) и выбираем лучший
            best = sorted(items, key=lambda x: x.get("in_stock", 0), reverse=True)[0]
            result.append(best)
    
    return result

def is_service_category(category: Dict) -> bool:
    """
    Определяет, является ли категория сервисом (не регионом).
    
    Признаки сервиса:
    1. Есть attributeDefinitions (у регионов их нет)
    2. Нет attributes.currency (у регионов есть)
    3. Нет attributes.country_code (у регионов есть)
    """
    # Если есть attributeDefinitions — это 100% сервис
    if category.get("attributeDefinitions"):
        return True
    
    # Если есть country_code или currency — это регион
    attrs = category.get("attributes", {})
    if attrs.get("country_code") or attrs.get("currency"):
        return False
    
    # Если нет ни того, ни другого — проверяем дополнительные признаки
    slug = category.get("slug", "").lower()
    name = category.get("name", "").lower()
    
    # Слова-маркеры сервиса (не регионов)
    service_keywords = ["balance", "top-up", "direct", "пополнение", "баланс"]
    
    if any(keyword in slug for keyword in service_keywords):
        return True
    
    if any(keyword in name for keyword in service_keywords):
        return True
    
    # По умолчанию считаем регионом
    return False

@app.get("/api/services/{service_slug}/regions/{region_slug}/nominals", response_model=List[Nominal])
async def get_region_nominals(service_slug: str, region_slug: str):
    """
    Получить номиналы для региона.
    Данные кешируются на 1 час для всех пользователей.
    """
    service = SERVICE_CATEGORIES.get(service_slug)
    if not service:
        raise HTTPException(status_code=404, detail=f"Сервис '{service_slug}' не найден")
    
    logger.info(f"🔍 ЗАПРОС НОМИНАЛОВ: сервис={service_slug}, регион={region_slug}")
    
    try:
        result = await fox.get_nominals(region_slug, with_stock_only=True)
        items = result.get("items", [])
        
        logger.info(f"📦 FoxReload вернул {len(items)} товаров для региона {region_slug}")
        
        # Логируем первые 5 товаров для примера
        if items:
            logger.info(f"📋 Пример товаров из FoxReload (первые 5):")
            for i, item in enumerate(items[:5]):
                logger.info(f"  [{i+1}] ID: {item.get('id')}, Name: {item.get('name')}, Price: {item.get('price')}, Qty: {item.get('quantity')}")
        
        nominals = []
        skipped_no_amount = 0
        skipped_robux = 0
        skipped_no_price = 0
        skipped_price_error = 0
        skipped_other = 0
        used_face_value = 0  # ← НОВЫЙ СЧЕТЧИК
        
        for item in items:
            try:
                attributes = item.get("attributes", {})
                amount = attributes.get("amount")
                currency = attributes.get("currency")
                
                # =============================================
                # 🔥 ГЛАВНОЕ ИСПРАВЛЕНИЕ:
                # Если нет amount/currency — используем face_value
                # =============================================
                if amount is None or not currency:
                    face_amount = attributes.get("face_value_amount")
                    face_currency = attributes.get("face_value_currency")
                    
                    if face_amount is not None and face_currency:
                        amount = face_amount
                        currency = face_currency
                        used_face_value += 1
                        logger.debug(f"🔄 Использован face_value: {amount} {currency} для товара {item.get('id')}")
                    else:
                        logger.debug(f"⏭️ Пропущен (нет amount/currency и нет face_value): {item.get('id')}")
                        skipped_no_amount += 1
                        continue
                
                # Пропускаем Robux (это не номиналы в валюте)
                if currency == "Robux":
                    logger.debug(f"⏭️ Пропущен (Robux): {item.get('id')}")
                    skipped_robux += 1
                    continue
                
                # Проверяем цену
                price_str = item.get("price")
                if price_str is None:
                    logger.debug(f"⏭️ Пропущен (price=None): {item.get('id')}, amount={amount}, currency={currency}")
                    skipped_no_price += 1
                    continue
                
                try:
                    price = float(price_str)
                except (ValueError, TypeError) as e:
                    logger.warning(f"⏭️ Пропущен (ошибка price): {item.get('id')}, price_str={price_str}, error={e}")
                    skipped_price_error += 1
                    continue
                
                # Добавляем номинал
                nominals.append({
                    "id": item.get("id"),
                    "amount": float(amount),
                    "currency": currency,
                    "price": price,
                    "stock": item.get("quantity", 0),
                    "min_quantity": item.get("orderMinQuantity", 1),
                    "max_quantity": item.get("orderMaxQuantity")
                })
                
            except Exception as e:
                logger.error(f"❌ Ошибка обработки товара {item.get('id')}: {e}")
                skipped_other += 1
                continue
        
        # Сортируем по amount
        nominals.sort(key=lambda x: x["amount"])
        
        # ДЕТАЛЬНАЯ СТАТИСТИКА
        logger.info(f"📊 СТАТИСТИКА ОБРАБОТКИ для {region_slug}:")
        logger.info(f"  ✅ Успешно обработано: {len(nominals)} номиналов")
        logger.info(f"  🔄 Использовано face_value: {used_face_value}")
        logger.info(f"  ⏭️ Пропущено (нет amount/currency): {skipped_no_amount}")
        logger.info(f"  ⏭️ Пропущено (Robux): {skipped_robux}")
        logger.info(f"  ⏭️ Пропущено (price=None): {skipped_no_price}")
        logger.info(f"  ⏭️ Пропущено (ошибка price): {skipped_price_error}")
        logger.info(f"  ⏭️ Пропущено (другие ошибки): {skipped_other}")
        logger.info(f"  📦 Всего товаров от FoxReload: {len(items)}")
        logger.info(f"  📦 Итого возвращаем: {len(nominals)}")
        
        # Логируем возвращаемые номиналы (первые 5)
        if nominals:
            logger.info(f"📋 Возвращаемые номиналы (первые 5):")
            for i, nom in enumerate(nominals[:5]):
                logger.info(f"  [{i+1}] {nom['amount']} {nom['currency']} = {nom['price']} руб (stock: {nom['stock']})")
        
        return nominals
        
    except Exception as e:
        logger.error(f"❌ ОШИБКА получения номиналов для {region_slug}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/nominals/{product_id}")
async def get_nominal_details(product_id: str):
    """
    Получить актуальную цену и остаток для номинала.
    НЕ кешируется — всегда свежие данные.
    """
    try:
        product = await fox.get_product_details(product_id)
        
        price_str = product.get("price")
        if price_str is None:
            raise HTTPException(status_code=404, detail="Цена недоступна")
        
        return {
            "price": float(price_str),
            "stock": product.get("quantity", 0)
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения данных номинала: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# БЛОК: ЗАКАЗЫ (GIFT CARDS)
# =============================================

@app.post("/api/orders/gift", response_model=GiftOrderResponse)
async def create_gift_order(request: GiftOrderRequest):
    """Создать заказ на gift-карту."""
    try:
        idempotency_key = f"gift_{uuid.uuid4().hex[:16]}"
        
        # Формируем item с учетом note и totalPrice
        item = {
            "itemId": request.product_id,
            "quantity": request.quantity
        }
        
        # Добавляем note если есть
        if request.note:
            item["note"] = request.note
        
        # Добавляем totalPrice если указан (price guard)
        if request.total_price:
            item["totalPrice"] = request.total_price
        
        order = await fox.create_order(
            [item],
            is_mock=False,
            idempotency_key=idempotency_key
        )
        
        # Оплачиваем заказ
        payment = await fox.pay_order(order["id"])
        logger.info(f"Заказ {order['id']} оплачен, payment_id: {payment.get('id')}")
        
        # Ждем завершения заказа (gift = быстрый)
        status = await wait_for_order_completion(order["id"], order_type="gift")
        
        # Возвращаем результат
        if status["status"] == "completed":
            return {
                "order_id": order["id"],
                "status": "completed",
                "price": float(order.get("price", 0)),
                "currency": order.get("currency", "rub"),
                "payment_expires_at": order.get("paymentExpiresAt"),
                "code": status.get("code")
            }
        else:
            return {
                "order_id": order["id"],
                "status": status["status"],
                "price": float(order.get("price", 0)),
                "currency": order.get("currency", "rub"),
                "payment_expires_at": order.get("paymentExpiresAt"),
                "error": status.get("error")
            }
        
    except BalanceNotEnoughError as e:
        logger.error(f"Недостаточно средств: {e}")
        raise HTTPException(
            status_code=400,
            detail="Недостаточно средств на балансе. Пополните баланс и повторите попытку."
        )
    except OrderAlreadyExistsError as e:
        logger.error(f"Заказ уже существует: {e}")
        raise HTTPException(
            status_code=409,
            detail="Заказ уже был создан. Проверьте историю заказов."
        )
    except OfferPriceNotMatchedError as e:
        logger.error(f"Цена изменилась: {e}")
        raise HTTPException(
            status_code=409,
            detail="Цена товара изменилась. Обновите страницу и попробуйте снова."
        )
    except OrderPaymentNotPossibleError as e:
        logger.error(f"Оплата невозможна: {e}")
        raise HTTPException(
            status_code=400,
            detail="Заказ нельзя оплатить. Возможно, он уже оплачен или истек."
        )
    except OrderNotFoundError as e:
        logger.error(f"Заказ не найден: {e}")
        raise HTTPException(
            status_code=404,
            detail="Заказ не найден."
        )
    except FoxReloadError as e:
        logger.error(f"Ошибка FoxReload: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при создании заказа: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Неизвестная ошибка: {e}")
        raise HTTPException(
            status_code=500,
            detail="Произошла неизвестная ошибка. Попробуйте позже."
        )

@app.get("/api/orders/{order_id}")
async def get_order_status(order_id: str):
    """
    Получить статус заказа.
    """
    try:
        order = await fox.get_order(order_id)
        return {
            "order_id": order["id"],
            "status": order["status"],
            "price": float(order.get("price", 0)),
            "currency": order.get("currency", "rub"),
            "items": order.get("items", []),
            "external_data": order.get("items", [{}])[0].get("externalData", []) if order.get("items") else []
        }
    except Exception as e:
        logger.error(f"Ошибка получения заказа: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/balance")
async def get_balance():
    """
    Получить баланс пользователя.
    """
    try:
        balances = await fox.get_balance()
        return balances
    except Exception as e:
        logger.error(f"Ошибка получения баланса: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# БЛОК: STEAM ЭНДПОИНТЫ
# =============================================

@app.get("/api/steam/config")
async def get_steam_config():
    """
    Получить конфигурацию Steam (валюты, лимиты, быстрые суммы).
    """
    config_data = []
    for code, data in config.STEAM_DIRECT_PRODUCTS.items():
        config_data.append({
            "currency": code,
            "symbol": data["symbol"],
            "min": data["min"],
            "max": data["max"],
            "amounts": get_steam_amounts(code),
            "product_id": data["product_id"]
        })
    return {"currencies": config_data}


def get_steam_amounts(currency: str) -> List[int]:
    """Быстрые суммы для каждой валюты"""
    amounts_map = {
        "RUB": [500, 1000, 2000, 5000, 10000],
        "KZT": [1000, 5000, 10000, 25000, 50000],
        "UAH": [100, 500, 1000, 2000, 5000],
        "USD": [5, 10, 25, 50, 100]
    }
    return amounts_map.get(currency, [])


@app.post("/api/steam/order", response_model=SteamOrderResponse)
async def create_steam_order(request: SteamOrderRequest):
    """
    Создать заказ на пополнение Steam Direct.
    
    Требует:
    - currency: RUB, KZT, UAH, USD
    - login: логин Steam аккаунта
    - amount: сумма в валюте (например, 500 для RUB)
    """
    
    # 1. Проверяем валюту
    product_config = config.STEAM_DIRECT_PRODUCTS.get(request.currency)
    if not product_config:
        raise HTTPException(
            status_code=400, 
            detail=f"Валюта {request.currency} не поддерживается. Доступны: RUB, KZT, UAH, USD"
        )
    
    # 2. Проверяем сумму
    if request.amount < product_config["min"] or request.amount > product_config["max"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Сумма должна быть от {product_config['min']} до {product_config['max']} {request.currency}"
        )
    
    # 3. Проверяем логин
    if not request.login or len(request.login.strip()) < 3:
        raise HTTPException(
            status_code=400, 
            detail="Логин Steam обязателен (минимум 3 символа)"
        )
    
    # 4. Валидация логина (только латиница, цифры, _)
    import re
    if not re.match(r'^[a-zA-Z0-9_]{3,32}$', request.login.strip()):
        raise HTTPException(
            status_code=400,
            detail="Логин должен содержать 3-32 символа (латиница, цифры, _)"
        )
    
    try:
        idempotency_key = f"steam_{uuid.uuid4().hex[:16]}"
        
        # Создаем заказ с note.login
        order = await fox.create_order(
            [{
                "itemId": product_config["product_id"],
                "quantity": request.amount,  # ← сумма в валюте!
                "note": {"login": request.login.strip()}
            }],
            is_mock=True,
            idempotency_key=idempotency_key
        )
        
        logger.info(f"Steam заказ создан: {order['id']}, сумма: {request.amount} {request.currency}")
        
        # Оплачиваем заказ
        payment = await fox.pay_order(order["id"])
        logger.info(f"Steam заказ {order['id']} оплачен")
        
        # Ждем завершения (Steam может занимать до 3 минут)
        status = await wait_for_order_completion(order["id"], order_type="steam")
        
        if status["status"] == "completed":
            return {
                "status": "completed",
                "message": f"Пополнение {request.amount} {request.currency} выполнено успешно!",
                "code": status.get("code")
            }
        else:
            return {
                "status": "failed",
                "message": status.get("error", "Ошибка при пополнении. Попробуйте позже.")
            }
        
    except BalanceNotEnoughError as e:
        logger.error(f"Недостаточно средств для Steam: {e}")
        raise HTTPException(
            status_code=400,
            detail="Недостаточно средств на балансе. Пополните баланс и повторите попытку."
        )
    except OrderAlreadyExistsError as e:
        logger.error(f"Заказ уже существует: {e}")
        raise HTTPException(
            status_code=409,
            detail="Заказ уже был создан. Проверьте историю заказов."
        )
    except OfferPriceNotMatchedError as e:
        logger.error(f"Цена изменилась: {e}")
        raise HTTPException(
            status_code=409,
            detail="Цена изменилась. Обновите страницу и попробуйте снова."
        )
    except OrderNotFoundError as e:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    except FoxReloadError as e:
        logger.error(f"Ошибка FoxReload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Ошибка создания Steam заказа: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def wait_for_order_completion(
    order_id: str, 
    order_type: str = "gift",
    max_attempts: Optional[int] = None,
    delay: Optional[int] = None
):
    """
    Ожидание завершения заказа с разными настройками для разных типов.
    
    gift: быстрые заказы (коды активации) — 15 попыток × 1 сек = 15 сек
    steam: медленные заказы (прямое пополнение) — 90 попыток × 3 сек = 270 сек (4.5 минуты)
    """
    
    # Настройки для разных типов
    if max_attempts is None:
        if order_type == "steam":
            max_attempts = 90  # 4.5 минуты
        else:  # gift
            max_attempts = 15  # 15 секунд
    
    if delay is None:
        if order_type == "steam":
            delay = 3
        else:  # gift
            delay = 1
    
    for attempt in range(max_attempts):
        try:
            order = await fox.get_order(order_id)
            status = order.get("status")
            items = order.get("items", [])
            
            # Проверяем ошибки в items
            item_errors = []
            for item in items:
                if item.get("error"):
                    item_errors.append(item.get("error"))
            
            if status == "completed":
                # Извлекаем коды из externalData
                all_codes = []
                for item in items:
                    external_data = item.get("externalData", [])
                    if external_data:
                        all_codes.extend(external_data)
                
                return {
                    "status": "completed",
                    "code": all_codes[0] if all_codes else None,
                    "codes": all_codes
                }
            
            elif status == "failed" or status == "cancelled":
                error_msg = order.get("cancelReason") or item_errors[0] if item_errors else "Заказ отменен"
                return {
                    "status": "failed",
                    "error": error_msg
                }
            
            # Логируем ожидание
            if attempt % 10 == 0:
                logger.info(f"Ожидание заказа {order_id}: статус {status}, попытка {attempt+1}/{max_attempts}")
            
            await asyncio.sleep(delay)
            
        except OrderNotFoundError:
            logger.error(f"Заказ {order_id} не найден")
            return {
                "status": "failed",
                "error": "Заказ не найден"
            }
        except Exception as e:
            logger.error(f"Ошибка при проверке статуса заказа {order_id}: {e}")
            await asyncio.sleep(delay)
    
    return {
        "status": "failed",
        "error": "Превышено время ожидания пополнения"
    }

@app.get("/api/products/search")
async def search_products(query: str, limit: int = 50, with_stock_only: bool = True):
    """
    Поиск товаров по запросу (для подписок и общего поиска).
    """
    try:
        results = await fox.search_products(query, limit, with_stock_only)
        return results
    except Exception as e:
        logger.error(f"Ошибка поиска товаров: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================
# БЛОК: ЗАВЕРШЕНИЕ РАБОТЫ
# =============================================

@app.on_event("shutdown")
async def shutdown_event():
    """Закрыть соединения при завершении"""
    fox.close()

# =============================================
# БЛОК: MOCK ОПЛАТА
# =============================================

from pydantic import BaseModel


class MockPaymentRequest(BaseModel):
    order_id: int
    user_id: int


class MockPaymentResponse(BaseModel):
    status: str
    message: str


@app.post("/api/payments/mock", response_model=MockPaymentResponse)
async def mock_payment(
    request: MockPaymentRequest,
    db: Session = Depends(get_db)
):
    """
    Mock-оплата заказа.
    Принимает order_id и user_id, меняет статус на paid.
    """
    try:
        from payments import process_mock_payment
        
        logger.info(f"💰 Mock оплата: заказ #{request.order_id}, пользователь {request.user_id}")
        
        result = process_mock_payment(db, request.order_id, request.user_id)
        
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка Mock оплаты: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
# =============================================
# БЛОК: ЗАПУСК
# =============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=config.DEBUG
    )
