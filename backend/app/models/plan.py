import uuid
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, Numeric, Integer, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID, JSONB
import enum


class Plan(Base):
    __tablename__ = "plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    slug = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    price_monthly = Column(Numeric(10, 2), nullable=False)
    price_yearly = Column(Numeric(10, 2))
    max_users = Column(Integer, default=5)
    max_clients = Column(Integer, default=100)
    max_products = Column(Integer, default=100)
    has_whatsapp = Column(Boolean, default=False)
    has_reports = Column(Boolean, default=True)
    has_api = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    features = Column(JSONB)
    max_messages = Column(Integer, default=500)
    extra_msg_price = Column(Numeric(10, 4), default=0.25)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    subscriptions = relationship("Subscription", back_populates="plan")


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"
    expired = "expired"
    trial = "trial"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(50), default=SubscriptionStatus.trial)
    billing_cycle = Column(String(20), default="monthly")
    price = Column(Numeric(10, 2), nullable=False)
    starts_at = Column(DateTime(timezone=True), server_default=func.now())
    ends_at = Column(DateTime(timezone=True))
    cancelled_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company")
    plan = relationship("Plan", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), default=PaymentStatus.pending)
    method = Column(String(50))
    gateway = Column(String(50))
    gateway_id = Column(String(255))
    paid_at = Column(DateTime(timezone=True))
    due_date = Column(DateTime(timezone=True))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company")
    subscription = relationship("Subscription", back_populates="payments")
