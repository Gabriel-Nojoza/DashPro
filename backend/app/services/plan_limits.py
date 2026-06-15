from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession


async def _get_plan_limits(company_id: UUID, db: AsyncSession) -> dict:
    from app.models.company import Company
    from app.models.plan import Plan

    company = (await db.execute(select(Company).where(Company.id == company_id))).scalar_one_or_none()
    if not company:
        return {"max_users": 999999, "max_clients": 999999, "max_products": 999999}

    plan = (await db.execute(select(Plan).where(Plan.slug == company.plan))).scalar_one_or_none()
    if not plan:
        return {"max_users": 999999, "max_clients": 999999, "max_products": 999999}

    return {
        "max_users": plan.max_users or 999999,
        "max_clients": plan.max_clients or 999999,
        "max_products": plan.max_products or 999999,
    }


async def check_client_limit(company_id: UUID, db: AsyncSession) -> None:
    from app.models.client import Client

    limits = await _get_plan_limits(company_id, db)
    count = (await db.execute(
        select(func.count()).select_from(Client).where(Client.company_id == company_id)
    )).scalar()
    if count >= limits["max_clients"]:
        raise HTTPException(status_code=402, detail=f"Limite de clientes atingido ({limits['max_clients']})")


async def check_product_limit(company_id: UUID, db: AsyncSession) -> None:
    from app.models.product import Product

    limits = await _get_plan_limits(company_id, db)
    count = (await db.execute(
        select(func.count()).select_from(Product).where(Product.company_id == company_id)
    )).scalar()
    if count >= limits["max_products"]:
        raise HTTPException(status_code=402, detail=f"Limite de produtos atingido ({limits['max_products']})")


async def check_user_limit(company_id: UUID, db: AsyncSession) -> None:
    from app.models.user import User

    limits = await _get_plan_limits(company_id, db)
    count = (await db.execute(
        select(func.count()).select_from(User).where(User.company_id == company_id)
    )).scalar()
    if count >= limits["max_users"]:
        raise HTTPException(status_code=402, detail=f"Limite de usuários atingido ({limits['max_users']})")
