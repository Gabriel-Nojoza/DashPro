from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class RequisicaoItemCreate(BaseModel):
    description: str
    unit: str = "un"
    quantity: Decimal = Decimal("1")
    unit_price: Decimal = Decimal("0")
    notes: Optional[str] = None


class RequisicaoItemUpdate(BaseModel):
    description: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    notes: Optional[str] = None


class RequisicaoItemResponse(BaseModel):
    id: UUID
    requisicao_id: UUID
    description: str
    unit: str
    quantity: Decimal
    unit_price: Decimal
    total: Decimal
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class RequisicaoCreate(BaseModel):
    obra_id: Optional[UUID] = None
    notes: Optional[str] = None
    items: List[RequisicaoItemCreate] = []


class RequisicaoUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    obra_id: Optional[UUID] = None


class RequisicaoResponse(BaseModel):
    id: UUID
    company_id: UUID
    obra_id: Optional[UUID] = None
    obra_name: Optional[str] = None
    number: str
    status: str
    notes: Optional[str] = None
    total: Decimal
    requested_by_id: Optional[UUID] = None
    requested_by_name: Optional[str] = None
    approved_by_id: Optional[UUID] = None
    approved_by_name: Optional[str] = None
    items: List[RequisicaoItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class RequisicaoListResponse(BaseModel):
    items: List[RequisicaoResponse]
    total: int
    page: int
    per_page: int
