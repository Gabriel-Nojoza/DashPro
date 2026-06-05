from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class PlanCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    price_monthly: Decimal
    price_yearly: Optional[Decimal] = None
    max_users: int = 5
    max_clients: int = 100
    max_products: int = 100
    has_whatsapp: bool = False
    has_reports: bool = True
    has_api: bool = False
    features: Optional[str] = None


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_monthly: Optional[Decimal] = None
    price_yearly: Optional[Decimal] = None
    max_users: Optional[int] = None
    max_clients: Optional[int] = None
    max_products: Optional[int] = None
    has_whatsapp: Optional[bool] = None
    has_reports: Optional[bool] = None
    has_api: Optional[bool] = None
    is_active: Optional[bool] = None
    features: Optional[str] = None


class PlanResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    price_monthly: Decimal
    price_yearly: Optional[Decimal] = None
    max_users: int
    max_clients: int
    max_products: int
    has_whatsapp: bool
    has_reports: bool
    has_api: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentResponse(BaseModel):
    id: UUID
    company_id: UUID
    subscription_id: Optional[UUID] = None
    amount: Decimal
    status: str
    method: Optional[str] = None
    gateway: Optional[str] = None
    gateway_id: Optional[str] = None
    paid_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
