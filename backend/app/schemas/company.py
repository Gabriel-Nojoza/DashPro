from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional
from uuid import UUID
from datetime import datetime


class CompanyCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    cnpj: Optional[str] = None
    address: Optional[str] = None
    plan: str = "free"
    ramo: str = "comercio"


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6)
    phone: Optional[str] = None
    cnpj: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    status: Optional[str] = None
    plan: Optional[str] = None
    ramo: Optional[str] = None
    features: Optional[dict] = None


class CompanyResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    email: str
    phone: Optional[str] = None
    cnpj: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    plan: str
    status: str
    ramo: str = "comercio"
    trial_ends_at: Optional[datetime] = None
    created_at: datetime
    settings: Optional[dict] = None
    features: Optional[dict] = None

    @model_validator(mode='after')
    def extract_features(self) -> 'CompanyResponse':
        if self.features is None and self.settings:
            self.features = self.settings.get('features')
        return self

    class Config:
        from_attributes = True


class CompanyListResponse(BaseModel):
    items: list[CompanyResponse]
    total: int
    page: int
    per_page: int


class PowerBIAccount(BaseModel):
    id: Optional[str] = None
    label: str = "Conta Principal"
    tenant_id: str = ""
    client_id: str = ""
    client_secret: str = ""


class ReportPermissions(BaseModel):
    powerbi: bool = False
    powerbi_accounts: Optional[list] = []
    powerbi_workspace_id: Optional[str] = None
    powerbi_dataset_id: Optional[str] = None
    powerbi_tenant_id: Optional[str] = None
    powerbi_client_id: Optional[str] = None
    powerbi_client_secret: Optional[str] = None
