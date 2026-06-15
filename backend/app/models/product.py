import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, Integer, Boolean, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    sku = Column(String(100))
    description = Column(Text)
    category = Column(String(100))
    unit = Column(String(20), default="un")
    min_stock = Column(Numeric(10, 3), default=0)
    cost_price = Column(Numeric(10, 2), default=0)
    sale_price = Column(Numeric(10, 2), nullable=False)
    current_stock = Column(Numeric(10, 3), default=0)
    reserved_stock = Column(Numeric(10, 3), default=0)
    is_active = Column(Boolean, default=True)
    image_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="products")
    stock_movements = relationship("StockMovement", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
