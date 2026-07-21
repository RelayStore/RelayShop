import logging
import json
from datetime import datetime
from sqlalchemy.orm import Session
from database import Order
from config import config

logger = logging.getLogger(__name__)


def create_order(db: Session, data: dict) -> Order:
    """
    Создать заказ в БД
    
    data: {
        user_id: int,
        product_id: str,
        product_name: str,
        product_slug: str (опционально),
        region_slug: str (опционально),
        quantity: int (опционально, по умолчанию 1),
        amount: float,
        note: dict (опционально)
    }
    """
    # Преобразуем note в JSON-строку
    note = data.get("note")
    if isinstance(note, dict):
        note = json.dumps(note, ensure_ascii=False)
    
    order = Order(
        user_id=data["user_id"],
        product_id=data["product_id"],
        product_name=data["product_name"],
        product_slug=data.get("product_slug"),
        region_slug=data.get("region_slug"),
        quantity=data.get("quantity", 1),
        amount=data["amount"],
        currency=data.get("currency", "rub"),
        status="pending_payment",
        note=note,
    )
    
    db.add(order)
    db.commit()
    db.refresh(order)
    
    logger.info(f"✅ Заказ #{order.id} создан для пользователя {order.user_id}")
    logger.info(f"   Товар: {order.product_name} | {order.amount} {order.currency}")
    
    return order


def get_order(db: Session, order_id: int, user_id: int) -> Order:
    """
    Получить заказ с проверкой владельца
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == user_id
    ).first()
    
    if order:
        logger.debug(f"📦 Заказ #{order_id} получен для пользователя {user_id}")
    
    return order


def get_order_by_id(db: Session, order_id: int) -> Order:
    """
    Получить заказ по ID (без проверки владельца)
    """
    return db.query(Order).filter(Order.id == order_id).first()


def update_status(db: Session, order_id: int, new_status: str, error: str = None) -> bool:
    """
    Обновить статус заказа
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        logger.error(f"❌ Заказ #{order_id} не найден при обновлении статуса")
        return False
    
    old_status = order.status
    order.status = new_status
    order.updated_at = datetime.utcnow()
    
    if error:
        order.foxreload_error = error
    
    db.commit()
    
    logger.info(f"🔄 Заказ #{order_id}: {old_status} → {new_status}")
    if error:
        logger.error(f"   Ошибка: {error}")
    
    return True


def save_foxreload_result(db: Session, order_id: int, result: dict):
    """
    Сохранить результат от FoxReload
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return False
    
    order.foxreload_response = json.dumps(result, ensure_ascii=False)
    order.updated_at = datetime.utcnow()
    
    if result.get("code"):
        order.result_data = json.dumps({"code": result["code"]}, ensure_ascii=False)
    
    db.commit()
    logger.info(f"💾 Сохранен результат FoxReload для заказа #{order_id}")
    return True


def save_foxreload_error(db: Session, order_id: int, error: str):
    """
    Сохранить ошибку от FoxReload
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return False
    
    order.foxreload_error = error
    order.updated_at = datetime.utcnow()
    db.commit()
    
    logger.error(f"❌ Сохранена ошибка FoxReload для заказа #{order_id}: {error}")
    return True