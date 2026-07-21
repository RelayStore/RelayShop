# =============================================
# БЛОК: PYDANTIC МОДЕЛИ
# =============================================

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field # если ещё нет

class MockPaymentRequest(BaseModel):
    order_id: int
    user_id: int

class MockPaymentResponse(BaseModel):
    status: str
    message: str



# =============================================
# НОВЫЙ ЭНДПОИНТ: /api/orders/create
# =============================================

class OrderCreateRequest(BaseModel):
    """Запрос на создание заказа от Mini App"""
    user_id: int = Field(..., description="Telegram user_id")
    product_id: str = Field(..., description="FoxReload product_id")
    product_name: str = Field(..., description="Название товара")
    product_slug: Optional[str] = Field(None, description="Slug сервиса")
    region_slug: Optional[str] = Field(None, description="Slug региона")
    quantity: int = Field(1, ge=1, description="Количество")
    amount: float = Field(..., gt=0, description="Цена в рублях")
    currency: str = Field("rub", description="Валюта")
    note: Optional[Dict[str, Any]] = Field(None, description="Дополнительные данные")


class OrderResponse(BaseModel):
    """Ответ при создании заказа (новый эндпоинт)"""
    order_id: int
    status: str
    payment_url: str
    created_at: Optional[datetime] = None


class OrderStatusResponse(BaseModel):
    """Ответ с информацией о заказе"""
    id: int
    user_id: int
    product_name: str
    amount: float
    currency: str
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    result_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# =============================================
# СТАРЫЙ ЭНДПОИНТ: /api/orders/gift (FoxReload)
# =============================================

class GiftOrderResponse(BaseModel):
    """Ответ после создания заказа через FoxReload (старый эндпоинт)"""
    order_id: str
    status: str
    price: float
    currency: str
    payment_expires_at: Optional[str] = None
    code: Optional[str] = None
    error: Optional[str] = None


# =============================================
# ОСТАЛЬНЫЕ МОДЕЛИ (без изменений)
# =============================================

class Service(BaseModel):
    slug: str
    name: str
    icon: str
    instruction: str


class Region(BaseModel):
    slug: str
    name: str
    country_code: str


class Nominal(BaseModel):
    id: str
    amount: float
    currency: str
    price: float
    stock: int
    min_quantity: int
    max_quantity: Optional[int] = None


class GiftOrderRequest(BaseModel):
    product_id: str
    quantity: int = 1
    note: Optional[Dict[str, Any]] = None
    total_price: Optional[str] = None


class SteamOrderRequest(BaseModel):
    currency: str
    login: str
    amount: int


class SteamConfigResponse(BaseModel):
    currencies: List[Dict[str, Any]]


class SteamOrderResponse(BaseModel):
    status: str
    message: Optional[str] = None
    code: Optional[str] = None


class ProductSearchResult(BaseModel):
    id: str
    name: str
    slug: str
    price: Optional[str] = None
    currency: str
    quantity: int
    attributes: Dict[str, Any]
    required_note_fields: List[str] = Field(default_factory=list)