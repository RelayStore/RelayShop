# backend/payments.py

import logging
from sqlalchemy.orm import Session
from orders import get_order, update_status
import asyncio

logger = logging.getLogger(__name__)


def process_mock_payment(db: Session, order_id: int, user_id: int) -> dict:
    """
    Обработка mock-оплаты
    """
    
    # 1. Проверяем, существует ли заказ и принадлежит ли пользователю
    order = get_order(db, order_id, user_id)
    if not order:
        logger.warning(f"❌ Заказ #{order_id} не найден или не принадлежит пользователю {user_id}")
        return {
            "status": "error",
            "message": "Заказ не найден или не принадлежит вам"
        }
    
    # 2. Проверяем статус (должен быть pending_payment)
    if order.status != "pending_payment":
        logger.warning(f"❌ Заказ #{order_id} уже не в статусе pending_payment (текущий: {order.status})")
        return {
            "status": "error",
            "message": f"Заказ уже {order.status}. Обновите страницу."
        }
    
    # 3. Меняем статус: pending_payment → paid
    update_status(db, order_id, "paid")
    logger.info(f"✅ Заказ #{order_id}: pending_payment → paid (Mock оплата)")
    
    # 4. 🔥 ЗАПУСКАЕМ ПРОЦЕСС ВЫПОЛНЕНИЯ ЗАКАЗА (асинхронно, в фоне)
    from processor import process_order
    import asyncio
    asyncio.create_task(process_order(order_id))
    logger.info(f"🚀 Запущен фоновый процесс выполнения заказа #{order_id}")
    
    return {
        "status": "success",
        "message": "Оплата получена. Заказ передан в обработку."
    }