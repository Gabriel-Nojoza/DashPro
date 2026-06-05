import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID
import enum


class MovementType(str, enum.Enum):
    entrada = "entrada"
    saida = "saida"
    ajuste = "ajuste"
    perda = "perda"
    devolucao = "devolucao"


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(20), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False)
    quantity_before = Column(Numeric(10, 3), nullable=False)
    quantity_after = Column(Numeric(10, 3), nullable=False)
    unit_cost = Column(Numeric(10, 2))
    reason = Column(Text)
    reference = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company")
    product = relationship("Product", back_populates="stock_movements")
    user = relationship("User")
