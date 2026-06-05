import { useEffect, useState } from 'react'
import { orcamentosAPI, obrasAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, RefreshCw, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

const STATUS_LABEL = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
  em_execucao: 'Em Execução',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}
const STATUS_STYLE = {
  rascunho: 'bg-gray-100 text-gray-600',
  aprovado: 'bg-blue-100 text-blue-700',
  em_execucao: 'bg-amber-100 text-amber-700',
  concluido: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-red-100 text-red-600',
}

const UNITS = ['un', 'm²', 'm³', 'm', 'kg', 't', 'l', 'vb', 'h', 'cx', 'sc', 'bd']

// ─── Items panel ──────────────────────────────────────────────────────────────
function ItemsPanel({ orc, onUpdate, isAdmin }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ description: '', unit: 'un', quantity: '', unit_price: '', total_real: '' })
  const [saving, setSaving] = useState(false)

  const preview = (Number(form.quantity) * Number(form.unit_price)).toFixed(2)

  const handleAdd = async () => {
    if (!form.description.trim() || !form.quantity || !form.unit_price) {
      toast.error('Preencha descrição, quantidade e preço unitário')
      return
    }
    setSaving(true)
    try {
      await orcamentosAPI.addItem(orc.id, {
        description: form.description,
        unit: form.unit,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        total_real: Number(form.total_real || 0),
        order: orc.items.length,
      })
      toast.success('Item adicionado!')
      setForm({ description: '', unit: 'un', quantity: '', unit_price: '', total_real: '' })
      setAdding(false)
      onUpdate()
    } catch { toast.error('Erro ao adicionar item') }
    finally { setSaving(false) }
  }

  const handleDelete = async (item) => {
    try {
      await orcamentosAPI.deleteItem(orc.id, item.id)
      toast.success('Item removido!')
      onUpdate()
    } catch { toast.error('Erro ao remover item') }
  }

  const handleRealChange = async (item, val) => {
    try {
      await orcamentosAPI.updateItem(orc.id, item.id, { total_real: Number(val) })
      onUpdate()
    } catch {}
  }

  return (
    <div className="border-t border-gray-100 mt-3 pt-3">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-xs font-semibold text-navy-900 mb-2 hover:text-brand-orange transition-colors">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Itens do orçamento ({orc.items?.length || 0})
      </button>

      {open && (
        <div className="space-y-2">
          {/* Header */}
          {orc.items?.length > 0 && (
            <div className="grid grid-cols-12 gap-1 text-[10px] font-semibold text-text-muted uppercase px-2">
              <span className="col-span-4">Descrição</span>
              <span className="col-span-1 text-center">Un</span>
              <span className="col-span-1 text-right">Qtd</span>
              <span className="col-span-2 text-right">Preço Un</span>
              <span className="col-span-2 text-right">Previsto</span>
              <span className="col-span-2 text-right">Real</span>
            </div>
          )}

          {(orc.items || []).map(item => (
            <div key={item.id} className="grid grid-cols-12 gap-1 items-center bg-surface rounded-lg px-2 py-1.5 text-xs">
              <span className="col-span-4 truncate font-medium">{item.description}</span>
              <span className="col-span-1 text-center text-text-muted">{item.unit}</span>
              <span className="col-span-1 text-right text-text-muted">{Number(item.quantity)}</span>
              <span className="col-span-2 text-right text-text-muted">{fmt(item.unit_price)}</span>
              <span className="col-span-2 text-right font-semibold text-navy-900">{fmt(item.total_previsto)}</span>
              <div className="col-span-2 flex items-center gap-1 justify-end">
                {isAdmin ? (
                  <input
                    type="number" step="0.01" defaultValue={Number(item.total_real)}
                    onBlur={e => handleRealChange(item, e.target.value)}
                    className="w-20 text-right text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-brand-orange"
                  />
                ) : (
                  <span className={Number(item.total_real) > Number(item.total_previsto) ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                    {fmt(item.total_real)}
                  </span>
                )}
                {isAdmin && (
                  <button onClick={() => handleDelete(item)} className="p-0.5 hover:text-red-500 text-gray-400 transition-colors shrink-0">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Totals */}
          {orc.items?.length > 0 && (
            <div className="grid grid-cols-12 gap-1 px-2 pt-1 border-t border-gray-100 text-xs font-bold">
              <span className="col-span-8 text-right text-text-muted">Total:</span>
              <span className="col-span-2 text-right text-navy-900">{fmt(orc.total_previsto)}</span>
              <span className={`col-span-2 text-right ${Number(orc.total_real) > Number(orc.total_previsto) ? 'text-red-600' : 'text-emerald-600'}`}>
                {fmt(orc.total_real)}
              </span>
            </div>
          )}

          {/* Add item form */}
          {isAdmin && (
            adding ? (
              <div className="bg-blue-50 rounded-xl p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3">
                    <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Descrição do item *" className="input text-xs py-1.5 w-full" />
                  </div>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="input text-xs py-1.5">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="Qtd *" className="input text-xs py-1.5" />
                  <input type="number" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                    placeholder="Preço unit. *" className="input text-xs py-1.5" />
                </div>
                {form.quantity && form.unit_price && (
                  <p className="text-xs text-navy-900 font-semibold">Previsto: {fmt(preview)}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setAdding(false)} className="btn-secondary text-xs py-1.5 px-3">Cancelar</button>
                  <button onClick={handleAdd} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
                    {saving ? '...' : 'Adicionar'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-brand-orange hover:underline mt-1">
                <Plus size={12} /> Adicionar item
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function OrcamentoCard({ orc, onEdit, onDelete, onUpdate, isAdmin }) {
  const diff = Number(orc.total_real) - Number(orc.total_previsto)
  const overBudget = diff > 0

  return (
    <div className="card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-navy-900 truncate">{orc.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${STATUS_STYLE[orc.status]}`}>
              {STATUS_LABEL[orc.status]}
            </span>
          </div>
          <p className="text-xs text-brand-orange font-medium mt-0.5">{orc.obra_name}</p>
          {orc.description && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{orc.description}</p>}
        </div>
        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onEdit(orc)} className="p-1.5 rounded-lg hover:bg-navy-900/10 text-navy-800 transition-colors"><Pencil size={14} /></button>
            <button onClick={() => onDelete(orc)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-surface rounded-xl p-2.5 text-center">
          <p className="text-xs text-text-muted">Previsto</p>
          <p className="text-sm font-bold text-navy-900 mt-0.5">{fmt(orc.total_previsto)}</p>
        </div>
        <div className="bg-surface rounded-xl p-2.5 text-center">
          <p className="text-xs text-text-muted">Real</p>
          <p className={`text-sm font-bold mt-0.5 ${overBudget ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(orc.total_real)}</p>
        </div>
        <div className={`rounded-xl p-2.5 text-center ${overBudget ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <p className="text-xs text-text-muted">Diferença</p>
          <p className={`text-sm font-bold mt-0.5 ${overBudget ? 'text-red-600' : 'text-emerald-600'}`}>
            {overBudget ? '+' : ''}{fmt(diff)}
          </p>
        </div>
      </div>

      <ItemsPanel orc={orc} onUpdate={onUpdate} isAdmin={isAdmin} />
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────
function OrcamentoForm({ onSubmit, defaultValues, loading, obras }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: defaultValues || { status: 'rascunho' },
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Obra *</label>
        <select {...register('obra_id', { required: 'Selecione a obra' })} className="input" disabled={!!defaultValues}>
          <option value="">Selecione a obra...</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        {errors.obra_id && <p className="text-red-500 text-xs mt-1">{errors.obra_id.message}</p>}
      </div>
      <div>
        <label className="label">Nome do Orçamento *</label>
        <input {...register('name', { required: 'Obrigatório' })} className="input" placeholder="Ex: Orçamento Estrutural" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className="label">Status</label>
        <select {...register('status')} className="input">
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Descrição</label>
        <textarea {...register('description')} className="input" rows={2} placeholder="Detalhes..." />
      </div>
      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Orcamentos() {
  const { isCompanyAdmin } = useAuth()
  const [orcamentos, setOrcamentos] = useState([])
  const [obras, setObras] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [obraFilter, setObraFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editOrc, setEditOrc] = useState(null)
  const [deleteOrc, setDeleteOrc] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = { per_page: 50 }
      if (obraFilter) params.obra_id = obraFilter
      const { data } = await orcamentosAPI.list(params)
      setOrcamentos(data.items)
      setTotal(data.total)
    } catch { toast.error('Erro ao carregar orçamentos') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [obraFilter])
  useEffect(() => {
    obrasAPI.list({ per_page: 100 }).then(r => setObras(r.data.items || [])).catch(() => {})
  }, [])

  const handleSave = async (values) => {
    setSaving(true)
    try {
      if (editOrc) {
        await orcamentosAPI.update(editOrc.id, { name: values.name, status: values.status, description: values.description })
        toast.success('Orçamento atualizado!')
      } else {
        await orcamentosAPI.create(values)
        toast.success('Orçamento criado!')
      }
      setModalOpen(false)
      setEditOrc(null)
      load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await orcamentosAPI.delete(deleteOrc.id)
      toast.success('Orçamento excluído!')
      setDeleteOrc(null)
      load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao excluir') }
    finally { setDeleting(false) }
  }

  const totalPrevisto = orcamentos.reduce((s, o) => s + Number(o.total_previsto), 0)
  const totalReal = orcamentos.reduce((s, o) => s + Number(o.total_real), 0)

  return (
    <Layout title="Orçamentos">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-surface rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-navy-900">{total}</p>
          <p className="text-xs text-text-muted mt-1">Orçamentos</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-blue-700">{fmt(totalPrevisto)}</p>
          <p className="text-xs text-text-muted mt-1">Total Previsto</p>
        </div>
        <div className={`rounded-xl p-4 text-center ${totalReal > totalPrevisto ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <p className={`text-lg font-bold ${totalReal > totalPrevisto ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(totalReal)}</p>
          <p className="text-xs text-text-muted mt-1">Total Real</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <select value={obraFilter} onChange={e => setObraFilter(e.target.value)} className="input py-1.5 text-sm max-w-xs">
          <option value="">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <div className="flex gap-2 shrink-0">
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          {isCompanyAdmin && (
            <button onClick={() => { setEditOrc(null); setModalOpen(true) }} className="btn-primary">
              <Plus size={16} /> Novo Orçamento
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : orcamentos.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-text-muted text-sm">Nenhum orçamento encontrado</p>
          {isCompanyAdmin && (
            <button onClick={() => setModalOpen(true)} className="btn-primary mt-4 mx-auto">
              <Plus size={15} /> Criar primeiro orçamento
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {orcamentos.map(orc => (
            <OrcamentoCard key={orc.id} orc={orc}
              onEdit={o => { setEditOrc(o); setModalOpen(true) }}
              onDelete={setDeleteOrc} onUpdate={load} isAdmin={isCompanyAdmin}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditOrc(null) }}
        title={editOrc ? 'Editar Orçamento' : 'Novo Orçamento'}>
        <OrcamentoForm onSubmit={handleSave} defaultValues={editOrc} loading={saving} obras={obras} />
      </Modal>

      <ConfirmDialog open={!!deleteOrc} onClose={() => setDeleteOrc(null)} onConfirm={handleDelete}
        loading={deleting} title={`Excluir "${deleteOrc?.name}"?`}
        message="Todos os itens do orçamento serão excluídos." />
    </Layout>
  )
}
