from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal


class EtapaCreate(BaseModel):
    name: str
    order: int = 0
    progress: int = 0
    status: str = "pendente"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None


class EtapaUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None
    progress: Optional[int] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None


class EtapaResponse(BaseModel):
    id: UUID
    obra_id: UUID
    name: str
    order: int
    progress: int
    status: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class ObraCreate(BaseModel):
    name: str
    client_name: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    contract_value: Optional[Decimal] = Decimal("0")
    status: str = "planejamento"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    responsible_id: Optional[UUID] = None


class ObraUpdate(BaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    contract_value: Optional[Decimal] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    responsible_id: Optional[UUID] = None


class ObraResponse(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    client_name: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    contract_value: Decimal
    status: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    responsible_id: Optional[UUID] = None
    responsible_name: Optional[str] = None
    etapas: List[EtapaResponse] = []
    progress: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ObraListResponse(BaseModel):
    items: List[ObraResponse]
    total: int
    page: int
    per_page: int
