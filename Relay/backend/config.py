# =============================================
# БЛОК: КОНФИГУРАЦИЯ
# =============================================

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Конфигурация приложения"""
    
    # FoxReload API
    FOXRELOAD_API_KEY = os.getenv("FOXRELOAD_API_KEY", "")
    FOXRELOAD_BASE_URL = os.getenv("FOXRELOAD_BASE_URL", "https://public-api.foxreload.com")
    FOXRELOAD_LANGUAGE = os.getenv("FOXRELOAD_LANGUAGE", "ru")
    FOXRELOAD_CURRENCY = os.getenv("FOXRELOAD_CURRENCY", "rub")
    
    # Кеширование (в секундах) - общее для всех пользователей
    CACHE_TTL_REGIONS = int(os.getenv("CACHE_TTL_REGIONS", 3600))      # 1 час
    CACHE_TTL_NOMINALS = int(os.getenv("CACHE_TTL_NOMINALS", 3600))    # 1 час
    CACHE_TTL_PRICES = int(os.getenv("CACHE_TTL_PRICES", 60))          # 1 минута
    CACHE_TTL_SEARCH = int(os.getenv("CACHE_TTL_SEARCH", 300))         # 5 минут
    
    # Приложение
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    # Steam Direct конфигурация
    STEAM_DIRECT_PRODUCTS = {
        "RUB": {
            "product_id": "product_01kjp6vtkme90ba0r0dpdvkapv",
            "min": 50,
            "max": 30000,
            "symbol": "₽",
            "currency": "RUB"
        },
        "KZT": {
            "product_id": "product_01kjp6vtm9ez19ckmjwxdgy7ky",
            "min": 250,
            "max": 150000,
            "symbol": "₸",
            "currency": "KZT"
        },
        "UAH": {
            "product_id": "product_01kv84qc6tfxsbkn4t50etgbt4",
            "min": 50,
            "max": 13500,
            "symbol": "₴",
            "currency": "UAH"
        },
        "USD": {
            "product_id": "product_01kjp6vtmjf8rbbxw88719wz3b",
            "min": 1,
            "max": 300,
            "symbol": "$",
            "currency": "USD"
        }
    }
    
    @classmethod
    def validate(cls):
        if not cls.FOXRELOAD_API_KEY:
            raise ValueError("FOXRELOAD_API_KEY не задан в .env файле")
        return True


config = Config()