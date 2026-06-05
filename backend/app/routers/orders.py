from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from app.database import get_db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.stock import StockMovement
from app.models.product import Product
from app.models.client import Client
from app.models.user import User
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse, OrderListResponse, OrderItemResponse
from app.dependencies import get_current_active_user, require_company_admin
from app.services.whatsapp import send_order_delivered_notification

router = APIRouter(prefix="/orders", tags=["Pedidos"])


def _build_order_number(company_id, count: int) -> str:
    return f"PED-{str(count + 1).zfill(5)}"


@router.get("", response_model=OrderListResponse)
async def list_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    client_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.client),
        selectinload(Order.user),
    )
    if current_user.company_id:
        query = query.where(Order.company_id == current_user.company_id)
    if status:
        query = query.where(Order.status == status)
    if client_id:
        query = query.where(Order.client_id == client_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    query = query.order_by(Order.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    orders = result.scalars().all()

    items = []
    for o in orders:
        data = _serialize_order(o)
        items.append(data)

    return OrderListResponse(items=items, total=total, page=page, per_page=per_page)


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Empresa não identificada")

    client_result = await db.execute(
        select(Client).where(
            Client.id == payload.client_id,
            Client.company_id == current_user.company_id,
        )
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    count_result = await db.execute(
        select(func.count()).where(Order.company_id == current_user.company_id)
    )
    count = count_result.scalar()

    order = Order(
        company_id=current_user.company_id,
        client_id=payload.client_id,
        user_id=current_user.id,
        order_number=_build_order_number(current_user.company_id, count),
        status=OrderStatus.aberto,
        payment_method=payload.payment_method,
        discount=payload.discount,
        notes=payload.notes,
    )
    db.add(order)
    await db.flush()

    subtotal = Decimal("0")
    for item_data in payload.items:
        product_result = await db.execute(
            select(Product).where(
                Product.id == item_data.product_id,
                Product.company_id == current_user.company_id,
            )
        )
        product = product_result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail=f"Produto {item_data.product_id} não encontrado")

        item_total = (item_data.quantity * item_data.unit_price) - item_data.discount
        subtotal += item_total

        item = OrderItem(
            order_id=order.id,
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            discount=item_data.discount,
            total=item_total,
            notes=item_data.notes,
        )
        db.add(item)

    order.subtotal = subtotal
    order.total = subtotal - payload.discount

    await db.commit()
    await db.refresh(order)

    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(Order.id == order.id)
    )
    order = result.scalar_one()
    return _serialize_order(order, client_name=client.name, user_name=current_user.name)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.client),
            selectinload(Order.user),
        )
        .where(Order.id == order_id)
    )
    if current_user.company_id:
        query = query.where(Order.company_id == current_user.company_id)
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return _serialize_order(order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    payload: OrderUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.client),
            selectinload(Order.user),
        )
        .where(Order.id == order_id)
    )
    if current_user.company_id:
        query = query.where(Order.company_id == current_user.company_id)
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if payload.status == OrderStatus.cancelado and order.status == OrderStatus.cancelado:
        raise HTTPException(status_code=400, detail="Pedido já cancelado")

    previous_status = order.status

    if payload.status:
        order.status = payload.status

        if payload.status == OrderStatus.entregue and previous_status != OrderStatus.entregue:
            order.delivered_at = datetime.utcnow()
            for item in order.items:
                product_result = await db.execute(
                    select(Product).where(
                        Product.id == item.product_id,
                        Product.company_id == current_user.company_id,
                    )
                )
                product = product_result.scalar_one_or_none()
                if product:
                    qty_before = Decimal(str(product.current_stock))
                    new_stock = qty_before - item.quantity
                    if new_stock < 0:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Estoque insuficiente para produto {product.name}. Disponível: {qty_before}",
                        )
                    product.current_stock = new_stock
                    movement = StockMovement(
                        company_id=current_user.company_id,
                        product_id=item.product_id,
                        order_id=order.id,
                        user_id=current_user.id,
                        type="saida",
                        quantity=item.quantity,
                        quantity_before=qty_before,
                        quantity_after=new_stock,
                        reason=f"Venda - Pedido {order.order_number}",
                        reference=order.order_number,
                    )
                    db.add(movement)

        elif payload.status == OrderStatus.cancelado:
            order.cancelled_at = datetime.utcnow()
            order.cancel_reason = payload.cancel_reason

    if payload.notes is not None:
        order.notes = payload.notes
    if payload.payment_method is not None:
        order.payment_method = payload.payment_method

    await db.commit()
    await db.refresh(order)

    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.client),
            selectinload(Order.user),
        )
        .where(Order.id == order.id)
    )
    order = result.scalar_one()
    return _serialize_order(order)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Order).where(Order.id == order_id)
    if current_user.company_id:
        query = query.where(Order.company_id == current_user.company_id)
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if order.status == OrderStatus.entregue:
        raise HTTPException(status_code=400, detail="Não é possível excluir pedido já entregue")
    await db.delete(order)
    await db.commit()


def _serialize_order(order: Order, client_name: str = None, user_name: str = None) -> OrderResponse:
    items = []
    for item in order.items:
        item_data = OrderItemResponse(
            id=item.id,
            order_id=item.order_id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            total=item.total,
            notes=item.notes,
            product_name=item.product.name if item.product else None,
            product_sku=item.product.sku if item.product else None,
        )
        items.append(item_data)

    return OrderResponse(
        id=order.id,
        company_id=order.company_id,
        client_id=order.client_id,
        user_id=order.user_id,
        order_number=order.order_number,
        status=order.status,
        payment_method=order.payment_method,
        subtotal=order.subtotal,
        discount=order.discount,
        total=order.total,
        notes=order.notes,
        delivered_at=order.delivered_at,
        cancelled_at=order.cancelled_at,
        cancel_reason=order.cancel_reason,
        client_name=client_name or (order.client.name if order.client else None),
        user_name=user_name or (order.user.name if order.user else None),
        items=items,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )
