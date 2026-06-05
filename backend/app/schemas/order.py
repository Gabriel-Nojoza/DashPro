from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: Decimal
    unit_price: Decimal
    discount: Decimal = Decimal("0")
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: UUID
    order_id: UUID
    product_id: UUID
    quantity: Decimal
    unit_price: Decimal
    discount: Decimal
    total: Decimal
    notes: Optional[str] = None
    product_name: Optional[str] = None
    product_sku: Optional[str] = None

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    client_id: UUID
    items: List[OrderItemCreate]
    payment_method: Optional[str] = None
    discount: Decimal = Decimal("0")
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    payment_method: Optional[str] = None
    discount: Optional[Decimal] = None
    notes: Optional[str] = None
    cancel_reason: Optional[str] = None


class OrderResponse(BaseModel):
    id: UUID
    company_id: UUID
    client_id: UUID
    user_id: Optional[UUID] = None
    order_number: str
    status: str
    payment_method: Optional[str] = None
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    notes: Optional[str] = None
    delivered_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    client_name: Optional[str] = None
    user_name: Optional[str] = None
    items: List[OrderItemResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    items: list[OrderResponse]
    total: int
    page: int
    per_page: int
