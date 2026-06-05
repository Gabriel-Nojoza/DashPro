import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, Integer, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID
import enum


class OrderStatus(str, enum.Enum):
    aberto = "aberto"
    andamento = "andamento"
    entregue = "entregue"
    cancelado = "cancelado"


class PaymentMethod(str, enum.Enum):
    dinheiro = "dinheiro"
    pix = "pix"
    cartao_credito = "cartao_credito"
    cartao_debito = "cartao_debito"
    boleto = "boleto"
    transferencia = "transferencia"


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    order_number = Column(String(50), nullable=False)
    status = Column(String(50), default=OrderStatus.aberto)
    payment_method = Column(String(50))
    subtotal = Column(Numeric(10, 2), default=0)
    discount = Column(Numeric(10, 2), default=0)
    total = Column(Numeric(10, 2), default=0)
    notes = Column(Text)
    delivered_at = Column(DateTime(timezone=True))
    cancelled_at = Column(DateTime(timezone=True))
    cancel_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="orders")
    client = relationship("Client", back_populates="orders")
    user = relationship("User")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    stock_movements = relationship("StockMovement", back_populates=None)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    discount = Column(Numeric(10, 2), default=0)
    total = Column(Numeric(10, 2), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
