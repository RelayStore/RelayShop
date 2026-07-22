# backend/bot_client.py

import logging
import httpx
from config import config

logger = logging.getLogger(__name__)


async def send_telegram_message(user_id: int, text: str, reply_markup: dict = None):
    """
    Отправить сообщение пользователю через Telegram Bot API
    
    Args:
        user_id: Telegram user_id
        text: Текст сообщения
        reply_markup: Клавиатура (опционально)
    """
    try:
        # Формируем URL
        url = f"https://api.telegram.org/bot{config.BOT_TOKEN}/sendMessage"
        
        # Формируем payload
        payload = {
            "chat_id": user_id,
            "text": text,
            "parse_mode": "HTML"
        }
        
        if reply_markup:
            payload["reply_markup"] = reply_markup
        
        # Отправляем запрос
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            
        if response.status_code == 200:
            logger.info(f"✅ Сообщение отправлено пользователю {user_id}")
        else:
            logger.error(f"❌ Ошибка отправки сообщения: {response.status_code} - {response.text}")
            
    except Exception as e:
        logger.error(f"❌ Ошибка при отправке сообщения: {e}")


async def notify_payment_received(user_id: int, order_id: int):
    """
    Уведомление: оплата получена
    """
    text = (
        f"✅ Оплата заказа #{order_id} получена!\n\n"
        f"Ваш заказ передан в обработку.\n"
        f"Мы уведомим вас, когда товар будет готов."
    )
    logger.info(f"📨 Уведомление: оплата заказа #{order_id} для пользователя {user_id}")
    await send_telegram_message(user_id, text)


async def notify_order_completed(user_id: int, order_id: int, result_data: dict):
    """
    Уведомление о выполнении заказа (выдача товара)
    """
    code = result_data.get("code", "Код получен")
    
    text = (
        f"🎉 <b>Заказ #{order_id} выполнен!</b>\n\n"
        f"📦 Товар готов к активации:\n"
        f"<code>{code}</code>\n\n"
        f"📖 Инструкция по активации:\n"
        f"1. Перейдите на сайт сервиса\n"
        f"2. Введите полученный код\n"
        f"3. Наслаждайтесь покупкой!\n\n"
        f"💬 Если возникли вопросы — обратитесь в поддержку."
    )
    logger.info(f"📨 Уведомление: заказ #{order_id} выполнен для пользователя {user_id}")
    logger.info(f"   Код: {code}")
    await send_telegram_message(user_id, text)


async def notify_order_failed(user_id: int, order_id: int, error: str):
    """
    Уведомление об ошибке выполнения заказа
    """
    text = (
        f"❌ <b>Ошибка выполнения заказа #{order_id}</b>\n\n"
        f"Причина: {error}\n\n"
        f"Пожалуйста, обратитесь в поддержку для решения проблемы."
    )
    logger.error(f"📨 Уведомление: ошибка заказа #{order_id} для пользователя {user_id}")
    logger.error(f"   Ошибка: {error}")
    await send_telegram_message(user_id, text)


async def notify_balance_error(user_id: int, order_id: int):
    """
    Уведомление об ошибке: недостаточно средств у поставщика
    """
    text = (
        f"⚠️ <b>Заказ #{order_id} ожидает пополнения</b>\n\n"
        f"Оплата получена, но у поставщика временно недостаточно средств.\n\n"
        f"Мы пополним баланс в ближайшее время и выполним ваш заказ.\n"
        f"Статус заказа можно отследить в боте."
    )
    logger.warning(f"📨 Уведомление: ошибка баланса для заказа #{order_id}, пользователь {user_id}")
    await send_telegram_message(user_id, text)


async def notify_order_cancelled(user_id: int, order_id: int, reason: str = None):
    """
    Уведомление об отмене заказа
    """
    text = (
        f"🚫 <b>Заказ #{order_id} отменен</b>\n\n"
        f"Причина: {reason or 'Не указана'}\n\n"
        f"Если вы не отменяли заказ — обратитесь в поддержку."
    )
    logger.info(f"📨 Уведомление: заказ #{order_id} отменен для пользователя {user_id}")
    await send_telegram_message(user_id, text)


async def notify_status_update(user_id: int, order_id: int, status: str):
    """
    Уведомление об изменении статуса заказа
    """
    status_texts = {
        "pending_payment": "⏳ Ожидает оплаты",
        "paid": "✅ Оплачен",
        "processing": "🔄 В обработке",
        "completed": "🎉 Выполнен",
        "failed": "❌ Ошибка",
        "cancelled": "🚫 Отменен"
    }
    
    status_ru = status_texts.get(status, status)
    
    text = (
        f"🔄 <b>Статус заказа #{order_id} обновлен</b>\n\n"
        f"Текущий статус: {status_ru}\n\n"
        f"Следите за обновлениями в боте."
    )
    logger.info(f"📨 Уведомление: статус заказа #{order_id} → {status} для пользователя {user_id}")
    await send_telegram_message(user_id, text)

async def notify_steam_completed(user_id: int, order_id: int, amount: int, currency: str):
    text = (
        f"✅ <b>Steam пополнение выполнено!</b>\n\n"
        f"Заказ #{order_id}\n"
        f"Сумма: {amount} {currency}\n\n"
        f"Баланс Steam пополнен."
    )
    await send_telegram_message(user_id, text)