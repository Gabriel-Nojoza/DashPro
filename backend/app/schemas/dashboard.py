from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import date


class KPIResponse(BaseModel):
    total_clients: int
    total_clients_active: int
    sales_this_month: Decimal
    sales_last_month: Decimal
    sales_growth_pct: float
    open_orders: int
    delivered_orders_month: int
    low_stock_products: int
    total_products: int


class TopProduct(BaseModel):
    product_id: str
    product_name: str
    total_quantity: Decimal
    total_revenue: Decimal


class TopClient(BaseModel):
    client_id: str
    client_name: str
    total_orders: int
    total_revenue: Decimal


class SalesByDay(BaseModel):
    date: str
    total: Decimal
    orders_count: int


class StockByCategory(BaseModel):
    category: str
    total_items: int
    total_value: Decimal


class DashboardResponse(BaseModel):
    kpis: KPIResponse
    sales_by_day: List[SalesByDay]
    top_products: List[TopProduct]
    top_clients: List[TopClient]
    stock_by_category: List[StockByCategory]


class SuperAdminDashboard(BaseModel):
    total_companies: int
    active_companies: int
    trial_companies: int
    total_users: int
    total_revenue_month: Decimal
    companies_by_plan: List[dict]
    recent_signups: List[dict]
    revenue_by_month: List[dict]
