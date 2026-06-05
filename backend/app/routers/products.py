from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
from app.dependencies import get_current_active_user, require_company_admin

router = APIRouter(prefix="/products", tags=["Produtos"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock: Optional[bool] = None,
    is_active: Optional[bool] = True,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product)
    if current_user.company_id:
        query = query.where(Product.company_id == current_user.company_id)
    if search:
        query = query.where(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.sku.ilike(f"%{search}%"),
            )
        )
    if category:
        query = query.where(Product.category == category)
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
    if low_stock:
        query = query.where(Product.current_stock <= Product.min_stock)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    query = query.order_by(Product.name).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    products = result.scalars().all()

    items = []
    for p in products:
        r = ProductResponse.model_validate(p)
        r.is_low_stock = float(p.current_stock) <= float(p.min_stock)
        items.append(r)

    return ProductListResponse(items=items, total=total, page=page, per_page=per_page)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Empresa não identificada")

    product = Product(**payload.model_dump(), company_id=current_user.company_id)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    r = ProductResponse.model_validate(product)
    r.is_low_stock = float(product.current_stock) <= float(product.min_stock)
    return r


@router.get("/categories", response_model=list[str])
async def list_categories(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product.category).distinct().where(Product.category.isnot(None))
    if current_user.company_id:
        query = query.where(Product.company_id == current_user.company_id)
    result = await db.execute(query)
    return [r[0] for r in result.all() if r[0]]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.id == product_id)
    if current_user.company_id:
        query = query.where(Product.company_id == current_user.company_id)
    result = await db.execute(query)
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    r = ProductResponse.model_validate(product)
    r.is_low_stock = float(product.current_stock) <= float(product.min_stock)
    return r


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.id == product_id)
    if current_user.company_id:
        query = query.where(Product.company_id == current_user.company_id)
    result = await db.execute(query)
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    r = ProductResponse.model_validate(product)
    r.is_low_stock = float(product.current_stock) <= float(product.min_stock)
    return r


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.id == product_id)
    if current_user.company_id:
        query = query.where(Product.company_id == current_user.company_id)
    result = await db.execute(query)
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    await db.delete(product)
    await db.commit()
