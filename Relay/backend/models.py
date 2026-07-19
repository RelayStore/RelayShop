# =============================================
# БЛОК: PYDANTIC МОДЕЛИ
# =============================================

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class Service(BaseModel):
    """Модель сервиса"""
    slug: str
    name: str
    icon: str
    instruction: str


class Region(BaseModel):
    """Модель региона"""
    slug: str
    name: str
    country_code: str


class Nominal(BaseModel):
    """Модель номинала"""
    id: str
    amount: float
    currency: str
    price: float
    stock: int
    min_quantity: int
    max_quantity: Optional[int] = None


class GiftOrderRequest(BaseModel):
    """Запрос на создание заказа gift-карты"""
    product_id: str
    quantity: int = 1
    note: Optional[Dict[str, Any]] = None
    total_price: Optional[str] = None  # ← price guard


class SteamOrderRequest(BaseModel):
    """Запрос на создание заказа Steam Direct"""
    currency: str  # RUB, KZT, UAH, USD
    login: str
    amount: int  # сумма в валюте


class SteamConfigResponse(BaseModel):
    """Ответ с конфигурацией Steam"""
    currencies: List[Dict[str, Any]]


class OrderResponse(BaseModel):
    """Ответ после создания заказа"""
    order_id: str
    status: str
    price: float
    currency: str
    payment_expires_at: Optional[str] = None
    code: Optional[str] = None
    error: Optional[str] = None


class SteamOrderResponse(BaseModel):
    """Ответ после создания Steam заказа"""
    status: str
    message: Optional[str] = None
    code: Optional[str] = None


class ProductSearchResult(BaseModel):
    """Результат поиска товара"""
    id: str
    name: str
    slug: str
    price: Optional[str] = None
    currency: str
    quantity: int
    attributes: Dict[str, Any]
    required_note_fields: List[str] = Field(default_factory=list)