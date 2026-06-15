from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional
import calendar

from app.database import get_db
from app.models.user import User
from app.models.client import Client
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from app.models.stock import StockMovement
from app.models.company import Company
from app.models.veiculo import Veiculo
from app.models.gasto_auto import GastoAuto
from app.schemas.dashboard import (
    DashboardResponse, KPIResponse, TopProduct,
    TopClient, SalesByDay, StockByCategory, SuperAdminDashboard,
)
from app.dependencies import get_current_active_user, require_super_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    company_id = current_user.company_id
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (start_of_month - timedelta(days=1)).replace(day=1)
    last_month_end = start_of_month - timedelta(seconds=1)

    def base_filter(model):
        filters = []
        if company_id:
            filters.append(model.company_id == company_id)
        return filters

    total_clients = (await db.execute(
        select(func.count(Client.id)).where(*base_filter(Client))
    )).scalar() or 0

    active_clients = (await db.execute(
        select(func.count(Client.id)).where(*base_filter(Client), Client.status == "ativo")
    )).scalar() or 0

    sales_month = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            *base_filter(Order),
            Order.status == OrderStatus.entregue,
            Order.delivered_at >= start_of_month,
        )
    )).scalar() or Decimal("0")

    sales_last_month = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            *base_filter(Order),
            Order.status == OrderStatus.entregue,
            Order.delivered_at >= last_month_start,
            Order.delivered_at <= last_month_end,
        )
    )).scalar() or Decimal("0")

    growth = 0.0
    if float(sales_last_month) > 0:
        growth = ((float(sales_month) - float(sales_last_month)) / float(sales_last_month)) * 100

    open_orders = (await db.execute(
        select(func.count(Order.id)).where(
            *base_filter(Order),
            Order.status.in_([OrderStatus.aberto, OrderStatus.andamento]),
        )
    )).scalar() or 0

    delivered_month = (await db.execute(
        select(func.count(Order.id)).where(
            *base_filter(Order),
            Order.status == OrderStatus.entregue,
            Order.delivered_at >= start_of_month,
        )
    )).scalar() or 0

    total_products = (await db.execute(
        select(func.count(Product.id)).where(*base_filter(Product), Product.is_active == True)
    )).scalar() or 0

    low_stock = (await db.execute(
        select(func.count(Product.id)).where(
            *base_filter(Product),
            Product.is_active == True,
            Product.current_stock <= Product.min_stock,
        )
    )).scalar() or 0

    kpis = KPIResponse(
        total_clients=total_clients,
        total_clients_active=active_clients,
        sales_this_month=Decimal(str(sales_month)),
        sales_last_month=Decimal(str(sales_last_month)),
        sales_growth_pct=round(growth, 2),
        open_orders=open_orders,
        delivered_orders_month=delivered_month,
        low_stock_products=low_stock,
        total_products=total_products,
    )

    # Sales by day (last 30 days)
    thirty_ago = now - timedelta(days=30)
    sales_day_result = await db.execute(
        select(
            func.date(Order.delivered_at).label("day"),
            func.sum(Order.total).label("total"),
            func.count(Order.id).label("count"),
        )
        .where(
            *base_filter(Order),
            Order.status == OrderStatus.entregue,
            Order.delivered_at >= thirty_ago,
        )
        .group_by(func.date(Order.delivered_at))
        .order_by(func.date(Order.delivered_at))
    )
    raw_sales_by_day = {
        str(r.day): {"total": Decimal(str(r.total or 0)), "count": r.count}
        for r in sales_day_result.all()
    }
    sales_by_day = []
    for offset in range(29, -1, -1):
        day = (now - timedelta(days=offset)).date()
        row = raw_sales_by_day.get(day.isoformat(), {"total": Decimal("0"), "count": 0})
        sales_by_day.append(
            SalesByDay(
                date=day.isoformat(),
                total=row["total"],
                orders_count=row["count"],
            )
        )

    # Top products
    top_products_result = await db.execute(
        select(
            Product.id,
            Product.name,
            func.sum(OrderItem.quantity).label("qty"),
            func.sum(OrderItem.total).label("revenue"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.status == OrderStatus.entregue,
            *(([Order.company_id == company_id]) if company_id else []),
        )
        .group_by(Product.id, Product.name)
        .order_by(func.sum(OrderItem.total).desc())
        .limit(10)
    )
    top_products = [
        TopProduct(
            product_id=str(r.id),
            product_name=r.name,
            total_quantity=Decimal(str(r.qty)),
            total_revenue=Decimal(str(r.revenue)),
        )
        for r in top_products_result.all()
    ]

    # Top clients
    top_clients_result = await db.execute(
        select(
            Client.id,
            Client.name,
            func.count(Order.id).label("order_count"),
            func.sum(Order.total).label("revenue"),
        )
        .join(Order, Order.client_id == Client.id)
        .where(
            Order.status == OrderStatus.entregue,
            *(([Order.company_id == company_id]) if company_id else []),
        )
        .group_by(Client.id, Client.name)
        .order_by(func.sum(Order.total).desc())
        .limit(10)
    )
    top_clients = [
        TopClient(
            client_id=str(r.id),
            client_name=r.name,
            total_orders=r.order_count,
            total_revenue=Decimal(str(r.revenue)),
        )
        for r in top_clients_result.all()
    ]

    # Stock by category
    stock_cat_result = await db.execute(
        select(
            func.coalesce(Product.category, "Sem categoria").label("cat"),
            func.count(Product.id).label("items"),
            func.sum(Product.current_stock * Product.cost_price).label("value"),
        )
        .where(*base_filter(Product), Product.is_active == True)
        .group_by(Product.category)
        .order_by(func.sum(Product.current_stock * Product.cost_price).desc())
    )
    stock_by_category = [
        StockByCategory(
            category=r.cat,
            total_items=r.items,
            total_value=Decimal(str(r.value or 0)),
        )
        for r in stock_cat_result.all()
    ]

    return DashboardResponse(
        kpis=kpis,
        sales_by_day=sales_by_day,
        top_products=top_products,
        top_clients=top_clients,
        stock_by_category=stock_by_category,
    )


@router.get("/automoveis")
async def get_automoveis_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    company_id = current_user.company_id
    today = date.today()
    first_of_month = today.replace(day=1)
    last_month_end = first_of_month - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    thirty_ago = today - timedelta(days=29)

    def _sum_gastos(tipo, date_from, date_to=None):
        q = select(func.coalesce(func.sum(GastoAuto.valor), 0)).where(
            GastoAuto.company_id == company_id,
            GastoAuto.tipo == tipo,
            GastoAuto.data >= date_from,
        )
        if date_to:
            q = q.where(GastoAuto.data <= date_to)
        return q

    # ── Estoque ──
    disponiveis = (await db.execute(
        select(func.count(Veiculo.id)).where(
            Veiculo.company_id == company_id, Veiculo.is_active == True, Veiculo.status == "disponivel"
        )
    )).scalar() or 0

    reservados = (await db.execute(
        select(func.count(Veiculo.id)).where(
            Veiculo.company_id == company_id, Veiculo.is_active == True, Veiculo.status == "reservado"
        )
    )).scalar() or 0

    total_vendidos = (await db.execute(
        select(func.count(Veiculo.id)).where(
            Veiculo.company_id == company_id, Veiculo.status == "vendido"
        )
    )).scalar() or 0

    # ── Financeiro mês atual ──
    receita_mes    = Decimal(str((await db.execute(_sum_gastos("entrada", first_of_month))).scalar() or 0))
    gastos_mes     = Decimal(str((await db.execute(_sum_gastos("saida",   first_of_month))).scalar() or 0))
    receita_ant    = Decimal(str((await db.execute(_sum_gastos("entrada", last_month_start, last_month_end))).scalar() or 0))
    gastos_ant     = Decimal(str((await db.execute(_sum_gastos("saida",   last_month_start, last_month_end))).scalar() or 0))

    saldo_mes = float(receita_mes) - float(gastos_mes)
    saldo_ant = float(receita_ant) - float(gastos_ant)

    def _growth(current, previous):
        if previous == 0:
            return None
        return round(((current - previous) / previous) * 100, 1)

    # ── Movimentações por dia (últimos 30 dias) ──
    mov_result = await db.execute(
        select(GastoAuto.data, GastoAuto.tipo, func.sum(GastoAuto.valor).label("total"))
        .where(GastoAuto.company_id == company_id, GastoAuto.data >= thirty_ago)
        .group_by(GastoAuto.data, GastoAuto.tipo)
        .order_by(GastoAuto.data)
    )
    raw_mov = {}
    for r in mov_result.all():
        key = str(r.data)
        if key not in raw_mov:
            raw_mov[key] = {"entrada": 0.0, "saida": 0.0}
        raw_mov[key][r.tipo] = float(r.total or 0)

    mov_by_day = []
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        row = raw_mov.get(d.isoformat(), {"entrada": 0.0, "saida": 0.0})
        mov_by_day.append({"date": d.strftime("%d/%m"), "entrada": row["entrada"], "saida": row["saida"]})

    # ── Gastos por categoria (mês atual) ──
    cat_result = await db.execute(
        select(GastoAuto.categoria, func.sum(GastoAuto.valor).label("total"))
        .where(GastoAuto.company_id == company_id, GastoAuto.tipo == "saida", GastoAuto.data >= first_of_month)
        .group_by(GastoAuto.categoria)
        .order_by(func.sum(GastoAuto.valor).desc())
    )
    gastos_por_categoria = [{"categoria": r.categoria, "total": float(r.total)} for r in cat_result.all()]

    # ── Últimos veículos ──
    veic_result = await db.execute(
        select(Veiculo)
        .where(Veiculo.company_id == company_id, Veiculo.is_active == True)
        .order_by(Veiculo.created_at.desc())
        .limit(6)
    )
    recent_veiculos = [
        {
            "id": str(v.id),
            "marca": v.marca,
            "modelo": v.modelo,
            "ano": f"{v.ano_fabricacao}/{v.ano_modelo}",
            "preco_venda": float(v.preco_venda),
            "status": v.status,
            "foto": (v.fotos or [None])[0],
        }
        for v in veic_result.scalars().all()
    ]

    # ── Últimas movimentações ──
    mov_rec_result = await db.execute(
        select(GastoAuto)
        .where(GastoAuto.company_id == company_id)
        .order_by(GastoAuto.created_at.desc())
        .limit(6)
    )
    recent_mov = [
        {
            "id": str(g.id),
            "tipo": g.tipo,
            "categoria": g.categoria,
            "descricao": g.descricao,
            "valor": float(g.valor),
            "data": str(g.data),
        }
        for g in mov_rec_result.scalars().all()
    ]

    return {
        "estoque": {"disponiveis": disponiveis, "reservados": reservados, "vendidos": total_vendidos},
        "financeiro": {
            "receita_mes": float(receita_mes),
            "gastos_mes": float(gastos_mes),
            "saldo_mes": saldo_mes,
            "receita_crescimento": _growth(float(receita_mes), float(receita_ant)),
            "gastos_crescimento": _growth(float(gastos_mes), float(gastos_ant)),
            "saldo_crescimento": _growth(saldo_mes, saldo_ant),
        },
        "mov_by_day": mov_by_day,
        "gastos_por_categoria": gastos_por_categoria,
        "recent_veiculos": recent_veiculos,
        "recent_mov": recent_mov,
    }


@router.get("/super-admin", response_model=SuperAdminDashboard)
async def get_super_admin_dashboard(
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_companies = (await db.execute(select(func.count(Company.id)))).scalar() or 0
    active_companies = (await db.execute(
        select(func.count(Company.id)).where(Company.status == "active")
    )).scalar() or 0
    trial_companies = (await db.execute(
        select(func.count(Company.id)).where(Company.status == "trial")
    )).scalar() or 0
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

    companies_by_plan_result = await db.execute(
        select(Company.plan, func.count(Company.id).label("count"))
        .group_by(Company.plan)
    )
    companies_by_plan = [{"plan": r.plan, "count": r.count} for r in companies_by_plan_result.all()]

    recent_signups_result = await db.execute(
        select(Company.id, Company.name, Company.plan, Company.status, Company.created_at)
        .order_by(Company.created_at.desc())
        .limit(10)
    )
    recent_signups = [
        {
            "id": str(r.id),
            "name": r.name,
            "plan": r.plan,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recent_signups_result.all()
    ]

    return SuperAdminDashboard(
        total_companies=total_companies,
        active_companies=active_companies,
        trial_companies=trial_companies,
        total_users=total_users,
        total_revenue_month=Decimal("0"),
        companies_by_plan=companies_by_plan,
        recent_signups=recent_signups,
        revenue_by_month=[],
    )
