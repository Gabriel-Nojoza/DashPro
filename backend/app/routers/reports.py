import io
import httpx
import pandas as pd
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.company import Company
from app.models.order import Order, OrderStatus
from app.models.client import Client
from app.models.product import Product
from app.models.stock import StockMovement
from app.dependencies import get_current_active_user

router = APIRouter(prefix="/reports", tags=["Relatórios"])

# ─── Export helpers ───────────────────────────────────────────────────────────

def _csv_response(df: pd.DataFrame, filename: str) -> StreamingResponse:
    output = io.StringIO()
    df.to_csv(output, index=False, encoding="utf-8-sig")
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _xlsx_response(df: pd.DataFrame, filename: str) -> StreamingResponse:
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Dados")
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ─── Shared query helpers ─────────────────────────────────────────────────────

async def _fetch_sales(db, company_id, start_date, end_date):
    query = (
        select(
            Order.id, Order.order_number, Order.status, Order.total,
            Order.payment_method, Order.delivered_at, Order.created_at,
            Client.name.label("client_name"),
        )
        .join(Client, Client.id == Order.client_id)
        .where(
            Order.created_at >= datetime.combine(start_date, datetime.min.time()),
            Order.created_at <= datetime.combine(end_date, datetime.max.time()),
        )
    )
    if company_id:
        query = query.where(Order.company_id == company_id)
    result = await db.execute(query.order_by(Order.created_at.desc()))
    return [
        {
            "order_number": r.order_number,
            "client_name": r.client_name,
            "created_at": r.created_at.strftime("%d/%m/%Y %H:%M") if r.created_at else "",
            "status": r.status,
            "payment_method": (r.payment_method or "").replace("_", " ").title(),
            "total": float(r.total),
            "delivered_at": r.delivered_at.strftime("%d/%m/%Y") if r.delivered_at else "",
            "id": str(r.id),
        }
        for r in result.all()
    ]


async def _fetch_stock_products(db, company_id):
    query = select(Product).where(Product.is_active == True)
    if company_id:
        query = query.where(Product.company_id == company_id)
    result = await db.execute(query.order_by(Product.name))
    return [
        {
            "name": p.name,
            "sku": p.sku or "",
            "category": p.category or "",
            "unit": p.unit or "",
            "current_stock": float(p.current_stock),
            "min_stock": float(p.min_stock),
            "cost_price": float(p.cost_price),
            "sale_price": float(p.sale_price),
            "stock_value": float(p.current_stock * p.cost_price),
            "is_low_stock": float(p.current_stock) <= float(p.min_stock),
            "id": str(p.id),
        }
        for p in result.scalars().all()
    ]


async def _fetch_clients(db, company_id):
    query = (
        select(
            Client.id, Client.name, Client.phone, Client.email,
            Client.status, Client.responsible,
            func.count(Order.id).label("total_orders"),
            func.coalesce(func.sum(Order.total), 0).label("total_revenue"),
        )
        .outerjoin(Order, and_(Order.client_id == Client.id, Order.status == OrderStatus.entregue))
        .group_by(Client.id, Client.name, Client.phone, Client.email, Client.status, Client.responsible)
    )
    if company_id:
        query = query.where(Client.company_id == company_id)
    result = await db.execute(query.order_by(func.sum(Order.total).desc().nullslast()))
    return [
        {
            "name": r.name,
            "email": r.email or "",
            "phone": r.phone or "",
            "status": r.status,
            "responsible": r.responsible or "",
            "total_orders": r.total_orders,
            "total_revenue": float(r.total_revenue),
            "id": str(r.id),
        }
        for r in result.all()
    ]


# ─── Internal reports ─────────────────────────────────────────────────────────

