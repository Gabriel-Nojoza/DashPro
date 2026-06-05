from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class MovementCreate(BaseModel):
    product_id: UUID
    type: str  # entrada, saida, ajuste, perda, devolucao
    quantity: Decimal
    unit_cost: Optional[Decimal] = None
    reason: Optional[str] = None
    reference: Optional[str] = None


class MovementResponse(BaseModel):
    id: UUID
    company_id: UUID
    product_id: UUID
    order_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    type: str
    quantity: Decimal
    quantity_before: Decimal
    quantity_after: Decimal
    unit_cost: Optional[Decimal] = None
    reason: Optional[str] = None
    reference: Optional[str] = None
    product_name: Optional[str] = None
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MovementListResponse(BaseModel):
    items: list[MovementResponse]
    total: int
    page: int
    per_page: int
