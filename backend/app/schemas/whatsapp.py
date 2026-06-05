from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class WhatsappSettingsUpdate(BaseModel):
    phone_number: Optional[str] = None
    group_id: Optional[str] = None
    is_active: Optional[bool] = None
    send_daily_report: Optional[bool] = None
    send_low_stock_alert: Optional[bool] = None
    send_order_delivered: Optional[bool] = None


class WhatsappSettingsResponse(BaseModel):
    id: UUID
    company_id: UUID
    phone_number: Optional[str] = None
    group_id: Optional[str] = None
    is_active: bool
    send_daily_report: bool
    send_low_stock_alert: bool
    send_order_delivered: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WhatsappMessageRequest(BaseModel):
    phone: str
    message: str


class WhatsappTestRequest(BaseModel):
    message: str = "Teste de conexao - DashPro Business"


class WhatsappAdminCompanyStatus(BaseModel):
    company_id: UUID
    company_name: str
    company_slug: str
    company_status: str
    plan: str
    whatsapp_active: bool = False
    phone_number: Optional[str] = None
    group_id: Optional[str] = None
    send_daily_report: bool = False
    send_low_stock_alert: bool = False
    send_order_delivered: bool = False
    bot_connected: bool = False
    bot_group_found: bool = False
    bot_group_name: Optional[str] = None
    bot_status: str
    bot_message: str


class WhatsappAdminOverviewSummary(BaseModel):
    total_companies: int
    online_companies: int
    attention_companies: int
    inactive_companies: int
    unconfigured_companies: int


class WhatsappAdminOverviewResponse(BaseModel):
    bot_reachable: bool
    bot_connected: bool
    bot_message: str
    bot_checked_at: datetime
    configured_groups: int = 0
    joined_groups: int = 0
    uptime_seconds: Optional[int] = None
    last_connected_at: Optional[str] = None
    last_disconnected_at: Optional[str] = None
    summary: WhatsappAdminOverviewSummary
    companies: list[WhatsappAdminCompanyStatus]


class WhatsappBotStatusResponse(BaseModel):
    reachable: bool
    connected: bool
    state: Optional[str] = None
    message: str
    qr_available: bool = False
    qr_code: Optional[str] = None
    qr_ascii: Optional[str] = None
    last_qr_at: Optional[datetime] = None
    contact_count: int = 0


class WhatsappBotQrResponse(BaseModel):
    reachable: bool
    connected: bool
    state: Optional[str] = None
    available: bool = False
    message: str
    qr_code: Optional[str] = None
    qr_ascii: Optional[str] = None
    last_qr_at: Optional[datetime] = None


class WhatsappBotGroupItem(BaseModel):
    id: str
    subject: str


class WhatsappBotGroupsResponse(BaseModel):
    reachable: bool
    connected: bool
    count: int = 0
    items: list[WhatsappBotGroupItem]


class WhatsappBotContactItem(BaseModel):
    id: str
    phone: str
    name: str
    notify: Optional[str] = None
    verifiedName: Optional[str] = None
    pushName: Optional[str] = None
    source: Optional[str] = None


class WhatsappBotContactsResponse(BaseModel):
    reachable: bool
    connected: bool
    count: int = 0
    items: list[WhatsappBotContactItem]
