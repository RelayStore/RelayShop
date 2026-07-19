# =============================================
# БЛОК: КЕШИРОВАНИЕ (ОБЩЕЕ ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ)
# =============================================

import time
from typing import Dict, Any, Optional
from functools import wraps
import logging

logger = logging.getLogger(__name__)


class Cache:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        logger.info("✅ Кеш инициализирован (пустой)")
    
    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            entry = self._cache[key]
            if time.time() < entry["expires_at"]:
                return entry["data"]
            else:
                del self._cache[key]
                logger.debug(f"🗑️ Кеш истек: {key}")
        return None
    
    def set(self, key: str, data: Any, ttl: int) -> None:
        self._cache[key] = {
            "data": data,
            "expires_at": time.time() + ttl
        }
        logger.debug(f"💾 Кеш сохранен: {key} (TTL: {ttl}с)")
    
    def clear(self) -> None:
        """Полная очистка кеша"""
        count = len(self._cache)
        self._cache.clear()
        logger.info(f"🗑️ Кеш очищен (удалено {count} записей)")

cache = Cache()

def cached(ttl: int):
    """
    Декоратор для кеширования результатов функции.
    Ключ кеша = имя_функции + args + kwargs
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Формируем ключ кеша
            key_parts = [func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in kwargs.items())
            cache_key = ":".join(key_parts)
            
            # Проверяем кеш
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return cached_data
            
            # Выполняем функцию
            result = await func(*args, **kwargs)
            
            # Сохраняем в кеш
            cache.set(cache_key, result, ttl)
            return result
        return wrapper
    return decorator