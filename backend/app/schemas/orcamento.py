from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class OrcamentoItemCreate(BaseModel):
    description: str
    unit: str = "un"
    order: int = 0
    quantity: Decimal = Decimal("0")
    unit_price: Decimal = Decimal("0")
    total_real: Decimal = Decimal("0")


class OrcamentoItemUpdate(BaseModel):
    description: Optional[str] = None
    unit: Optional[str] = None
    order: Optional[int] = None
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    total_real: Optional[Decimal] = None


class OrcamentoItemResponse(BaseModel):
    id: UUID
    orcamento_id: UUID
    description: str
    unit: str
    order: int
    quantity: Decimal
    unit_price: Decimal
    total_previsto: Decimal
    total_real: Decimal

    class Config:
        from_attributes = True


class OrcamentoCreate(BaseModel):
    obra_id: UUID
    name: str
    description: Optional[str] = None
    status: str = "rascunho"


class OrcamentoUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    total_real: Optional[Decimal] = None


class OrcamentoResponse(BaseModel):
    id: UUID
    company_id: UUID
    obra_id: UUID
    obra_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: str
    total_previsto: Decimal
    total_real: Decimal
    items: List[OrcamentoItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class OrcamentoListResponse(BaseModel):
    items: List[OrcamentoResponse]
    total: int
    page: int
    per_page: int
