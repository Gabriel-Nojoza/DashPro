import { useEffect, useState } from 'react'
import { dashboardAPI } from '@/api'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/layout/Layout'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Users, ShoppingCart, TrendingUp, AlertTriangle,
  Package, ArrowUpRight, ArrowDownRight,
  Building2, UserCheck, Clock, CheckCircle,
} from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const COLORS = ['#FF6A00', '#0B3A75', '#071B3A', '#E83A00', '#0E4A94', '#10B981']

const PLAN_LABELS = {
  trial: 'Trial',
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

const STATUS_STYLES = {
  active:    'bg-emerald-100 text-emerald-700',
  trial:     'bg-orange-100 text-orange-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS = {
  active:    'Ativo',
  trial:     'Trial',
  suspended: 'Suspenso',
  cancelled: 'Cancelado',
}

function KpiCard({ title, value, sub, icon: Icon, trend, color = 'orange' }) {
  const colors = {
    orange: 'bg-brand-orange',
    blue:   'bg-navy-800',
    navy:   'bg-navy-900',
    red:    'bg-red-500',
    green:  'bg-emerald-500',
  }
  return (
    <div className="card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-navy-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 ${colors[color]} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend).toFixed(1)}% vs mês anterior
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name}>{p.name === 'total' ? fmt(p.value) : p.value}</p>
      ))}
    </div>
  )
}

// ─── Super Admin Dashboard ────────────────────────────────────────────────────

function SuperAdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => { setLoading(false); setError(true) }, 10000)
    dashboardAPI.getSuperAdmin()
      .then((r) => setData(r.data))
      .catch(() => setError(true))
      .finally(() => { setLoading(false); clearTimeout(timeout) })
    return () => clearTimeout(timeout)
  }, [])

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-gray-100" />
          ))}
        </div>
        <p className="text-xs text-center text-text-muted mt-4">Carregando dados...</p>
      </Layout>
    )
  }

  if (error && !data) {
    return (
      <Layout title="Dashboard">
        <div className="card text-center py-16">
          <p className="text-text-muted text-sm mb-3">Não foi possível carregar o dashboard.</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">
            Tentar novamente
          </button>
        </div>
      </Layout>
    )
  }

  const planChartData = (data?.companies_by_plan || []).map((p) => ({
    name: PLAN_LABELS[p.plan] || p.plan,
    value: p.count,
  }))

  const suspendedCompanies =
    (data?.total_companies || 0) - (data?.active_companies || 0) - (data?.trial_companies || 0)

  return (
    <Layout title="Dashboard">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          title="Total de Empresas"
          value={data?.total_companies || 0}
          sub="cadastradas na plataforma"
          icon={Building2}
          color="blue"
        />
        <KpiCard
          title="Empresas Ativas"
          value={data?.active_companies || 0}
          sub={`${data?.trial_companies || 0} em trial`}
          icon={CheckCircle}
          color="green"
        />
        <KpiCard
          title="Em Trial"
          value={data?.trial_companies || 0}
          sub={suspendedCompanies > 0 ? `${suspendedCompanies} suspensa(s)` : 'nenhuma suspensa'}
          icon={Clock}
          color="orange"
        />
        <KpiCard
          title="Total de Usuários"
          value={data?.total_users || 0}
          sub="em todas as empresas"
          icon={Users}
          color="navy"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Empresas por plano */}
        <div className="card">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Empresas por Plano</h3>
          {planChartData.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-16">Nenhum dado disponível</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={planChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {planChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} empresa${v !== 1 ? 's' : ''}`]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cadastros recentes */}
        <div className="card xl:col-span-2">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Cadastros Recentes</h3>
          {(!data?.recent_signups || data.recent_signups.length === 0) ? (
            <p className="text-sm text-text-muted text-center py-8">Nenhuma empresa cadastrada ainda</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-gray-100">
                    <th className="text-left pb-3 font-semibold">Empresa</th>
                    <th className="text-left pb-3 font-semibold">Plano</th>
                    <th className="text-left pb-3 font-semibold">Status</th>
                    <th className="text-right pb-3 font-semibold">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recent_signups.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-medium text-navy-900">{c.name}</td>
                      <td className="py-3 text-text-muted">{PLAN_LABELS[c.plan] || c.plan}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </td>
                      <td className="py-3 text-right text-text-muted">
                        {c.created_at
                          ? new Date(c.created_at).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Status overview */}
      <div className="card">
        <h3 className="text-sm font-bold text-navy-900 mb-4">Visão Geral por Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Ativas',    value: data?.active_companies || 0,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Em Trial',  value: data?.trial_companies || 0,     color: 'text-orange-600',  bg: 'bg-orange-50'  },
            { label: 'Suspensas', value: Math.max(suspendedCompanies, 0), color: 'text-red-600',     bg: 'bg-red-50'     },
            { label: 'Total',     value: data?.total_companies || 0,     color: 'text-navy-900',    bg: 'bg-gray-50'    },
          ].map((item) => (
            <div key={item.label} className={`${item.bg} rounded-xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-text-muted mt-1 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}

// ─── Company Dashboard ────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isSuperAdmin } = useAuth()

  if (isSuperAdmin) return <SuperAdminDashboard />

  return <CompanyDashboard />
}

function CompanyDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => { setLoading(false); setError(true) }, 10000)
    dashboardAPI.get()
      .then((r) => setData(r.data))
      .catch(() => setError(true))
      .finally(() => { setLoading(false); clearTimeout(timeout) })
    return () => clearTimeout(timeout)
  }, [])

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-gray-100" />
          ))}
        </div>
        <p className="text-xs text-center text-text-muted mt-4">Carregando dados...</p>
      </Layout>
    )
  }

  if (error && !data) {
    return (
      <Layout title="Dashboard">
        <div className="card text-center py-16">
          <p className="text-text-muted text-sm mb-3">Não foi possível carregar o dashboard.</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">
            Tentar novamente
          </button>
        </div>
      </Layout>
    )
  }

  const kpis = data?.kpis || {}

  return (
    <Layout title="Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          title="Vendas do Mês"
          value={fmt(kpis.sales_this_month || 0)}
          sub={`Mês anterior: ${fmt(kpis.sales_last_month || 0)}`}
          icon={TrendingUp}
          trend={kpis.sales_growth_pct}
          color="orange"
        />
        <KpiCard
          title="Clientes Ativos"
          value={kpis.total_clients_active || 0}
          sub={`Total: ${kpis.total_clients || 0}`}
          icon={Users}
          color="blue"
        />
        <KpiCard
          title="Pedidos em Aberto"
          value={kpis.open_orders || 0}
          sub={`Entregues no mês: ${kpis.delivered_orders_month || 0}`}
          icon={ShoppingCart}
          color="navy"
        />
        <KpiCard
          title="Estoque Crítico"
          value={kpis.low_stock_products || 0}
          sub={`de ${kpis.total_products || 0} produtos`}
          icon={AlertTriangle}
          color={kpis.low_stock_products > 0 ? 'red' : 'green'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <div className="card xl:col-span-2">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Vendas dos Últimos 30 Dias</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.sales_by_day || []}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#4B5563' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#4B5563' }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#FF6A00" strokeWidth={2} fill="url(#colorSales)" name="total" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Estoque por Categoria</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data?.stock_by_category || []}
                dataKey="total_items"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
              >
                {(data?.stock_by_category || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} itens`]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Top Produtos Mais Vendidos</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.top_products?.slice(0, 6) || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#4B5563' }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="product_name" tick={{ fontSize: 11, fill: '#4B5563' }} width={100} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_revenue" fill="#FF6A00" radius={[0, 4, 4, 0]} name="total" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Ranking de Clientes</h3>
          <div className="space-y-3">
            {(data?.top_clients || []).slice(0, 6).map((c, i) => (
              <div key={c.client_id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? 'bg-brand-orange text-white' :
                  i === 1 ? 'bg-navy-800 text-white' :
                  i === 2 ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{c.client_name}</p>
                  <p className="text-xs text-text-muted">{c.total_orders} pedido{c.total_orders !== 1 ? 's' : ''}</p>
                </div>
                <p className="text-sm font-semibold text-brand-orange shrink-0">{fmt(c.total_revenue)}</p>
              </div>
            ))}
            {(!data?.top_clients || data.top_clients.length === 0) && (
              <p className="text-sm text-text-muted text-center py-8">Nenhuma venda registrada ainda</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
