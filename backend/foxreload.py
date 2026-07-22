# =============================================
# БЛОК: FOXRELOAD API КЛИЕНТ
# =============================================

import httpx
import logging
from typing import Dict, Any, List, Optional
from tenacity import retry, stop_after_attempt, wait_exponential
from config import config
from cache import cached

logger = logging.getLogger(__name__)


class FoxReloadClient:
    """Клиент для работы с FoxReload Public API"""
    
    def __init__(self):
        self.api_key = config.FOXRELOAD_API_KEY
        self.base_url = config.FOXRELOAD_BASE_URL
        self.language = config.FOXRELOAD_LANGUAGE
        self.currency = config.FOXRELOAD_CURRENCY
        
        # Используем AsyncClient для асинхронной работы
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=5.0),
            headers=self._get_headers(),
            follow_redirects=True
        )
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "X-API-Key": self.api_key,
            "X-Language": self.language,
            "X-Currency": self.currency,
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def _request(self, method: str, endpoint: str, params: Optional[Dict] = None, data: Optional[Dict] = None) -> Dict:
        """Базовый метод для выполнения запросов к FoxReload API"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = await self.client.get(url, params=params)
            elif method.upper() == "POST":
                response = await self.client.post(url, params=params, json=data)
            else:
                raise ValueError(f"Неизвестный метод: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP ошибка {e.response.status_code}: {e.response.text}")
            try:
                error_data = e.response.json()
                error_code = error_data.get("code")
                error_detail = error_data.get("detail", str(e))
                
                if error_code == "BALANCE_NOT_ENOUGH":
                    raise BalanceNotEnoughError(error_detail)
                elif error_code == "ORDER_ALREADY_EXISTS":
                    raise OrderAlreadyExistsError(error_detail)
                elif error_code == "OFFER_PRICE_NOT_MATCHED":
                    raise OfferPriceNotMatchedError(error_detail)
                elif error_code == "ORDER_PAYMENT_NOT_POSSIBLE":
                    raise OrderPaymentNotPossibleError(error_detail)
                elif error_code == "NOT_FOUND" or e.response.status_code == 404:
                    raise OrderNotFoundError(error_detail)
                else:
                    raise FoxReloadError(f"{error_code}: {error_detail}" if error_code else str(e))
            except (ValueError, KeyError):
                raise FoxReloadError(f"HTTP {e.response.status_code}: {e.response.text}")
                
        except (BalanceNotEnoughError, OrderAlreadyExistsError, 
                OfferPriceNotMatchedError, OrderPaymentNotPossibleError,
                OrderNotFoundError, FoxReloadError):
            raise
        except Exception as e:
            logger.error(f"Ошибка запроса: {e}")
            raise FoxReloadError(str(e))
    
    # =============================================
    # КЕШИРУЕМЫЕ МЕТОДЫ (общие для всех пользователей)
    # =============================================
    
    @cached(ttl=3600)
    async def get_regions(self, service_category_id: str, with_stock_only: bool = True) -> List[Dict[str, Any]]:
        """
        Получить регионы для сервиса по ID категории.
        Кешируется на 1 час для всех пользователей.
        """
        result = await self._request(
            "GET",
            "/api/categories/",
            params={
                "parent_id_or_slug": service_category_id,
                "limit": 100,
                "withStockOnly": with_stock_only
            }
        )
        return result.get("items", [])
    
    @cached(ttl=3600)
    async def get_nominals(self, region_slug: str, with_stock_only: bool = True) -> Dict[str, Any]:
        """
        Получить номиналы для региона по slug.
        Кешируется на 1 час для всех пользователей.
        """
        result = await self._request(
            "GET",
            "/api/products/",
            params={
                "category_id_or_slug": region_slug,
                "limit": 200,
                "withStockOnly": with_stock_only
            }
        )
        return result
    
    @cached(ttl=300)
    async def search_products(self, query: str, limit: int = 100, with_stock_only: bool = True) -> List[Dict[str, Any]]:
        """
        Поиск товаров по запросу.
        Кешируется на 5 минут.
        """
        result = await self._request(
            "GET",
            "/api/products/search",
            params={
                "query": query,
                "limit": limit,
                "withStockOnly": with_stock_only
            }
        )
        return result
    
    # =============================================
    # НЕ КЕШИРУЕМЫЕ МЕТОДЫ (актуальные данные)
    # =============================================
    
    async def get_product_details(self, product_id: str) -> Dict[str, Any]:
        """
        Получить актуальную цену и остаток товара.
        НЕ кешируется — всегда свежие данные.
        """
        return await self._request(
            "GET",
            f"/api/products/{product_id}"
        )
    
    async def create_order(
        self, 
        items: List[Dict], 
        is_mock: bool = False, 
        idempotency_key: Optional[str] = None
    ) -> Dict:
        """
        Создать заказ.
        
        Args:
            items: Список товаров [{"itemId": "...", "quantity": 1, "note": {...}}]
            is_mock: Тестовый режим (без списания)
            idempotency_key: Защита от дублей
        """
        # Проверяем requiredNoteFields для каждого товара
        for item in items:
            product_id = item.get("itemId")
            note = item.get("note", {})
            
            try:
                product = await self.get_product_details(product_id)
                required_fields = product.get("requiredNoteFields", [])
                
                for field in required_fields:
                    if field not in note or not note.get(field):
                        raise ValueError(f"Поле '{field}' обязательно для товара {product_id}")
            except Exception as e:
                logger.warning(f"Не удалось проверить requiredNoteFields: {e}")
        
        payload = {
            "items": items,
            "isMock": is_mock
        }
        if idempotency_key:
            payload["idempotencyKey"] = idempotency_key
        
        return await self._request(
            "POST",
            "/api/orders/",
            data=payload
        )
    
    async def pay_order(self, order_id: str) -> Dict:
        """Оплатить заказ с баланса"""
        return await self._request(
            "POST",
            f"/api/orders/{order_id}/pay",
            data={}
        )
    
    async def get_order(self, order_id: str) -> Dict:
        """Получить статус заказа"""
        return await self._request(
            "GET",
            f"/api/orders/{order_id}"
        )
    
    async def get_balance(self) -> List[Dict]:
        """Получить баланс пользователя"""
        return await self._request(
            "GET",
            "/api/access/me/balances/"
        )
    
    async def close(self):
        """Закрыть HTTP клиент"""
        await self.client.aclose()

    async def get_exchange_rates(self, to_currency: str = "usd") -> Dict:
      """Получить курсы валют от FoxReload"""
      return await self._request(
        "GET",
        f"/api/topups/rates/{to_currency}"
      )    


# =============================================
# БЛОК: ИСКЛЮЧЕНИЯ FOXRELOAD
# =============================================

class FoxReloadError(Exception):
    """Базовое исключение для ошибок FoxReload"""
    pass

class BalanceNotEnoughError(FoxReloadError):
    """Недостаточно средств на балансе"""
    pass

class OrderAlreadyExistsError(FoxReloadError):
    """Заказ с таким idempotencyKey уже существует"""
    pass

class OfferPriceNotMatchedError(FoxReloadError):
    """Цена изменилась"""
    pass

class OrderPaymentNotPossibleError(FoxReloadError):
    """Заказ нельзя оплатить"""
    pass

class OrderNotFoundError(FoxReloadError):
    """Заказ не найден"""
    pass