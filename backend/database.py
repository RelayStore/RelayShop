import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from config import config

# Подключение к SQLite
DATABASE_URL = config.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    product_id = Column(String(64), nullable=False)
    product_name = Column(String(255), nullable=False)
    product_slug = Column(String(64), nullable=True)
    region_slug = Column(String(64), nullable=True)
    quantity = Column(Integer, default=1)
    amount = Column(Float, nullable=False)
    currency = Column(String(8), default="rub")
    status = Column(String(32), default="pending_payment")
    note = Column(String, nullable=True)  # JSON

    foxreload_order_id = Column(String(64), nullable=True)
    foxreload_response = Column(Text, nullable=True)  # JSON
    foxreload_error = Column(Text, nullable=True)

    result_data = Column(Text, nullable=True)  # JSON

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "product_slug": self.product_slug,
            "region_slug": self.region_slug,
            "quantity": self.quantity,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "note": self.note,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


def get_db():
    """Генератор сессии БД для FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Создать таблицы"""
    Base.metadata.create_all(bind=engine)
    print("✅ База данных инициализирована")