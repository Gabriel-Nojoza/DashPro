from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class VeiculoCreate(BaseModel):
    marca: str
    modelo: str
    ano_fabricacao: int
    ano_modelo: int
    cor: Optional[str] = None
    km: int = 0
    placa: Optional[str] = None
    combustivel: str = "flex"
    transmissao: str = "manual"
    tipo: str = "hatch"
    preco_custo: Decimal = Decimal("0")
    preco_venda: Decimal
    status: str = "disponivel"
    descricao: Optional[str] = None


class VeiculoUpdate(BaseModel):
    marca: Optional[str] = None
    modelo: Optional[str] = None
    ano_fabricacao: Optional[int] = None
    ano_modelo: Optional[int] = None
    cor: Optional[str] = None
    km: Optional[int] = None
    placa: Optional[str] = None
    combustivel: Optional[str] = None
    transmissao: Optional[str] = None
    tipo: Optional[str] = None
    preco_custo: Optional[Decimal] = None
    preco_venda: Optional[Decimal] = None
    status: Optional[str] = None
    descricao: Optional[str] = None
    is_active: Optional[bool] = None


class VeiculoResponse(BaseModel):
    id: UUID
    company_id: UUID
    marca: str
    modelo: str
    ano_fabricacao: int
    ano_modelo: int
    cor: Optional[str] = None
    km: int
    placa: Optional[str] = None
    combustivel: str
    transmissao: str
    tipo: str
    preco_custo: Decimal
    preco_venda: Decimal
    status: str
    descricao: Optional[str] = None
    fotos: list = []
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class VeiculoListResponse(BaseModel):
    items: list[VeiculoResponse]
    total: int
    page: int
    per_page: int
