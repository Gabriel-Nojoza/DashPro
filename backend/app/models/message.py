import uuid
from sqlalchemy import Column, Integer, Boolean, Numeric, Text, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID


class MessageUsage(Base):
    __tablename__ = "message_usage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    count = Column(Integer, default=0)
    extra_credits = Column(Integer, default=0)
    plan_limit = Column(Integer, nullable=False)
    extra_msg_price = Column(Numeric(10, 4), default=0.25)
    notified_80 = Column(Boolean, default=False)
    notified_100 = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company")
    credits = relationship("MessageCredit", back_populates="usage", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("company_id", "year", "month", name="uq_usage_company_month"),)

    @property
    def total_limit(self):
        return self.plan_limit + self.extra_credits

    @property
    def remaining(self):
        return max(0, self.total_limit - self.count)

    @property
    def pct_used(self):
        if self.total_limit == 0:
            return 100
        return round((self.count / self.total_limit) * 100, 1)

    @property
    def is_over_limit(self):
        return self.count >= self.total_limit

    @property
    def extra_msgs_used(self):
        return max(0, self.count - self.plan_limit)

    @property
    def extra_cost(self):
        return float(self.extra_msg_price) * self.extra_msgs_used


class MessageCredit(Base):
    __tablename__ = "message_credits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    usage_id = Column(UUID(as_uuid=True), ForeignKey("message_usage.id", ondelete="CASCADE"), nullable=True)
    amount = Column(Integer, nullable=False)
    price_per_msg = Column(Numeric(10, 4), nullable=False)
    total_value = Column(Numeric(10, 2), nullable=False)
    reason = Column(Text)
    added_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company")
    usage = relationship("MessageUsage", back_populates="credits")
    added_by = relationship("User")
