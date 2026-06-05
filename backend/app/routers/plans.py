from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models.plan import Plan, Subscription, Payment
from app.models.user import User
from app.schemas.plan import PlanCreate, PlanUpdate, PlanResponse, PaymentResponse
from app.dependencies import get_current_active_user, require_super_admin

router = APIRouter(prefix="/plans", tags=["Planos"])


@router.get("", response_model=list[PlanResponse])
async def list_plans(
    active_only: bool = True,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Plan)
    if active_only:
        query = query.where(Plan.is_active == True)
    result = await db.execute(query.order_by(Plan.price_monthly))
    plans = result.scalars().all()
    return [PlanResponse.model_validate(p) for p in plans]


@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    payload: PlanCreate,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = (await db.execute(select(Plan).where(Plan.slug == payload.slug))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Slug já existe")

    plan = Plan(**payload.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return PlanResponse.model_validate(plan)


@router.put("/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: UUID,
    payload: PlanUpdate,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)

    await db.commit()
    await db.refresh(plan)
    return PlanResponse.model_validate(plan)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    await db.delete(plan)
    await db.commit()


payments_router = APIRouter(prefix="/payments", tags=["Pagamentos"])


@payments_router.get("", response_model=list[PaymentResponse])
async def list_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Payment).order_by(Payment.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    payments = result.scalars().all()
    return [PaymentResponse.model_validate(p) for p in payments]


@payments_router.get("/company", response_model=list[PaymentResponse])
async def list_company_payments(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Empresa não identificada")
    query = (
        select(Payment)
        .where(Payment.company_id == current_user.company_id)
        .order_by(Payment.created_at.desc())
        .limit(50)
    )
    result = await db.execute(query)
    payments = result.scalars().all()
    return [PaymentResponse.model_validate(p) for p in payments]
