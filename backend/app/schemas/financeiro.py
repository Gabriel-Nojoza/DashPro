from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal


class LancamentoCreate(BaseModel):
    obra_id: Optional[UUID] = None
    tipo: str
    categoria: str
    description: str
    value: Decimal
    status: str = "pendente"
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    notes: Optional[str] = None


class LancamentoUpdate(BaseModel):
    obra_id: Optional[UUID] = None
    tipo: Optional[str] = None
    categoria: Optional[str] = None
    description: Optional[str] = None
    value: Optional[Decimal] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    notes: Optional[str] = None


class LancamentoResponse(BaseModel):
    id: UUID
    company_id: UUID
    obra_id: Optional[UUID] = None
    obra_name: Optional[str] = None
    tipo: str
    categoria: str
    description: str
    value: Decimal
    status: str
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LancamentoListResponse(BaseModel):
    items: List[LancamentoResponse]
    total: int
    page: int
    per_page: int
    total_receitas: Decimal = Decimal("0")
    total_despesas: Decimal = Decimal("0")
    saldo: Decimal = Decimal("0")
