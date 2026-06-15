from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal


class GastoAutoCreate(BaseModel):
    veiculo_id: Optional[UUID] = None
    tipo: str           # entrada | saida
    categoria: str
    descricao: str
    valor: Decimal
    data: date


class GastoAutoUpdate(BaseModel):
    veiculo_id: Optional[UUID] = None
    tipo: Optional[str] = None
    categoria: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    data: Optional[date] = None


class GastoAutoResponse(BaseModel):
    id: UUID
    company_id: UUID
    veiculo_id: Optional[UUID] = None
    veiculo_nome: Optional[str] = None
    tipo: str
    categoria: str
    descricao: str
    valor: Decimal
    data: date
    created_at: datetime

    class Config:
        from_attributes = True


class GastoAutoListResponse(BaseModel):
    items: list[GastoAutoResponse]
    total: int
    page: int
    per_page: int
    total_entradas: Decimal
    total_saidas: Decimal
    saldo: Decimal
