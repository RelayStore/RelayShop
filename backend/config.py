import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # База данных
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///relay.db")
    
    # FoxReload
    FOXRELOAD_API_KEY = os.getenv("FOXRELOAD_API_KEY", "")
    FOXRELOAD_BASE_URL = os.getenv("FOXRELOAD_BASE_URL", "https://public-api.foxreload.com")
    FOXRELOAD_LANGUAGE = os.getenv("FOXRELOAD_LANGUAGE", "ru")
    FOXRELOAD_CURRENCY = os.getenv("FOXRELOAD_CURRENCY", "rub")
    
    # Telegram Bot
    BOT_USERNAME = os.getenv("BOT_USERNAME", "relay_bot")
    BOT_API_URL = os.getenv("BOT_API_URL", "http://localhost:8080")
    BOT_TOKEN = os.getenv("BOT_TOKEN", "8770980855:AAELdkS41ozsFkNN-camcwjoBHYKgm49n0c")
    
    # Приложение
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    # Тест
    TEST_MODE = os.getenv("TEST_MODE", "true").lower() == "true"
    # Эмулируемый баланс (если TEST_MODE = true)
    MOCK_BALANCE = float(os.getenv("MOCK_BALANCE", "999999"))
    
    @classmethod
    def validate(cls):
        if not cls.FOXRELOAD_API_KEY:
            print("⚠️  Внимание: FOXRELOAD_API_KEY не задан в .env")
        return True


config = Config()