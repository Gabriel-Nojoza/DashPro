import { useEffect, useState } from 'react'
import { financeiroAPI, obrasAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, RefreshCw, DollarSign,
  TrendingUp, TrendingDown, Wallet, CheckCircle, Clock, AlertTriangle,
} from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'

const TIPO_STYLE = { receita: 'text-emerald-600', despesa: 'text-red-600' }
const TIPO_BG = { receita: 'bg-emerald-50 border-emerald-200', despesa: 'bg-red-50 border-red-200' }

const STATUS_LABEL = { pendente: 'Pendente', pago: 'Pago', vencido: 'Vencido', cancelado: 'Cancelado' }
const STATUS_STYLE = {
  pendente: 'bg-amber-100 text-amber-700',
  pago: 'bg-emerald-100 text-emerald-700',
  vencido: 'bg-red-100 text-red-600',
  cancelado: 'bg-gray-100 text-gray-500',
}

const CATEGORIAS = {
  receita: [
    { value: 'medicao', label: 'Medição' },
    { value: 'adiantamento', label: 'Adiantamento' },
    { value: 'reajuste', label: 'Reajuste' },
    { value: 'outros', label: 'Outros' },
  ],
  despesa: [
    { value: 'material', label: 'Material' },
    { value: 'mao_de_obra', label: 'Mão de Obra' },
    { value: 'equipamento', label: 'Equipamento' },
    { value: 'subempreiteiro', label: 'Subempreiteiro' },
    { value: 'administrativo', label: 'Administrativo' },
    { value: 'imposto', label: 'Imposto/Taxa' },
    { value: 'outros', label: 'Outros' },
  ],
}

const CAT_LABEL = Object.values(CATEGORIAS).flat().reduce((acc, c) => { acc[c.value] = c.label; return acc }, {})

