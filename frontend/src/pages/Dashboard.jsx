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
  Car, DollarSign, TrendingDown, Wallet,
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

// ─── Automoveis Dashboard ─────────────────────────────────────────────────────

const CATEGORIA_LABELS = {
  mecanico: 'Mecânico', pecas: 'Peças', pintura: 'Pintura',
  documentacao: 'Documentação', combustivel: 'Combustível',
  seguro: 'Seguro', limpeza: 'Limpeza', compra: 'Compra de Veículo',
  venda: 'Venda', servico: 'Serviço', outros: 'Outros',
}

const STATUS_VEI = {
  disponivel: { label: 'Disponível', cls: 'bg-emerald-100 text-emerald-700' },
  reservado:  { label: 'Reservado',  cls: 'bg-amber-100 text-amber-700' },
  vendido:    { label: 'Vendido',    cls: 'bg-gray-100 text-gray-500' },
}

function AutomoveisDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.getAutomoveis()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-28 animate-pulse bg-gray-100" />)}
        </div>
      </Layout>
    )
  }

  const est = data?.estoque || {}
  const fin = data?.financeiro || {}

  const saldoPositivo = fin.saldo_mes >= 0

  return (
    <Layout title="Dashboard">
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
        <KpiCard title="Disponíveis"   value={est.disponiveis ?? 0}  sub="veículos em estoque"  icon={Car}          color="green"  />
        <KpiCard title="Reservados"    value={est.reservados ?? 0}   sub="aguardando negociação" icon={Car}          color="orange" />
        <KpiCard title="Vendidos"      value={est.vendidos ?? 0}     sub="total histórico"       icon={TrendingUp}   color="navy"   />
        <KpiCard
          title="Receita do Mês"
          value={fmt(fin.receita_mes || 0)}
          sub="entradas registradas"
          icon={DollarSign}
          trend={fin.receita_crescimento}
          color="green"
        />
        <KpiCard
          title="Gastos do Mês"
          value={fmt(fin.gastos_mes || 0)}
          sub="saídas registradas"
          icon={TrendingDown}
          trend={fin.gastos_crescimento != null ? -fin.gastos_crescimento : undefined}
          color="red"
        />
        <div className={`card hover:shadow-card-hover transition-shadow border-l-4 ${saldoPositivo ? 'border-emerald-400' : 'border-red-400'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Saldo do Mês</p>
              <p className={`text-2xl font-bold mt-1 ${saldoPositivo ? 'text-emerald-600' : 'text-red-500'}`}>
                {fmt(fin.saldo_mes || 0)}
              </p>
              <p className="text-xs text-text-muted mt-1">receita − gastos</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${saldoPositivo ? 'bg-emerald-500' : 'bg-red-500'}`}>
              <Wallet size={20} className="text-white" />
            </div>
          </div>
          {fin.saldo_crescimento != null && (
            <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${fin.saldo_crescimento >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {fin.saldo_crescimento >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(fin.saldo_crescimento).toFixed(1)}% vs mês anterior
            </div>
          )}
        </div>
      </div>

      {/* ── Gráfico de movimentações + Gastos por categoria ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <div className="card xl:col-span-2">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Movimentações — Últimos 30 Dias</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.mov_by_day || []}>
              <defs>
                <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4B5563' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#4B5563' }} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v, name) => [fmt(v), name === 'entrada' ? 'Entradas' : 'Saídas']} labelFormatter={l => `Dia ${l}`} />
              <Area type="monotone" dataKey="entrada" stroke="#10B981" strokeWidth={2} fill="url(#colorEntrada)" name="entrada" />
              <Area type="monotone" dataKey="saida"   stroke="#EF4444" strokeWidth={2} fill="url(#colorSaida)"   name="saida"   />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Gastos por Categoria</h3>
          {(data?.gastos_por_categoria || []).length === 0 ? (
            <p className="text-sm text-text-muted text-center py-10">Nenhum gasto registrado</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.gastos_por_categoria}
                  dataKey="total"
                  nameKey="categoria"
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={78} paddingAngle={3}
                >
                  {data.gastos_por_categoria.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [fmt(v), CATEGORIA_LABELS[name] || name]} />
                <Legend
                  iconType="circle" iconSize={7}
                  formatter={name => CATEGORIA_LABELS[name] || name}
                  wrapperStyle={{ fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Últimos veículos + Últimas movimentações ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Últimos Veículos Cadastrados</h3>
          {(data?.recent_veiculos || []).length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Nenhum veículo cadastrado ainda</p>
          ) : (
            <div className="space-y-3">
              {data.recent_veiculos.map(v => (
                <div key={v.id} className="flex items-center gap-3">
                  {v.foto ? (
                    <img src={v.foto} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Car size={16} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{v.marca} {v.modelo}</p>
                    <p className="text-xs text-text-muted">{v.ano}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-navy-900">{fmt(v.preco_venda)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_VEI[v.status]?.cls || ''}`}>
                      {STATUS_VEI[v.status]?.label || v.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Últimas Movimentações</h3>
          {(data?.recent_mov || []).length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Nenhuma movimentação registrada ainda</p>
          ) : (
            <div className="space-y-3">
              {data.recent_mov.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.tipo === 'entrada' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {m.tipo === 'entrada'
                      ? <ArrowUpRight size={16} className="text-emerald-600" />
                      : <ArrowDownRight size={16} className="text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-900 truncate">{m.descricao}</p>
                    <p className="text-xs text-text-muted">{CATEGORIA_LABELS[m.categoria] || m.categoria} · {new Date(m.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <p className={`text-sm font-bold shrink-0 ${m.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {m.tipo === 'entrada' ? '+' : '-'}{fmt(m.valor)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

// ─── Company Dashboard ────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isSuperAdmin, isAutomoveis } = useAuth()

  if (isSuperAdmin) return <SuperAdminDashboard />
  if (isAutomoveis) return <AutomoveisDashboard />

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
