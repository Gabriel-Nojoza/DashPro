import { useState, useEffect } from 'react'
import { reportsAPI, reportConfigAPI, companiesAPI } from '@/api'
// InternalReports component removed — only Excel/CSV and Power BI integrations remain
import Layout from '@/components/layout/Layout'
import toast from 'react-hot-toast'
import {
  BarChart3, Search, Globe, Check, Lock,
  Building2, ChevronRight, KeyRound, CheckCircle2, RefreshCw,
  ExternalLink, Loader2, Plus, Trash2,
} from 'lucide-react'
// InternalReports component removed — only Excel/CSV and Power BI integrations remain
import StatusBadge from '@/components/common/StatusBadge'
import { useAuth } from '@/contexts/AuthContext'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const today = new Date().toISOString().split('T')[0]
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

function downloadBlob(response, filename) {
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  window.URL.revokeObjectURL(url)
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={copy} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-navy-900 transition-colors">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  )
}

function LockedSection({ label }) {
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <Lock size={22} className="text-gray-400" />
      </div>
      <p className="font-semibold text-navy-900">{label} não habilitado</p>
      <p className="text-sm text-text-muted mt-1">Solicite ao administrador para habilitar este recurso.</p>
    </div>
  )
}

function Toggle({ checked, onChange, saving }) {
  return (
    <button type="button" onClick={onChange} disabled={saving}
      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${saving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${checked ? 'bg-brand-orange' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  )
}

function newAccount() {
  return { id: crypto.randomUUID(), label: 'Nova Conta', tenant_id: '', client_id: '', client_secret: '' }
}

function SuperAdminReportConfig() {
  const { isSuperAdmin } = useAuth()
  const [companies, setCompanies] = useState([])
  const [search, setSearch] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [selected, setSelected] = useState(null)
  const [perms, setPerms] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isSuperAdmin) return
    setLoadingList(true)
    companiesAPI.list({ per_page: 100, search: search || undefined })
      .then(r => setCompanies(r.data.items))
      .catch(() => toast.error('Erro ao carregar empresas'))
      .finally(() => setLoadingList(false))
  }, [search, isSuperAdmin])

  const selectCompany = async (company) => {
    setSelected(company)
    setPerms(null)
    setAccounts([])
    setLoadingPerms(true)
    try {
      const { data } = await reportConfigAPI.getPermissions(company.id)
      setPerms(data)
      setAccounts(data.powerbi_accounts || [])
    } catch {
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoadingPerms(false)
    }
  }

  const togglePowerBI = async () => {
    const newVal = !perms.powerbi
    setPerms(prev => ({ ...prev, powerbi: newVal }))
    try {
      await reportConfigAPI.updatePermissions(selected.id, { ...perms, powerbi: newVal, powerbi_accounts: accounts })
      toast.success(newVal ? 'Power BI habilitado' : 'Power BI desabilitado', { duration: 1800 })
    } catch {
      setPerms(prev => ({ ...prev, powerbi: !newVal }))
      toast.error('Erro ao salvar')
    }
  }

  const saveAccounts = async () => {
    setSaving(true)
    try {
      const { data } = await reportConfigAPI.updatePermissions(selected.id, { ...perms, powerbi_accounts: accounts })
      setPerms(data)
      setAccounts(data.powerbi_accounts || accounts)
      toast.success('Contas salvas com sucesso!')
    } catch {
      toast.error('Erro ao salvar contas')
    } finally {
      setSaving(false)
    }
  }

  const addAccount = () => setAccounts(prev => [...prev, newAccount()])
  const removeAccount = (id) => setAccounts(prev => prev.filter(a => a.id !== id))
  const updateAccount = (id, field, value) =>
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))

  const planBadge = {
    conecta: 'bg-blue-100 text-blue-700',
    gestao: 'bg-brand-orange/10 text-brand-orange',
    automacao: 'bg-purple-100 text-purple-700',
    inteligencia: 'bg-navy-900 text-white',
    trial: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Left: company list */}
      <div className="lg:col-span-1">
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm font-bold text-navy-900 mb-3">Empresas Clientes</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar empresa..."
                className="input pl-8 text-sm"
              />
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[560px] overflow-y-auto">
            {loadingList ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="p-3 flex gap-3 items-center">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))
            ) : companies.length === 0 ? (
              <div className="p-6 text-center text-sm text-text-muted">Nenhuma empresa encontrada</div>
            ) : companies.map(c => (
              <button key={c.id} onClick={() => selectCompany(c)}
                className={`w-full text-left p-3 flex gap-3 items-center transition-colors ${selected?.id === c.id ? 'bg-navy-900' : 'hover:bg-surface'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${selected?.id === c.id ? 'bg-white/10 text-white' : 'bg-navy-900/5 text-navy-900'}`}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${selected?.id === c.id ? 'text-white' : 'text-navy-900'}`}>{c.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${selected?.id === c.id ? 'bg-white/20 text-white/80' : planBadge[c.plan] || 'bg-gray-100 text-gray-500'}`}>
                    {c.plan}
                  </span>
                </div>
                <ChevronRight size={14} className={selected?.id === c.id ? 'text-white/60' : 'text-gray-300'} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Power BI config */}
      <div className="lg:col-span-2 space-y-4">
        {!selected ? (
          <div className="card flex flex-col items-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4">
              <Building2 size={28} className="text-gray-300" />
            </div>
            <p className="font-semibold text-navy-900">Selecione uma empresa</p>
            <p className="text-sm text-text-muted mt-1 max-w-xs">Escolha uma empresa para configurar as contas Power BI.</p>
          </div>
        ) : loadingPerms ? (
          <div className="card space-y-4">
            {[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Header empresa + toggle */}
            <div className={`card border-2 transition-all ${perms?.powerbi ? 'border-yellow-300 bg-yellow-50/20' : 'border-gray-100'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${perms?.powerbi ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                  <Globe size={20} className={perms?.powerbi ? 'text-yellow-600' : 'text-gray-400'} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-navy-900">{selected.name}</h3>
                    {perms?.powerbi && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><CheckCircle2 size={11} /> Power BI ativo</span>}
                  </div>
                  <p className="text-sm text-text-muted mt-0.5">Integração Power BI via múltiplas contas Azure</p>
                </div>
                <Toggle checked={!!perms?.powerbi} onChange={togglePowerBI} saving={false} />
              </div>
            </div>

            {/* Contas Azure */}
            {perms?.powerbi && (
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound size={15} className="text-yellow-600" />
                    <p className="font-bold text-navy-900">Contas Azure AD</p>
                    <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">{accounts.length} conta{accounts.length !== 1 ? 's' : ''}</span>
                  </div>
                  <button onClick={addAccount} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
                    <Plus size={13} /> Adicionar conta
                  </button>
                </div>

                {accounts.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                    <p className="text-sm text-text-muted">Nenhuma conta configurada.</p>
                    <p className="text-xs text-text-muted mt-1">Clique em "Adicionar conta" para configurar uma conta Azure.</p>
                  </div>
                ) : accounts.map((acc, idx) => (
                  <div key={acc.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                        <input
                          value={acc.label}
                          onChange={e => updateAccount(acc.id, 'label', e.target.value)}
                          className="font-bold text-navy-900 bg-transparent border-none outline-none text-sm focus:bg-surface px-1 rounded"
                          placeholder="Nome da conta"
                        />
                      </div>
                      <button onClick={() => removeAccount(acc.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { field: 'tenant_id', label: 'Tenant ID (Azure AD)', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
                        { field: 'client_id', label: 'Client ID (App ID)', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
                      ].map(f => (
                        <div key={f.field}>
                          <label className="label text-xs">{f.label}</label>
                          <input value={acc[f.field] || ''} onChange={e => updateAccount(acc.id, f.field, e.target.value)}
                            placeholder={f.placeholder} className="input text-xs font-mono" autoComplete="off" />
                        </div>
                      ))}
                      <div className="sm:col-span-2">
                        <label className="label text-xs">Client Secret</label>
                        <input type="password" value={acc.client_secret || ''} onChange={e => updateAccount(acc.id, 'client_secret', e.target.value)}
                          placeholder="••••••••" className="input text-xs font-mono" autoComplete="off" />
                      </div>
                    </div>
                  </div>
                ))}

                {accounts.length > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <p className="text-xs text-text-muted">Cada conta acessa todos os workspaces disponíveis no Azure.</p>
                    <button onClick={saveAccounts} disabled={saving} className="btn-primary text-sm py-1.5 px-4">
                      {saving ? <><Loader2 size={13} className="animate-spin" /> Salvando...</> : 'Salvar contas'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Legacy components kept for reference (not used) ─────────────────────────
function _InternalReports_UNUSED({ perms }) {
  const [tab, setTab] = useState('sales')
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const tabs = [
    { id: 'sales', label: 'Vendas', icon: TrendingUp },
    { id: 'stock', label: 'Estoque', icon: Package },
    { id: 'clients', label: 'Clientes', icon: Users },
  ]

  if (!perms?.internal_reports) return <LockedSection label="Relatórios internos" />

  const load = async () => {
    setLoading(true); setData(null)
    try {
      let res
      if (tab === 'sales') res = await reportsAPI.sales({ start_date: startDate, end_date: endDate })
      else if (tab === 'stock') res = await reportsAPI.stock()
      else res = await reportsAPI.clients()
      setData(res.data)
    } catch { toast.error('Erro ao gerar relatório') }
    finally { setLoading(false) }
  }

  const exportFile = async (format) => {
    setExporting(true)
    try {
      const params = tab === 'sales' ? { start_date: startDate, end_date: endDate, format } : { format }
      let res
      if (tab === 'sales') res = await reportsAPI.exportSales(params)
      else if (tab === 'stock') res = await reportsAPI.exportStock(params)
      else res = await reportsAPI.exportClients(params)
      downloadBlob(res, `${tab}-${today}.${format === 'xlsx' ? 'xlsx' : 'csv'}`)
    } catch { toast.error('Erro ao exportar') }
    finally { setExporting(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-surface rounded-xl w-fit">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setData(null) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-white text-navy-900 shadow-card' : 'text-text-muted hover:text-navy-900'}`}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {tab === 'sales' && (
          <>
            <div><label className="label">Data Início</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" /></div>
            <div><label className="label">Data Fim</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" /></div>
          </>
        )}
        <button onClick={load} disabled={loading} className="btn-primary flex items-center gap-2">
          <Search size={15} />{loading ? 'Gerando...' : 'Gerar Relatório'}
        </button>
        {data && (
          <div className="flex gap-2">
            <button onClick={() => exportFile('csv')} disabled={exporting} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"><Download size={13} /> CSV</button>
            <button onClick={() => exportFile('xlsx')} disabled={exporting} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"><FileSpreadsheet size={13} /> Excel</button>
          </div>
        )}
      </div>

      {data && tab === 'sales' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total de Pedidos', value: data.summary.total_orders },
              { label: 'Receita Total', value: fmt(data.summary.total_revenue) },
              { label: 'Entregues', value: data.summary.delivered },
              { label: 'Cancelados', value: data.summary.cancelled },
            ].map(s => (
              <div key={s.label} className="bg-surface rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-navy-900">{s.value}</p>
                <p className="text-xs text-text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100"><tr>
                <th className="table-header">Pedido</th><th className="table-header">Cliente</th>
                <th className="table-header">Data</th><th className="table-header">Status</th>
                <th className="table-header">Pagamento</th><th className="table-header">Total</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {data.orders.map(o => (
                  <tr key={o.id} className="hover:bg-surface">
                    <td className="table-cell font-mono text-xs font-semibold">{o.order_number}</td>
                    <td className="table-cell">{o.client_name}</td>
                    <td className="table-cell text-xs text-text-muted">{o.created_at ? new Date(o.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="table-cell"><StatusBadge status={o.status} /></td>
                    <td className="table-cell text-xs capitalize">{o.payment_method?.replace(/_/g, ' ') || '—'}</td>
                    <td className="table-cell font-semibold text-brand-orange">{fmt(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && tab === 'stock' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface rounded-xl p-4 text-center"><p className="text-2xl font-bold text-navy-900">{data.summary.total_products}</p><p className="text-xs text-text-muted">Total de Produtos</p></div>
            <div className="bg-surface rounded-xl p-4 text-center"><p className="text-2xl font-bold text-amber-600">{data.summary.low_stock_count}</p><p className="text-xs text-text-muted">Estoque Baixo</p></div>
            <div className="bg-surface rounded-xl p-4 text-center"><p className="text-2xl font-bold text-brand-orange">{fmt(data.summary.total_stock_value)}</p><p className="text-xs text-text-muted">Valor em Estoque</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100"><tr>
                <th className="table-header">Produto</th><th className="table-header">SKU</th><th className="table-header">Categoria</th>
                <th className="table-header">Estoque</th><th className="table-header">Mínimo</th><th className="table-header">Valor Total</th><th className="table-header">Situação</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {data.products.map(p => (
                  <tr key={p.id} className="hover:bg-surface">
                    <td className="table-cell font-medium">{p.name}</td>
                    <td className="table-cell font-mono text-xs text-text-muted">{p.sku || '—'}</td>
                    <td className="table-cell">{p.category || '—'}</td>
                    <td className="table-cell font-semibold">{Number(p.current_stock).toLocaleString('pt-BR')} {p.unit}</td>
                    <td className="table-cell text-text-muted">{p.min_stock}</td>
                    <td className="table-cell font-semibold">{fmt(p.stock_value)}</td>
                    <td className="table-cell">{p.is_low_stock ? <span className="badge-aberto">⚠ Baixo</span> : <span className="badge-ativo">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && tab === 'clients' && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100"><tr>
              <th className="table-header">Cliente</th><th className="table-header">Telefone</th><th className="table-header">Email</th>
              <th className="table-header">Status</th><th className="table-header">Pedidos</th><th className="table-header">Receita</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {data.clients.map(c => (
                <tr key={c.id} className="hover:bg-surface">
                  <td className="table-cell font-medium">{c.name}</td>
                  <td className="table-cell text-text-muted">{c.phone || '—'}</td>
                  <td className="table-cell text-text-muted">{c.email || '—'}</td>
                  <td className="table-cell"><StatusBadge status={c.status} /></td>
                  <td className="table-cell font-semibold">{c.total_orders}</td>
                  <td className="table-cell font-semibold text-brand-orange">{fmt(c.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!data && !loading && (
        <div className="flex flex-col items-center py-14 text-center">
          <BarChart3 size={40} className="text-gray-200 mb-3" />
          <p className="font-semibold text-navy-900">Selecione os filtros e clique em Gerar Relatório</p>
          <p className="text-sm text-text-muted mt-1">Os dados serão exibidos aqui</p>
        </div>
      )}
    </div>
  )
}

function _ReportBuilder_UNUSED({ perms }) {
  const [sources, setSources] = useState(null)
  const [source, setSource] = useState('orders')
  const [selectedCols, setSelectedCols] = useState([])
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!perms?.excel_export) return
    reportsAPI.builderSources().then(r => {
      setSources(r.data)
      setSelectedCols(Object.keys(r.data['orders'].columns))
    }).catch(() => {})
  }, [perms])

  useEffect(() => {
    if (sources?.[source]) { setSelectedCols(Object.keys(sources[source].columns)); setPreview(null) }
  }, [source, sources])

  const toggleCol = (col) => setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])

  const buildPayload = () => ({
    source, columns: selectedCols,
    ...(sources?.[source]?.has_date_filter ? { start_date: startDate, end_date: endDate } : {}),
  })

  const generate = async () => {
    if (!selectedCols.length) { toast.error('Selecione ao menos uma coluna'); return }
    setLoading(true)
    try { const { data } = await reportsAPI.builder(buildPayload(), 'json'); setPreview(data) }
    catch { toast.error('Erro ao gerar relatório') }
    finally { setLoading(false) }
  }

  const exportFile = async (format) => {
    if (!selectedCols.length) { toast.error('Selecione ao menos uma coluna'); return }
    setExporting(true)
    try { const res = await reportsAPI.builder(buildPayload(), format); downloadBlob(res, `relatorio-${source}.${format}`) }
    catch { toast.error('Erro ao exportar') }
    finally { setExporting(false) }
  }

  if (!perms?.excel_export) return <LockedSection label="Exportação de Dados" />
  if (!sources) return <div className="py-10 text-center text-text-muted text-sm">Carregando...</div>

  const availableCols = sources[source]?.columns || {}

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-5">
        <div>
          <label className="label">Fonte de Dados</label>
          <select value={source} onChange={e => setSource(e.target.value)} className="input">
            {Object.entries(sources).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
        {sources[source]?.has_date_filter && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Data Início</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" /></div>
            <div><label className="label">Data Fim</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" /></div>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Colunas</label>
            <button onClick={() => setSelectedCols(Object.keys(availableCols))} className="text-xs text-brand-orange hover:underline">Todas</button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {Object.entries(availableCols).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={selectedCols.includes(key)} onChange={() => toggleCol(key)} className="w-4 h-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange" />
                <span className="text-sm text-navy-900 group-hover:text-brand-orange transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
          <button onClick={generate} disabled={loading} className="btn-primary flex items-center justify-center gap-2">
            <Search size={15} />{loading ? 'Gerando...' : 'Pré-visualizar'}
          </button>
          <div className="flex gap-2">
            <button onClick={() => exportFile('csv')} disabled={exporting} className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm"><Download size={14} /> CSV</button>
            <button onClick={() => exportFile('xlsx')} disabled={exporting} className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm"><FileSpreadsheet size={14} /> Excel</button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        {preview ? (
          <div>
            <p className="text-sm font-semibold text-navy-900 mb-3">{preview.total} registros</p>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-surface border-b border-gray-100">
                  <tr>{preview.columns?.map(col => <th key={col} className="table-header whitespace-nowrap">{col}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.data.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-surface">
                      {preview.columns?.map(col => <td key={col} className="table-cell whitespace-nowrap">{String(row[col] ?? '—')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.total > 50 && <p className="text-center text-xs text-text-muted py-3 border-t border-gray-100">Mostrando 50 de {preview.total}. Exporte para ver todos.</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200">
            <Sliders size={32} className="text-gray-300 mb-3" />
            <p className="text-sm font-medium text-navy-900">Configure e clique em Pré-visualizar</p>
            <p className="text-xs text-text-muted mt-1">Você pode exportar sem visualizar primeiro</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section 3: Power BI Reports List ────────────────────────────────────────
function PowerBIReports({ perms }) {
  const [reports, setReports] = useState([])
  const [workspaces, setWorkspaces] = useState([])
  const [selectedWs, setSelectedWs] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)

  const load = async (silent = false) => {
    if (silent) setSyncing(true); else setLoading(true)
    setError(null)
    try {
      const [reportsRes, wsRes] = await Promise.all([
        reportsAPI.powerbiReports(),
        reportsAPI.powerbiWorkspaces(),
      ])
      setReports(reportsRes.data.reports || [])
      setWorkspaces(wsRes.data.workspaces || [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Erro ao conectar ao Power BI')
    } finally {
      if (silent) setSyncing(false); else setLoading(false)
    }
  }

  useEffect(() => { if (perms?.powerbi) load() }, [perms?.powerbi])

  if (!perms?.powerbi) return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-yellow-50 flex items-center justify-center mb-4">
        <BarChart3 size={28} className="text-yellow-500" />
      </div>
      <p className="font-bold text-navy-900 text-lg">Power BI não configurado</p>
      <p className="text-sm text-text-muted mt-2 max-w-sm">
        Esta funcionalidade ainda não foi ativada para sua empresa. Entre em contato com o administrador do sistema para habilitar a integração com Power BI.
      </p>
    </div>
  )

  const filtered = reports.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase())
    const matchWs = selectedWs === 'all' || r.workspace_id === selectedWs
    return matchSearch && matchWs
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar relatórios..."
            className="input pl-9 text-sm"
          />
        </div>
        <select
          value={selectedWs}
          onChange={e => setSelectedWs(e.target.value)}
          className="input text-sm w-auto min-w-[180px]"
        >
          <option value="all">Todos os Workspaces</option>
          {workspaces.map(ws => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </select>
        <button
          onClick={() => load(true)}
          disabled={syncing}
          className="btn-secondary flex items-center gap-2 shrink-0"
        >
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sincronizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <strong>Erro ao conectar:</strong> {error}
          <p className="text-xs mt-1 text-red-500">Verifique as credenciais em Configurações → Relatórios.</p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface border-b border-gray-100">
              <tr>
                <th className="table-header">Nome</th>
                <th className="table-header">Workspace</th>
                <th className="table-header">Status</th>
                <th className="table-header w-20">Abrir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="table-cell text-center text-text-muted py-12">
                    {error ? 'Não foi possível carregar os relatórios.' : reports.length === 0 ? 'Nenhum relatório encontrado no workspace.' : 'Nenhum resultado para a busca.'}
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-surface transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={15} className="text-yellow-500 shrink-0" />
                      <span className="font-medium text-navy-900">{r.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-text-muted text-sm">
                    {workspaces.find(w => w.id === r.workspace_id)?.name || r.workspace_id}
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={11} /> Ativo
                    </span>
                  </td>
                  <td className="table-cell">
                    {r.web_url && (
                      <a href={r.web_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-brand-orange hover:underline font-semibold">
                        <ExternalLink size={13} /> Abrir
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-surface/50">
              <p className="text-xs text-text-muted">{filtered.length} relatório{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function _ExternalIntegrations_UNUSED({ perms }) {
  const apiUrl = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:8000'
  const token = localStorage.getItem('token') || ''
  const [exporting, setExporting] = useState('')

  const quickExport = async (type, format) => {
    setExporting(`${type}-${format}`)
    try {
      const params = { format }
      let res
      if (type === 'sales') { params.start_date = firstOfMonth; params.end_date = today; res = await reportsAPI.exportSales(params) }
      else if (type === 'stock') res = await reportsAPI.exportStock(params)
      else res = await reportsAPI.exportClients(params)
      downloadBlob(res, `${type}-${today}.${format}`)
    } catch { toast.error('Erro ao exportar') }
    finally { setExporting('') }
  }

  const endpoints = [
    { label: 'Vendas', path: '/reports/sales' },
    { label: 'Estoque', path: '/reports/stock' },
    { label: 'Clientes', path: '/reports/clients' },
  ]

  if (!perms?.powerbi && !perms?.excel_export) return <LockedSection label="Integrações externas" />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Power BI */}
      <div className="card border border-gray-100 shadow-none">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
            <BarChart3 size={20} className="text-yellow-600" />
          </div>
          <div>
            <h3 className="font-bold text-navy-900">Power BI</h3>
            <p className="text-xs text-text-muted">Conecte via API REST</p>
          </div>
          {perms?.powerbi
            ? <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><CheckCircle2 size={11} /> Ativo</span>
            : <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Não habilitado</span>}
        </div>

        {!perms?.powerbi ? (
          <p className="text-sm text-text-muted">Integração Power BI não habilitada. Solicite ao administrador.</p>
        ) : (
          <>
            {perms.powerbi_workspace_id && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 space-y-1.5">
                <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide mb-2">Workspace Configurado</p>
                {perms.powerbi_workspace_id && <div className="flex items-center gap-2"><span className="text-xs text-yellow-700 w-20 shrink-0">Workspace:</span><code className="text-xs flex-1 truncate">{perms.powerbi_workspace_id}</code></div>}
                {perms.powerbi_dataset_id && <div className="flex items-center gap-2"><span className="text-xs text-yellow-700 w-20 shrink-0">Dataset:</span><code className="text-xs flex-1 truncate">{perms.powerbi_dataset_id}</code></div>}
              </div>
            )}

            <div className="space-y-3 mb-5">
              <p className="text-xs font-semibold text-navy-900 uppercase tracking-wide">Como conectar no Power BI Desktop</p>
              {['Abra o Power BI Desktop → Obter Dados → Web', 'Insira a URL do endpoint desejado abaixo', 'Em "Avançado", adicione o cabeçalho: Authorization = Bearer {token}', 'Clique em OK e transforme os dados'].map((step, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-navy-800">{step}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-navy-900 uppercase tracking-wide">Endpoints de Dados</p>
              {endpoints.map(ep => (
                <div key={ep.path} className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2">
                  <span className="text-xs font-medium text-navy-900 w-16 shrink-0">{ep.label}</span>
                  <code className="text-xs text-text-muted flex-1 truncate">{apiUrl}{ep.path}</code>
                  <CopyButton text={`${apiUrl}${ep.path}`} />
                </div>
              ))}
            </div>

            <div className="bg-surface rounded-lg px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-navy-900">Bearer Token</span>
                <CopyButton text={token} />
              </div>
              <code className="text-xs text-text-muted break-all line-clamp-2">{token || 'Token não encontrado'}</code>
            </div>
          </>
        )}
      </div>

      {/* Excel export */}
      <div className="card border border-gray-100 shadow-none">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <FileSpreadsheet size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-navy-900">Exportação Rápida</h3>
            <p className="text-xs text-text-muted">Baixe relatórios em CSV ou Excel</p>
          </div>
          {perms?.excel_export
            ? <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><CheckCircle2 size={11} /> Ativo</span>
            : <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Não habilitado</span>}
        </div>

        {!perms?.excel_export ? (
          <p className="text-sm text-text-muted">Exportação não habilitada. Solicite ao administrador.</p>
        ) : (
          <div className="space-y-3">
            {[
              { type: 'sales', label: 'Relatório de Vendas', desc: 'Período atual do mês', icon: TrendingUp, color: 'text-brand-orange' },
              { type: 'stock', label: 'Relatório de Estoque', desc: 'Todos os produtos ativos', icon: Package, color: 'text-blue-500' },
              { type: 'clients', label: 'Relatório de Clientes', desc: 'Clientes com totais', icon: Users, color: 'text-purple-500' },
            ].map(r => (
              <div key={r.type} className="p-4 rounded-xl border border-gray-100 hover:border-brand-orange/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <r.icon size={16} className={r.color} />
                    <span className="text-sm font-semibold text-navy-900">{r.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => quickExport(r.type, 'csv')} disabled={!!exporting} className="btn-secondary text-xs py-1 px-2.5">{exporting === `${r.type}-csv` ? '...' : 'CSV'}</button>
                    <button onClick={() => quickExport(r.type, 'xlsx')} disabled={!!exporting} className="btn-secondary text-xs py-1 px-2.5">{exporting === `${r.type}-xlsx` ? '...' : 'Excel'}</button>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-1.5">{r.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Reports() {
  const { isSuperAdmin } = useAuth()
  const [perms, setPerms] = useState(null)

  useEffect(() => {
    if (isSuperAdmin) return
    reportConfigAPI.getMyPermissions()
      .then(r => setPerms(r.data))
      .catch(() => setPerms({ powerbi: false }))
  }, [isSuperAdmin])

  if (isSuperAdmin) {
    return (
      <Layout title="Relatórios — Configuração por Empresa">
        <SuperAdminReportConfig />
      </Layout>
    )
  }

  return (
    <Layout title="Relatórios">
      <div className="card">
        <PowerBIReports perms={perms} />
      </div>
    </Layout>
  )
}
