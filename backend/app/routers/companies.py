from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import Optional
from uuid import UUID
import re
import random

from app.database import get_db
from app.models.company import Company
from app.models.user import User
from app.models.order import Order, OrderItem
from app.models.stock import StockMovement
from app.models.client import Client
from app.models.product import Product
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse, CompanyListResponse, ReportPermissions
from app.auth.security import hash_password
from app.dependencies import get_current_active_user, require_super_admin, require_company_admin

router = APIRouter(prefix="/companies", tags=["Empresas"])


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:50]


async def _get_company_admin(db: AsyncSession, company_id: UUID) -> Optional[User]:
    result = await db.execute(
        select(User)
        .where(User.company_id == company_id, User.role == "company_admin")
        .order_by(User.created_at)
    )
    return result.scalars().first()


@router.get("", response_model=CompanyListResponse)
async def list_companies(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    plan: Optional[str] = None,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Company)
    if search:
        query = query.where(Company.name.ilike(f"%{search}%") | Company.email.ilike(f"%{search}%"))
    if status:
        query = query.where(Company.status == status)
    if plan:
        query = query.where(Company.plan == plan)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(Company.name).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    companies = result.scalars().all()

    return CompanyListResponse(
        items=[CompanyResponse.model_validate(c) for c in companies],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    payload: CompanyCreate,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    existing_user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email jÃ¡ cadastrado para usuÃ¡rio")

    slug = _slugify(payload.name)
    existing_slug = (await db.execute(select(Company).where(Company.slug == slug))).scalar_one_or_none()
    if existing_slug:
        slug = f"{slug}-{random.randint(1000, 9999)}"

    company = Company(
        name=payload.name,
        slug=slug,
        email=payload.email,
        phone=payload.phone,
        cnpj=payload.cnpj,
        address=payload.address,
        plan=payload.plan,
        ramo=payload.ramo,
    )
    db.add(company)
    await db.flush()

    admin_user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="company_admin",
        company_id=company.id,
    )
    db.add(admin_user)
    await db.commit()
    await db.refresh(company)
    return CompanyResponse.model_validate(company)


@router.get("/me", response_model=CompanyResponse)
async def get_my_company(
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    result = await db.execute(select(Company).where(Company.id == current_user.company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return CompanyResponse.model_validate(company)


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return CompanyResponse.model_validate(company)


@router.put("/me", response_model=CompanyResponse)
async def update_my_company(
    payload: CompanyUpdate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.id == current_user.company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    allowed = ["name", "email", "phone", "cnpj", "address", "logo_url"]
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in allowed:
            setattr(company, field, value)

    await db.commit()
    await db.refresh(company)
    return CompanyResponse.model_validate(company)


@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: UUID,
    payload: CompanyUpdate,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    data = payload.model_dump(exclude_unset=True)
    features = data.pop("features", None)
    password = data.pop("password", None)
    new_email = data.get("email")

    admin_user = await _get_company_admin(db, company_id)
    if new_email:
        existing_query = select(User).where(User.email == new_email)
        if admin_user:
            existing_query = existing_query.where(User.id != admin_user.id)
        existing_user = (await db.execute(existing_query)).scalar_one_or_none()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email jÃ¡ cadastrado para usuÃ¡rio")

    for field, value in data.items():
        setattr(company, field, value)
    if features is not None:
        current_settings = dict(company.settings or {})
        current_settings["features"] = features
        company.settings = current_settings
    if admin_user:
        if "name" in data:
            admin_user.name = data["name"]
        if new_email:
            admin_user.email = new_email
        if password:
            admin_user.hashed_password = hash_password(password)
    elif password:
        admin_user = User(
            name=company.name,
            email=company.email,
            hashed_password=hash_password(password),
            role="company_admin",
            company_id=company.id,
        )
        db.add(admin_user)

    await db.commit()
    await db.refresh(company)
    return CompanyResponse.model_validate(company)


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    # Delete in dependency order to avoid FK RESTRICT violations
    order_ids = (await db.execute(
        select(Order.id).where(Order.company_id == company_id)
    )).scalars().all()

    if order_ids:
        await db.execute(delete(OrderItem).where(OrderItem.order_id.in_(order_ids)))
        await db.execute(delete(StockMovement).where(StockMovement.order_id.in_(order_ids)))

    await db.execute(delete(StockMovement).where(StockMovement.company_id == company_id))
    await db.execute(delete(Order).where(Order.company_id == company_id))
    await db.execute(delete(Client).where(Client.company_id == company_id))
    await db.execute(delete(Product).where(Product.company_id == company_id))
    await db.execute(delete(User).where(User.company_id == company_id))
    await db.execute(delete(Company).where(Company.id == company_id))
    await db.commit()


# ─── Report Permissions ───────────────────────────────────────────────────────

_DEFAULT_REPORT_PERMS = {
    "powerbi": False,
    "powerbi_accounts": [],
}


def _get_report_perms(company: Company) -> dict:
    saved = (company.settings or {}).get("report_permissions", {})
    return {**_DEFAULT_REPORT_PERMS, **saved}


@router.get("/me/report-permissions")
async def get_my_report_permissions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        return _DEFAULT_REPORT_PERMS
    result = await db.execute(select(Company).where(Company.id == current_user.company_id))
    company = result.scalar_one_or_none()
    return _get_report_perms(company) if company else _DEFAULT_REPORT_PERMS


@router.get("/{company_id}/report-permissions")
async def get_company_report_permissions(
    company_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return _get_report_perms(company)


@router.put("/{company_id}/report-permissions")
async def update_company_report_permissions(
    company_id: UUID,
    payload: ReportPermissions,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    settings = dict(company.settings or {})
    settings["report_permissions"] = payload.model_dump()
    company.settings = settings
    await db.commit()
    await db.refresh(company)
    return _get_report_perms(company)
