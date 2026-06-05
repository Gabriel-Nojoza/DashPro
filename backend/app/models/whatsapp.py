import uuid
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID


class WhatsappSettings(Base):
    __tablename__ = "whatsapp_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True)
    api_url = Column(String(500))
    api_key = Column(String(500))
    instance = Column(String(255))
    phone_number = Column(String(30))
    group_id = Column(String(255))
    is_active = Column(Boolean, default=False)
    send_daily_report = Column(Boolean, default=False)
    send_low_stock_alert = Column(Boolean, default=True)
    send_order_delivered = Column(Boolean, default=True)
    daily_report_time = Column(String(5), default="08:00")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="whatsapp_settings")
