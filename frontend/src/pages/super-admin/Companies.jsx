import { useEffect, useState } from 'react'
import { companiesAPI, plansAPI, whatsappAPI, usersAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import StatusBadge from '@/components/common/StatusBadge'
import EmptyState from '@/components/common/EmptyState'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Building2, Pencil, Trash2, RefreshCw, Search, Zap, MessageSquare, Loader2, Users } from 'lucide-react'

const roleLabels = { company_admin: 'Gerente', supervisor: 'Supervisor', employee: 'Funcionário', super_admin: 'Super Admin' }
const roleBadge = { company_admin: 'bg-navy-800/10 text-navy-800', supervisor: 'bg-blue-100 text-blue-700', employee: 'bg-gray-100 text-gray-600' }
const roleOrder = { company_admin: 0, supervisor: 1, employee: 2, super_admin: 3 }

function CompanyUsersModal({ company, onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    usersAPI.list({ company_id: company.id, per_page: 100 })
      .then(r => setUsers((r.data.items || []).filter(u => u.role !== 'super_admin')))
      .catch(() => toast.error('Erro ao carregar usuários'))
      .finally(() => setLoading(false))
  }, [company.id])

  const grouped = users
    .slice()
    .sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9))
    .reduce((acc, u) => {
      const key = roleLabels[u.role] || u.role
      if (!acc[key]) acc[key] = []
      acc[key].push(u)
      return acc
    }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-navy-900">Equipe da Empresa</h2>
            <p className="text-xs text-text-muted mt-0.5">{company.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 text-lg leading-none">✕</button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-text-muted">
              <Loader2 size={22} className="animate-spin mr-2" /> Carregando...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-text-muted text-sm">Nenhum usuário cadastrado nesta empresa.</div>
          ) : (
            Object.entries(grouped).map(([group, members]) => (
              <div key={group}>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">{group}s</p>
                <div className="space-y-2">
                  {members.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface">
                      <div className="w-8 h-8 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy-900 truncate">{u.name}</p>
                        <p className="text-xs text-text-muted truncate">{u.email}</p>
                        {u.supervisor_name && (
                          <p className="text-xs text-blue-600 mt-0.5">Supervisor: {u.supervisor_name}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge[u.role] || 'bg-gray-100 text-gray-600'}`}>
                          {roleLabels[u.role] || u.role}
                        </span>
                        <span className={u.is_active ? 'badge-ativo text-xs' : 'badge-inativo text-xs'}>
                          {u.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const planBadge = {
  conecta:      'bg-blue-100 text-blue-700',
  gestao:       'bg-brand-orange/10 text-brand-orange',
  automacao:    'bg-purple-100 text-purple-700',
  inteligencia: 'bg-navy-900 text-white',
  trial:        'bg-amber-100 text-amber-700',
}

function CreditModal({ company, onClose, onDone }) {
  const [amount, setAmount] = useState(500)
  const [reason, setReason] = useState('Crédito adicional aprovado pelo administrador')
  const [saving, setSaving] = useState(false)
  const [usage, setUsage] = useState(null)

  useEffect(() => {
    whatsappAPI.getCompanyUsage(company.id).then(r => setUsage(r.data)).catch(() => {})
  }, [company.id])

  const price = usage?.extra_msg_price || 0.25
  const total = (amount * price).toFixed(2)

  const handleAdd = async () => {
    setSaving(true)
    try {
      await whatsappAPI.addCredits(company.id, amount, reason)
      toast.success(`${amount} créditos adicionados para ${company.name}!`)
      onDone()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao adicionar créditos')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-navy-900">Adicionar Créditos</h2>
            <p className="text-xs text-text-muted mt-0.5">{company.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {usage && (
            <div className="bg-surface rounded-xl p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Uso atual</span>
                <span className="font-bold text-navy-900">{usage.count} / {usage.total_limit} msgs ({usage.pct_used}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${usage.pct_used >= 100 ? 'bg-red-500' : usage.pct_used >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(usage.pct_used, 100)}%` }} />
              </div>
              <p className="text-xs text-text-muted mt-2">Preço do excedente: R$ {price.toFixed(2)}/msg</p>
            </div>
          )}

          <div>
            <label className="label">Quantidade de mensagens extras</label>
            <input type="number" min="1" max="50000" value={amount}
              onChange={e => setAmount(Number(e.target.value))} className="input" />
            <p className="text-xs text-brand-orange font-semibold mt-1">
              Valor a cobrar: R$ {total} ({amount} × R$ {price.toFixed(2)})
            </p>
          </div>

          <div>
            <label className="label">Motivo</label>
            <input value={reason} onChange={e => setReason(e.target.value)} className="input" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Adicionando...</> : <><Zap size={14} /> Adicionar Créditos</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Companies() {
  const [companies, setCompanies] = useState([])
  const [plans, setPlans] = useState([])
  const [usageMap, setUsageMap] = useState({})
  const [creditCompany, setCreditCompany] = useState(null)
  const [teamCompany, setTeamCompany] = useState(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCompany, setEditCompany] = useState(null)
  const [deleteCompany, setDeleteCompany] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const perPage = 15
  const { register, handleSubmit, reset } = useForm()

  const loadUsage = () => {
    whatsappAPI.getAllUsage()
      .then(r => {
        const map = {}
        ;(r.data || []).forEach(u => { map[u.company_id] = u })
        setUsageMap(map)
      })
      .catch(() => {})
  }

  useEffect(() => {
    plansAPI.list().then(r => setPlans(r.data || [])).catch(() => {})
    loadUsage()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await companiesAPI.list({ page, per_page: perPage, search: search || undefined })
      setCompanies(data.items)
      setTotal(data.total)
    } catch {
      toast.error('Erro ao carregar empresas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, search])

  const openEdit = (c) => {
    setEditCompany(c)
    reset(c)
    setModalOpen(true)
  }

  const openNew = () => {
    setEditCompany(null)
    reset({})
    setModalOpen(true)
  }

  const handleSave = async (values) => {
    setSaving(true)
    try {
      if (editCompany) {
        await companiesAPI.update(editCompany.id, values)
        toast.success('Empresa atualizada!')
      } else {
        await companiesAPI.create(values)
        toast.success('Empresa criada!')
      }
      setModalOpen(false)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await companiesAPI.delete(deleteCompany.id)
      toast.success('Empresa excluída!')
      setDeleteCompany(null)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <Layout title="Gestão de Empresas">
      <div className="card">
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar empresa..." className="input pl-9" />
          </div>
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          <button onClick={openNew} className="btn-primary"><Plus size={16} /> Nova Empresa</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Empresa</th>
                <th className="table-header">Email</th>
                <th className="table-header">Plano</th>
                <th className="table-header">Msgs este mês</th>
                <th className="table-header">Status</th>
                <th className="table-header w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              ) : companies.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={Building2} title="Nenhuma empresa" description="Crie a primeira empresa cliente" /></td></tr>
              ) : companies.map((c) => (
                <tr key={c.id} className="hover:bg-surface transition-colors">
                  <td className="table-cell">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-text-muted">{c.slug}</p>
                    </div>
                  </td>
                  <td className="table-cell text-text-muted text-sm">{c.email}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${planBadge[c.plan] || 'bg-gray-100 text-gray-600'}`}>{c.plan}</span>
                  </td>
                  <td className="table-cell">
                    {(() => {
                      const u = usageMap[c.id]
                      if (!u) return <span className="text-xs text-text-muted">—</span>
                      const pct = Math.min(u.pct_used, 100)
                      const color = u.is_over_limit ? 'bg-red-500' : u.pct_used >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      return (
                        <div className="min-w-[120px]">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={u.is_over_limit ? 'text-red-600 font-bold' : 'text-navy-900'}>{u.count}/{u.total_limit}</span>
                            <span className="text-text-muted">{u.pct_used}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                          </div>
                          {u.is_over_limit && <p className="text-[10px] text-red-500 font-semibold mt-0.5">R$ {u.extra_cost.toFixed(2)} excedente</p>}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="table-cell"><StatusBadge status={c.status} /></td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setTeamCompany(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Ver equipe"><Users size={14} /></button>
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-navy-900/10 text-navy-800 transition-colors" title="Editar"><Pencil size={14} /></button>
                      <button onClick={() => setCreditCompany(c)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors" title="Adicionar créditos"><Zap size={14} /></button>
                      <button onClick={() => setDeleteCompany(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-text-muted">{total} empresas</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Anterior</button>
              <span className="text-xs self-center">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Próximo</button>
            </div>
          </div>
        )}
      </div>

      {/* Usage cards — always show when there are companies */}
      {companies.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-bold text-navy-900 mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-brand-orange" />
            Consumo de Mensagens — {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map(c => {
              const u = usageMap[c.id]
              const pct = u ? Math.min(u.pct_used, 100) : 0
              const isOver = u?.is_over_limit || false
              const isWarn = (u?.pct_used >= 80) && !isOver
              const barColor = isOver ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'
              const borderColor = isOver ? 'border-red-300' : isWarn ? 'border-amber-300' : 'border-gray-100'

              return (
                <div key={c.id} className={`card border-2 ${borderColor} flex flex-col gap-3`}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-navy-900">{c.name}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${planBadge[c.plan] || 'bg-gray-100 text-gray-600'}`}>
                        {c.plan}
                      </span>
                    </div>
                    {isOver && (
                      <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full shrink-0">
                        Limite atingido
                      </span>
                    )}
                    {isWarn && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full shrink-0">
                        ⚠ {u.pct_used}% usado
                      </span>
                    )}
                  </div>

                  {/* Usage bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className={`font-bold ${isOver ? 'text-red-600' : 'text-navy-900'}`}>
                        {(u?.count || 0).toLocaleString('pt-BR')} msgs usadas
                      </span>
                      <span className="text-text-muted">
                        limite: {(u?.total_limit || '—').toLocaleString?.('pt-BR') ?? '—'}
                        {u?.extra_credits > 0 && <span className="text-emerald-600"> (+{u.extra_credits})</span>}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-surface rounded-xl p-2.5 text-center">
                      <p className="text-xs text-text-muted">Restante</p>
                      <p className={`text-sm font-bold mt-0.5 ${isOver ? 'text-red-600' : 'text-navy-900'}`}>
                        {u ? u.remaining.toLocaleString('pt-BR') : '—'}
                      </p>
                    </div>
                    <div className="bg-surface rounded-xl p-2.5 text-center">
                      <p className="text-xs text-text-muted">Excedente</p>
                      <p className={`text-sm font-bold mt-0.5 ${u?.extra_msgs_used > 0 ? 'text-red-600' : 'text-navy-900'}`}>
                        {u?.extra_msgs_used > 0 ? `${u.extra_msgs_used} msgs` : '—'}
                      </p>
                    </div>
                    <div className="bg-surface rounded-xl p-2.5 text-center">
                      <p className="text-xs text-text-muted">A cobrar</p>
                      <p className={`text-sm font-bold mt-0.5 ${u?.extra_cost > 0 ? 'text-red-600' : 'text-navy-900'}`}>
                        {u?.extra_cost > 0 ? fmt(u.extra_cost) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Add credits button */}
                  <button
                    onClick={() => setCreditCompany(c)}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      isOver
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-surface hover:bg-navy-900/5 text-navy-900 border border-gray-200'
                    }`}
                  >
                    <Zap size={14} />
                    {isOver ? 'Adicionar créditos urgente' : 'Adicionar créditos'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editCompany ? 'Editar Empresa' : 'Nova Empresa'}>
        <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nome *</label>
              <input {...register('name', { required: true })} className="input" placeholder="Nome da empresa" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input {...register('email', { required: true })} type="email" className="input" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input {...register('phone')} className="input" />
            </div>
            <div>
              <label className="label">CNPJ</label>
              <input {...register('cnpj')} className="input" />
            </div>
            <div>
              <label className="label">Ramo *</label>
              <select {...register('ramo')} className="input">
                <option value="comercio">Comércio</option>
                <option value="construcao">Construção Civil</option>
                <option value="servicos">Serviços</option>
              </select>
            </div>
            <div>
              <label className="label">Plano</label>
              <select {...register('plan')} className="input">
                <option value="trial">Trial (período de teste)</option>
                {plans.map(p => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} — {p.price_monthly == 0 ? 'Grátis' : `${fmt(p.price_monthly)}/mês`}
                  </option>
                ))}
              </select>
              {plans.length === 0 && (
                <p className="text-xs text-text-muted mt-1">Nenhum plano cadastrado ainda.</p>
              )}
            </div>
            {editCompany && (
              <div>
                <label className="label">Status</label>
                <select {...register('status')} className="input">
                  <option value="trial">Trial</option>
                  <option value="active">Ativo</option>
                  <option value="suspended">Suspenso</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteCompany}
        onClose={() => setDeleteCompany(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Excluir "${deleteCompany?.name}"?`}
        message="ATENÇÃO: Todos os dados da empresa serão excluídos permanentemente."
      />

      {creditCompany && (
        <CreditModal
          company={creditCompany}
          onClose={() => setCreditCompany(null)}
          onDone={() => { setCreditCompany(null); loadUsage() }}
        />
      )}

      {teamCompany && (
        <CompanyUsersModal
          company={teamCompany}
          onClose={() => setTeamCompany(null)}
        />
      )}
    </Layout>
  )
}