// ─── Form ─────────────────────────────────────────────────────────────────────
function LancamentoForm({ onSubmit, defaultValues, loading, obras }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: defaultValues || { tipo: 'despesa', status: 'pendente', categoria: 'material' },
  })
  const tipo = watch('tipo')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tipo *</label>
          <select {...register('tipo')} className="input">
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>
        <div>
          <label className="label">Categoria *</label>
          <select {...register('categoria')} className="input">
            {(CATEGORIAS[tipo] || CATEGORIAS.despesa).map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Descrição *</label>
        <input {...register('description', { required: 'Obrigatório' })} className="input" placeholder="Ex: Medição #3 - Estrutura" />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Valor (R$) *</label>
          <input {...register('value', { required: 'Obrigatório' })} type="number" step="0.01" className="input" placeholder="0,00" />
          {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value.message}</p>}
        </div>
        <div>
          <label className="label">Status</label>
          <select {...register('status')} className="input">
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Vencimento</label>
          <input {...register('due_date')} type="date" className="input" />
        </div>
        <div>
          <label className="label">Data de Pagamento</label>
          <input {...register('paid_date')} type="date" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Obra</label>
        <select {...register('obra_id')} className="input">
          <option value="">Geral (sem obra específica)</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Observações</label>
        <textarea {...register('notes')} className="input" rows={2} placeholder="Número NF, fornecedor, etc." />
      </div>
      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function LancRow({ l, onEdit, onDelete, isAdmin }) {
  const isOverdue = l.status === 'pendente' && l.due_date && new Date(l.due_date) < new Date()

  return (
    <tr className="hover:bg-surface transition-colors">
      <td className="table-cell">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${l.tipo === 'receita' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy-900 truncate">{l.description}</p>
            {l.obra_name && <p className="text-xs text-brand-orange truncate">{l.obra_name}</p>}
          </div>
        </div>
      </td>
      <td className="table-cell">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {CAT_LABEL[l.categoria] || l.categoria}
        </span>
      </td>
      <td className="table-cell">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[isOverdue ? 'vencido' : l.status]}`}>
          {isOverdue ? 'Vencido' : STATUS_LABEL[l.status]}
        </span>
      </td>
      <td className="table-cell text-xs text-text-muted">
        {fmtDate(l.due_date)}
        {isOverdue && <AlertTriangle size={11} className="inline ml-1 text-red-500" />}
      </td>
      <td className={`table-cell text-right font-bold ${TIPO_STYLE[l.tipo]}`}>
        {l.tipo === 'receita' ? '+' : '-'}{fmt(l.value)}
      </td>
      {isAdmin && (
        <td className="table-cell">
          <div className="flex items-center gap-1 justify-end">
            <button onClick={() => onEdit(l)} className="p-1.5 rounded-lg hover:bg-navy-900/10 text-navy-800 transition-colors"><Pencil size={13} /></button>
            <button onClick={() => onDelete(l)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={13} /></button>
          </div>
        </td>
      )}
    </tr>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Financeiro() {
  const { isCompanyAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [obras, setObras] = useState([])
  const [totals, setTotals] = useState({ receitas: 0, despesas: 0, saldo: 0 })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tipoFilter, setTipoFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [obraFilter, setObraFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = { per_page: 100 }
      if (tipoFilter) params.tipo = tipoFilter
      if (statusFilter) params.status = statusFilter
      if (obraFilter) params.obra_id = obraFilter
      const { data } = await financeiroAPI.list(params)
      setItems(data.items)
      setTotal(data.total)
      setTotals({ receitas: Number(data.total_receitas), despesas: Number(data.total_despesas), saldo: Number(data.saldo) })
    } catch { toast.error('Erro ao carregar financeiro') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tipoFilter, statusFilter, obraFilter])
  useEffect(() => {
    obrasAPI.list({ per_page: 100 }).then(r => setObras(r.data.items || [])).catch(() => {})
  }, [])

  const handleSave = async (values) => {
    setSaving(true)
    try {
      const payload = { ...values }
      if (!payload.obra_id) delete payload.obra_id
      if (!payload.due_date) delete payload.due_date
      if (!payload.paid_date) delete payload.paid_date
      payload.value = Number(payload.value)

      if (editItem) {
        await financeiroAPI.update(editItem.id, payload)
        toast.success('Lançamento atualizado!')
      } else {
        await financeiroAPI.create(payload)
        toast.success('Lançamento criado!')
      }
      setModalOpen(false)
      setEditItem(null)
      load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await financeiroAPI.delete(deleteItem.id)
      toast.success('Lançamento excluído!')
      setDeleteItem(null)
      load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao excluir') }
    finally { setDeleting(false) }
  }

  const pendentes = items.filter(i => i.status === 'pendente')
  const vencidos = pendentes.filter(i => i.due_date && new Date(i.due_date) < new Date())

  return (
    <Layout title="Financeiro">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
          <TrendingUp size={22} className="text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-text-muted">Receitas</p>
            <p className="text-sm font-bold text-emerald-700 truncate">{fmt(totals.receitas)}</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
          <TrendingDown size={22} className="text-red-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-text-muted">Despesas</p>
            <p className="text-sm font-bold text-red-600 truncate">{fmt(totals.despesas)}</p>
          </div>
        </div>
        <div className={`rounded-xl p-4 flex items-center gap-3 ${totals.saldo >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
          <Wallet size={22} className={totals.saldo >= 0 ? 'text-blue-600 shrink-0' : 'text-red-600 shrink-0'} />
          <div className="min-w-0">
            <p className="text-xs text-text-muted">Saldo</p>
            <p className={`text-sm font-bold truncate ${totals.saldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(totals.saldo)}</p>
          </div>
        </div>
        <div className={`rounded-xl p-4 flex items-center gap-3 ${vencidos.length > 0 ? 'bg-red-50' : 'bg-amber-50'}`}>
          {vencidos.length > 0
            ? <AlertTriangle size={22} className="text-red-500 shrink-0" />
            : <Clock size={22} className="text-amber-600 shrink-0" />}
          <div className="min-w-0">
            <p className="text-xs text-text-muted">{vencidos.length > 0 ? 'Vencidos' : 'Pendentes'}</p>
            <p className={`text-sm font-bold ${vencidos.length > 0 ? 'text-red-600' : 'text-amber-700'}`}>
              {vencidos.length > 0 ? vencidos.length : pendentes.length}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} className="input py-1.5 text-sm">
            <option value="">Receitas + Despesas</option>
            <option value="receita">Só Receitas</option>
            <option value="despesa">Só Despesas</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input py-1.5 text-sm">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={obraFilter} onChange={e => setObraFilter(e.target.value)} className="input py-1.5 text-sm">
            <option value="">Todas as obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          {isCompanyAdmin && (
            <button onClick={() => { setEditItem(null); setModalOpen(true) }} className="btn-primary">
              <Plus size={16} /> Novo Lançamento
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-3 p-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-text-muted text-sm">Nenhum lançamento encontrado</p>
            {isCompanyAdmin && (
              <button onClick={() => setModalOpen(true)} className="btn-primary mt-4 mx-auto">
                <Plus size={15} /> Primeiro lançamento
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Descrição</th>
                <th className="table-header">Categoria</th>
                <th className="table-header">Status</th>
                <th className="table-header">Vencimento</th>
                <th className="table-header text-right">Valor</th>
                {isCompanyAdmin && <th className="table-header w-20">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(l => (
                <LancRow key={l.id} l={l}
                  onEdit={i => { setEditItem(i); setModalOpen(true) }}
                  onDelete={setDeleteItem}
                  isAdmin={isCompanyAdmin}
                />
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200">
              <tr>
                <td colSpan={isCompanyAdmin ? 4 : 3} className="table-cell text-right text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Saldo dos {items.length} lançamentos filtrados
                </td>
                <td className={`table-cell text-right font-bold text-base ${totals.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {totals.saldo >= 0 ? '+' : ''}{fmt(totals.saldo)}
                </td>
                {isCompanyAdmin && <td />}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null) }}
        title={editItem ? 'Editar Lançamento' : 'Novo Lançamento'}>
        <LancamentoForm onSubmit={handleSave} defaultValues={editItem} loading={saving} obras={obras} />
      </Modal>

      <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title={`Excluir "${deleteItem?.description}"?`}
        message="O lançamento será removido permanentemente." />
    </Layout>
  )
}