@router.get("/sales")
async def sales_report(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    client_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        end_date = date.today()

    orders = await _fetch_sales(db, current_user.company_id, start_date, end_date)

    total_revenue = sum(o["total"] for o in orders if o["status"] == OrderStatus.entregue)
    return {
        "period": {"start": str(start_date), "end": str(end_date)},
        "summary": {
            "total_orders": len(orders),
            "total_revenue": round(total_revenue, 2),
            "delivered": sum(1 for o in orders if o["status"] == OrderStatus.entregue),
            "cancelled": sum(1 for o in orders if o["status"] == OrderStatus.cancelado),
            "pending": sum(1 for o in orders if o["status"] in [OrderStatus.aberto, OrderStatus.andamento]),
        },
        "orders": orders,
    }


@router.get("/stock")
async def stock_report(
    category: Optional[str] = None,
    low_stock_only: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    company_id = current_user.company_id
    query = select(Product).where(Product.is_active == True)
    if company_id:
        query = query.where(Product.company_id == company_id)
    if category:
        query = query.where(Product.category == category)
    if low_stock_only:
        query = query.where(Product.current_stock <= Product.min_stock)

    result = await db.execute(query.order_by(Product.name))
    products = result.scalars().all()

    items = [
        {
            "id": str(p.id),
            "name": p.name,
            "sku": p.sku,
            "category": p.category,
            "unit": p.unit,
            "current_stock": float(p.current_stock),
            "min_stock": float(p.min_stock),
            "cost_price": float(p.cost_price),
            "sale_price": float(p.sale_price),
            "stock_value": float(p.current_stock * p.cost_price),
            "is_low_stock": float(p.current_stock) <= float(p.min_stock),
        }
        for p in products
    ]

    return {
        "summary": {
            "total_products": len(items),
            "low_stock_count": sum(1 for i in items if i["is_low_stock"]),
            "total_stock_value": round(sum(i["stock_value"] for i in items), 2),
        },
        "products": items,
    }


@router.get("/clients")
async def clients_report(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        end_date = date.today()

    rows = await _fetch_clients(db, current_user.company_id)
    return {"clients": rows}


# ─── Export endpoints ─────────────────────────────────────────────────────────

@router.get("/sales/export")
async def export_sales(
    file_format: str = Query("csv", alias="format", pattern="^(csv|xlsx)$"),
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        end_date = date.today()

    rows = await _fetch_sales(db, current_user.company_id, start_date, end_date)
    df = pd.DataFrame(rows, columns=["order_number", "client_name", "created_at", "status", "payment_method", "total", "delivered_at"])
    df.columns = ["Pedido", "Cliente", "Data", "Status", "Pagamento", "Total (R$)", "Entregue em"]

    fname = f"vendas-{start_date}-{end_date}"
    return _xlsx_response(df, f"{fname}.xlsx") if file_format == "xlsx" else _csv_response(df, f"{fname}.csv")


@router.get("/stock/export")
async def export_stock(
    file_format: str = Query("csv", alias="format", pattern="^(csv|xlsx)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await _fetch_stock_products(db, current_user.company_id)
    df = pd.DataFrame(rows, columns=["name", "sku", "category", "unit", "current_stock", "min_stock", "cost_price", "sale_price", "stock_value"])
    df.columns = ["Produto", "SKU", "Categoria", "Unidade", "Estoque Atual", "Estoque Mínimo", "Custo (R$)", "Venda (R$)", "Valor em Estoque (R$)"]

    return _xlsx_response(df, "estoque.xlsx") if file_format == "xlsx" else _csv_response(df, "estoque.csv")


@router.get("/clients/export")
async def export_clients(
    file_format: str = Query("csv", alias="format", pattern="^(csv|xlsx)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await _fetch_clients(db, current_user.company_id)
    df = pd.DataFrame(rows, columns=["name", "email", "phone", "status", "responsible", "total_orders", "total_revenue"])
    df.columns = ["Cliente", "Email", "Telefone", "Status", "Responsável", "Total Pedidos", "Receita Total (R$)"]

    return _xlsx_response(df, "clientes.xlsx") if file_format == "xlsx" else _csv_response(df, "clientes.csv")


# ─── Report Builder ───────────────────────────────────────────────────────────

BUILDER_SOURCES = {
    "orders": {
        "label": "Pedidos",
        "has_date_filter": True,
        "columns": {
            "order_number": "Número do Pedido",
            "client_name": "Cliente",
            "created_at": "Data",
            "status": "Status",
            "payment_method": "Pagamento",
            "total": "Total (R$)",
            "delivered_at": "Entregue em",
        },
    },
    "clients": {
        "label": "Clientes",
        "has_date_filter": False,
        "columns": {
            "name": "Nome",
            "email": "Email",
            "phone": "Telefone",
            "status": "Status",
            "responsible": "Responsável",
            "total_orders": "Total de Pedidos",
            "total_revenue": "Receita Total (R$)",
        },
    },
    "products": {
        "label": "Produtos (Estoque)",
        "has_date_filter": False,
        "columns": {
            "name": "Nome",
            "sku": "SKU",
            "category": "Categoria",
            "unit": "Unidade",
            "current_stock": "Estoque Atual",
            "min_stock": "Estoque Mínimo",
            "cost_price": "Custo (R$)",
            "sale_price": "Venda (R$)",
            "stock_value": "Valor em Estoque (R$)",
        },
    },
}


class BuilderRequest(BaseModel):
    source: str
    columns: List[str]
    start_date: Optional[date] = None
    end_date: Optional[date] = None


@router.get("/builder/sources")
async def get_builder_sources(
    current_user: User = Depends(get_current_active_user),
):
    return BUILDER_SOURCES


@router.post("/builder")
async def build_report(
    payload: BuilderRequest,
    file_format: str = Query("json", alias="format", pattern="^(json|csv|xlsx)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.source not in BUILDER_SOURCES:
        raise HTTPException(status_code=400, detail="Fonte inválida. Use: orders, clients, products")

    company_id = current_user.company_id
    source_meta = BUILDER_SOURCES[payload.source]
    available_cols = list(source_meta["columns"].keys())

    if payload.source == "orders":
        sd = payload.start_date or date.today().replace(day=1)
        ed = payload.end_date or date.today()
        rows = await _fetch_sales(db, company_id, sd, ed)
    elif payload.source == "clients":
        rows = await _fetch_clients(db, company_id)
    else:
        rows = await _fetch_stock_products(db, company_id)

    if not rows:
        empty_df = pd.DataFrame(columns=payload.columns or available_cols)
        if file_format == "csv":
            return _csv_response(empty_df, f"relatorio-{payload.source}.csv")
        if file_format == "xlsx":
            return _xlsx_response(empty_df, f"relatorio-{payload.source}.xlsx")
        return {"data": [], "total": 0, "columns": payload.columns}

    df_all = pd.DataFrame(rows)
    valid_cols = [c for c in (payload.columns or available_cols) if c in df_all.columns]
    df = df_all[valid_cols] if valid_cols else df_all

    col_labels = source_meta["columns"]
    df.columns = [col_labels.get(c, c) for c in df.columns]

    fname = f"relatorio-{payload.source}"
    if file_format == "csv":
        return _csv_response(df, f"{fname}.csv")
    if file_format == "xlsx":
        return _xlsx_response(df, f"{fname}.xlsx")

    return {"data": df.to_dict(orient="records"), "total": len(df), "columns": list(df.columns)}


# ─── Power BI Integration ─────────────────────────────────────────────────────

async def _get_powerbi_token(tenant_id: str, client_id: str, client_secret: str) -> str:
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://analysis.windows.net/powerbi/api/.default",
        })
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Falha ao autenticar no Azure AD: {resp.text}")
    return resp.json()["access_token"]


async def _get_company_powerbi_accounts(company_id: UUID, db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    perms = (company.settings or {}).get("report_permissions", {})
    if not perms.get("powerbi"):
        raise HTTPException(status_code=403, detail="Integração Power BI não habilitada para esta empresa")
    accounts = perms.get("powerbi_accounts") or []
    valid = [a for a in accounts if a.get("tenant_id") and a.get("client_id") and a.get("client_secret")]
    if not valid:
        raise HTTPException(status_code=400, detail="Nenhuma conta Azure configurada. Adicione credenciais no painel do administrador.")
    return valid


async def _fetch_workspaces(token: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            "https://api.powerbi.com/v1.0/myorg/groups",
            headers={"Authorization": f"Bearer {token}"},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Erro ao buscar workspaces: {resp.text}")
    return resp.json().get("value", [])


async def _fetch_reports_for_workspace(token: str, workspace_id: str, workspace_name: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/reports",
            headers={"Authorization": f"Bearer {token}"},
        )
    if resp.status_code != 200:
        return []
    return [
        {
            "id": r.get("id"),
            "name": r.get("name"),
            "workspace_id": workspace_id,
            "workspace_name": workspace_name,
            "web_url": r.get("webUrl"),
            "embed_url": r.get("embedUrl"),
            "dataset_id": r.get("datasetId"),
            "status": "active",
        }
        for r in resp.json().get("value", [])
    ]


@router.get("/powerbi/reports")
async def list_powerbi_reports(
    workspace_id: str | None = None,
    account_id: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Sem empresa vinculada")

    import asyncio
    accounts = await _get_company_powerbi_accounts(current_user.company_id, db)

    # Filtrar por conta específica se solicitado
    if account_id:
        accounts = [a for a in accounts if a.get("id") == account_id]

    all_reports = []
    all_workspaces = []

    for account in accounts:
        try:
            token = await _get_powerbi_token(account["tenant_id"], account["client_id"], account["client_secret"])
            workspaces = await _fetch_workspaces(token)

            if workspace_id:
                workspaces = [w for w in workspaces if w["id"] == workspace_id]

            tasks = [_fetch_reports_for_workspace(token, w["id"], w["name"]) for w in workspaces]
            results = await asyncio.gather(*tasks)

            for reports in results:
                for r in reports:
                    r["account_label"] = account.get("label", "Conta")
                    r["account_id"] = account.get("id", "")
                all_reports.extend(reports)

            for w in workspaces:
                w["account_label"] = account.get("label", "Conta")
                w["account_id"] = account.get("id", "")
                all_workspaces.append(w)
        except Exception:
            continue

    all_reports.sort(key=lambda r: (r.get("account_label", ""), r["workspace_name"], r["name"]))

    return {
        "reports": all_reports,
        "total": len(all_reports),
        "workspaces": all_workspaces,
    }


@router.get("/powerbi/workspaces")
async def list_powerbi_workspaces(
    account_id: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Sem empresa vinculada")

    accounts = await _get_company_powerbi_accounts(current_user.company_id, db)
    if account_id:
        accounts = [a for a in accounts if a.get("id") == account_id]

    all_workspaces = []
    for account in accounts:
        try:
            token = await _get_powerbi_token(account["tenant_id"], account["client_id"], account["client_secret"])
            workspaces = await _fetch_workspaces(token)
            for w in workspaces:
                w["account_label"] = account.get("label", "Conta")
                w["account_id"] = account.get("id", "")
            all_workspaces.extend(workspaces)
        except Exception:
            continue

    return {"workspaces": all_workspaces}
