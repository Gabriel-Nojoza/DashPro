from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: str = "un"
    min_stock: Decimal = Decimal("0")
    cost_price: Decimal = Decimal("0")
    sale_price: Decimal
    current_stock: Decimal = Decimal("0")
    image_url: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    min_stock: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    sale_price: Optional[Decimal] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None


class ProductResponse(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    sku: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: str
    min_stock: Decimal
    cost_price: Decimal
    sale_price: Decimal
    current_stock: Decimal
    is_active: bool
    image_url: Optional[str] = None
    is_low_stock: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_flag(cls, obj):
        data = cls.model_validate(obj)
        data.is_low_stock = obj.current_stock <= obj.min_stock
        return data


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    per_page: int
