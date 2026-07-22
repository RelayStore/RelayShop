# backend/processor.py

import logging
import asyncio
from sqlalchemy.orm import Session
from datetime import datetime
import json
from database import SessionLocal
from orders import get_order_by_id, update_status, save_foxreload_result, save_foxreload_error
from foxreload import FoxReloadClient, FoxReloadError, BalanceNotEnoughError
from bot_client import notify_order_completed, notify_order_failed
from config import config

logger = logging.getLogger(__name__)

# Создаем клиент FoxReload
fox = FoxReloadClient()


async def process_order(order_id: int):
    """
    Основной процесс выполнения заказа после оплаты
    """
    logger.info(f"🚀 Запуск process_order для заказа #{order_id}")
    
    db = SessionLocal()
    
    try:
        order = get_order_by_id(db, order_id)
        if not order:
            logger.error(f"❌ Заказ #{order_id} не найден")
            return
        
        if order.status != "paid":
            logger.warning(f"⚠️ Заказ #{order_id} не в статусе paid (текущий: {order.status})")
            return
        
        user_id = order.user_id
        
        update_status(db, order_id, "processing")
        logger.info(f"🔒 Заказ #{order_id}: paid → processing (заблокирован)")
        
        # 4. Проверить баланс (эмуляция)
        logger.info(f"💰 Проверка баланса FoxReload для заказа #{order_id}")
        
        if config.TEST_MODE:
            rub_balance = config.MOCK_BALANCE
            logger.info(f"   [EMULATION] Баланс: {rub_balance} RUB (тестовый режим)")
        else:
            balance = await fox.get_balance()
            rub_balance = None
            for b in balance:
                if b.get("currency") == "rub":
                    rub_balance = float(b.get("available", 0))
                    break
            logger.info(f"   Баланс RUB: {rub_balance}")
        
        if rub_balance is None or rub_balance < order.amount:
            error_msg = f"Недостаточно средств на балансе FoxReload. Доступно: {rub_balance} RUB, нужно: {order.amount} RUB"
            logger.error(f"❌ {error_msg}")
            update_status(db, order_id, "failed", error_msg)
            save_foxreload_error(db, order_id, error_msg)
            await notify_order_failed(user_id, order_id, error_msg)
            return
        
        logger.info(f"✅ Баланс достаточен: {rub_balance} RUB >= {order.amount} RUB")
        
        # 5. Создать заказ в FoxReload (с is_mock в зависимости от режима)
        logger.info(f"📦 Создание заказа в FoxReload для заказа #{order_id}")
        
        note = {}
        if order.note:
          try:
           note_data = json.loads(order.note)
           # Для Steam Direct оставляем только login
           if order.product_slug == 'steam' and 'login' in note_data:
              note = {"login": note_data["login"]}
           else:
              note = note_data
          except:
              note = {}
        
        fox_order = await fox.create_order(
            [{
                "itemId": order.product_id,
                "quantity": order.quantity,
                "note": note if note else {}
            }],
            is_mock=config.TEST_MODE,  # ← КЛЮЧЕВОЕ ИЗМЕНЕНИЕ
            idempotency_key=f"relay_{order_id}_{datetime.utcnow().timestamp()}"
        )
        
        fox_order_id = fox_order.get("id")
        logger.info(f"   FoxReload заказ создан: {fox_order_id} (mock={config.TEST_MODE})")
        
        order.foxreload_order_id = fox_order_id
        db.commit()
        
        # 6. Оплатить заказ в FoxReload
        logger.info(f"💳 Оплата заказа в FoxReload: {fox_order_id}")
        await fox.pay_order(fox_order_id)
        logger.info(f"   FoxReload заказ оплачен (mock={config.TEST_MODE})")
        
        # 7. Ждать завершения
        logger.info(f"⏳ Ожидание завершения заказа {fox_order_id}")
        status = await wait_for_foxreload_completion(fox_order_id)
        
        # 8. Обработать результат
        if status["status"] == "completed":
            code = status.get("code")
            logger.info(f"✅ Заказ #{order_id} выполнен успешно! Код: {code}")
            
            update_status(db, order_id, "completed")
            save_foxreload_result(db, order_id, {"code": code, "foxreload_order_id": fox_order_id})
            await notify_order_completed(user_id, order_id, {"code": code})
            
        else:
            error_msg = status.get("error", "Неизвестная ошибка FoxReload")
            logger.error(f"❌ Ошибка выполнения заказа #{order_id}: {error_msg}")
            
            update_status(db, order_id, "failed", error_msg)
            save_foxreload_error(db, order_id, error_msg)
            await notify_order_failed(user_id, order_id, error_msg)
            
    except BalanceNotEnoughError as e:
        error_msg = f"Недостаточно средств на балансе FoxReload: {e}"
        logger.error(f"❌ {error_msg}")
        update_status(db, order_id, "failed", error_msg)
        save_foxreload_error(db, order_id, error_msg)
        await notify_order_failed(order.user_id, order_id, error_msg)
        
    except FoxReloadError as e:
        error_msg = f"Ошибка FoxReload: {e}"
        logger.error(f"❌ {error_msg}")
        update_status(db, order_id, "failed", error_msg)
        save_foxreload_error(db, order_id, error_msg)
        await notify_order_failed(order.user_id, order_id, error_msg)
        
    except Exception as e:
        error_msg = f"Неизвестная ошибка: {e}"
        logger.error(f"❌ {error_msg}")
        update_status(db, order_id, "failed", error_msg)
        save_foxreload_error(db, order_id, error_msg)
        await notify_order_failed(order.user_id, order_id, error_msg)
        
    finally:
        db.close()
        logger.info(f"🏁 Процесс заказа #{order_id} завершен")


async def wait_for_foxreload_completion(
    order_id: str,
    max_attempts: int = 30,
    delay: int = 2
) -> dict:
    """
    Ожидание завершения заказа FoxReload (polling)
    """
    for attempt in range(max_attempts):
        try:
            order = await fox.get_order(order_id)
            status = order.get("status")
            items = order.get("items", [])
            
            item_errors = []
            for item in items:
                if item.get("error"):
                    item_errors.append(item.get("error"))
            
            if status == "completed":
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
            
            if attempt % 5 == 0:
                logger.info(f"   Ожидание заказа {order_id}: статус {status}, попытка {attempt+1}/{max_attempts}")
            
            await asyncio.sleep(delay)
            
        except Exception as e:
            logger.error(f"   Ошибка при проверке статуса заказа {order_id}: {e}")
            await asyncio.sleep(delay)
    
    return {
        "status": "failed",
        "error": "Превышено время ожидания выполнения заказа"
    }