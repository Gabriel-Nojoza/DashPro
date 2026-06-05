from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID
from decimal import Decimal

from app.database import get_db
from app.models.stock import StockMovement, MovementType
from app.models.product import Product
from app.models.user import User
from app.schemas.stock import MovementCreate, MovementResponse, MovementListResponse
from app.dependencies import get_current_active_user, require_company_admin

router = APIRouter(prefix="/movements", tags=["Estoque"])


@router.get("", response_model=MovementListResponse)
async def list_movements(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    product_id: Optional[UUID] = None,
    type: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(StockMovement).options(
        selectinload(StockMovement.product),
        selectinload(StockMovement.user),
    )
    if current_user.company_id:
        query = query.where(StockMovement.company_id == current_user.company_id)
    if product_id:
        query = query.where(StockMovement.product_id == product_id)
    if type:
        query = query.where(StockMovement.type == type)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    query = query.order_by(StockMovement.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    movements = result.scalars().all()

    items = []
    for m in movements:
        data = MovementResponse.model_validate(m)
        if m.product:
            data.product_name = m.product.name
        if m.user:
            data.user_name = m.user.name
        items.append(data)

    return MovementListResponse(items=items, total=total, page=page, per_page=per_page)


@router.post("", response_model=MovementResponse, status_code=status.HTTP_201_CREATED)
async def create_movement(
    payload: MovementCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Empresa não identificada")

    if payload.type not in [m.value for m in MovementType]:
        raise HTTPException(status_code=400, detail=f"Tipo inválido. Use: {[m.value for m in MovementType]}")

    result = await db.execute(
        select(Product).where(
            Product.id == payload.product_id,
            Product.company_id == current_user.company_id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    qty_before = Decimal(str(product.current_stock))

    if payload.type in ["saida", "perda"]:
        new_stock = qty_before - payload.quantity
        if new_stock < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Estoque insuficiente. Disponível: {qty_before}",
            )
    elif payload.type in ["entrada", "devolucao"]:
        new_stock = qty_before + payload.quantity
    elif payload.type == "ajuste":
        new_stock = payload.quantity
    else:
        new_stock = qty_before

    product.current_stock = new_stock

    movement = StockMovement(
        company_id=current_user.company_id,
        product_id=payload.product_id,
        user_id=current_user.id,
        type=payload.type,
        quantity=payload.quantity,
        quantity_before=qty_before,
        quantity_after=new_stock,
        unit_cost=payload.unit_cost,
        reason=payload.reason,
        reference=payload.reference,
    )
    db.add(movement)
    await db.commit()
    await db.refresh(movement)

    response = MovementResponse.model_validate(movement)
    response.product_name = product.name
    response.user_name = current_user.name
    return response
