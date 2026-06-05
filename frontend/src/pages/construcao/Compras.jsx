import { useEffect, useState } from 'react'
import { comprasAPI, obrasAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Trash2, RefreshCw, Truck, ChevronDown, ChevronRight, CheckCircle, Clock, ShoppingCart, Package } from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

const STATUS_LABEL = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  comprada: 'Comprada',
  recebida: 'Recebida',
  cancelada: 'Cancelada',
}
const STATUS_STYLE = {
  pendente: 'bg-amber-100 text-amber-700',
  aprovada: 'bg-blue-100 text-blue-700',
  comprada: 'bg-purple-100 text-purple-700',
  recebida: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-600',
}
const STATUS_FLOW = {
  pendente: ['aprovada', 'cancelada'],
  aprovada: ['comprada', 'cancelada'],
  comprada: ['recebida'],
  recebida: [],
  cancelada: [],
}
const UNITS = ['un', 'm²', 'm³', 'm', 'kg', 't', 'l', 'sc', 'cx', 'vb', 'h', 'bd']

// ─── Items panel ──────────────────────────────────────────────────────────────
function ItemsPanel({ req, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ description: '', unit: 'un', quantity: '', unit_price: '0' })
  const [saving, setSaving] = useState(false)
  const canEdit = ['pendente', 'aprovada'].includes(req.status)

  const preview = (Number(form.quantity) * Number(form.unit_price)).toFixed(2)

  const handleAdd = async () => {
    if (!form.description.trim() || !form.quantity) {
      toast.error('Preencha a descrição e quantidade')
      return
    }
    setSaving(true)
    try {
      await comprasAPI.addItem(req.id, {
        description: form.description,
        unit: form.unit,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price || 0),
      })
      toast.success('Item adicionado!')
      setForm({ description: '', unit: 'un', quantity: '', unit_price: '0' })
      setAdding(false)
      onUpdate()
    } catch { toast.error('Erro ao adicionar item') }
    finally { setSaving(false) }
  }

  const handleDelete = async (item) => {
    try {
      await comprasAPI.deleteItem(req.id, item.id)
      onUpdate()
    } catch { toast.error('Erro ao remover item') }
  }

  return (
    <div className="border-t border-gray-100 mt-3 pt-3">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-xs font-semibold text-navy-900 mb-2 hover:text-brand-orange transition-colors">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Materiais ({req.items?.length || 0})
      </button>

      {open && (
        <div className="space-y-1.5">
          {req.items?.length > 0 && (
            <div className="grid grid-cols-12 gap-1 text-[10px] font-semibold text-text-muted uppercase px-2 pb-1">
              <span className="col-span-5">Material</span>
              <span className="col-span-1 text-center">Un</span>
              <span className="col-span-2 text-right">Qtd</span>
              <span className="col-span-2 text-right">Preço Un</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
          )}
          {(req.items || []).map(item => (
            <div key={item.id} className="grid grid-cols-12 gap-1 items-center bg-surface rounded-lg px-2 py-1.5 text-xs">
              <span className="col-span-5 truncate font-medium">{item.description}</span>
              <span className="col-span-1 text-center text-text-muted">{item.unit}</span>
              <span className="col-span-2 text-right text-text-muted">{Number(item.quantity)}</span>
              <span className="col-span-2 text-right text-text-muted">{fmt(item.unit_price)}</span>
              <div className="col-span-2 flex items-center justify-end gap-1">
                <span className="font-semibold text-navy-900">{fmt(item.total)}</span>
                {canEdit && (
                  <button onClick={() => handleDelete(item)} className="p-0.5 hover:text-red-500 text-gray-400 shrink-0">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {req.items?.length > 0 && (
            <div className="flex justify-end px-2 pt-1 text-xs font-bold text-navy-900 border-t border-gray-100">
              Total: {fmt(req.total)}
            </div>
          )}

          {canEdit && (
            adding ? (
              <div className="bg-amber-50 rounded-xl p-3 space-y-2 mt-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3">
                    <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Material / Descrição *" className="input text-xs py-1.5 w-full" />
                  </div>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="input text-xs py-1.5">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="Qtd *" className="input text-xs py-1.5" />
                  <input type="number" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                    placeholder="Preço unit." className="input text-xs py-1.5" />
                </div>
                {form.quantity && Number(form.unit_price) > 0 && (
                  <p className="text-xs font-semibold text-navy-900">Total: {fmt(preview)}</p>
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
                <Plus size={12} /> Adicionar material
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function ReqCard({ req, onDelete, onUpdate, isAdmin }) {
  const [updating, setUpdating] = useState(false)
  const nextStatuses = STATUS_FLOW[req.status] || []

  const handleStatus = async (newStatus) => {
    setUpdating(true)
    try {
      await comprasAPI.updateStatus(req.id, { status: newStatus })
      toast.success(`Status atualizado: ${STATUS_LABEL[newStatus]}`)
      onUpdate()
    } catch { toast.error('Erro ao atualizar status') }
    finally { setUpdating(false) }
  }

  return (
    <div className="card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-navy-900 font-mono">{req.number}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${STATUS_STYLE[req.status]}`}>
              {STATUS_LABEL[req.status]}
            </span>
          </div>
          {req.obra_name && (
            <p className="text-xs text-brand-orange font-medium mt-0.5">{req.obra_name}</p>
          )}
          {req.requested_by_name && (
            <p className="text-xs text-text-muted mt-0.5">Solicitado por: {req.requested_by_name}</p>
          )}
          {req.approved_by_name && (
            <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
              <CheckCircle size={10} /> Aprovado por: {req.approved_by_name}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <p className="text-base font-bold text-navy-900">{fmt(req.total)}</p>
          <p className="text-xs text-text-muted">{new Date(req.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {req.notes && (
        <p className="text-xs text-text-muted bg-surface rounded-lg px-3 py-2 mb-3 line-clamp-2">{req.notes}</p>
      )}

      {/* Action buttons */}
      {nextStatuses.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {nextStatuses.map(s => (
            <button key={s} onClick={() => handleStatus(s)} disabled={updating}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                s === 'cancelada' ? 'bg-red-50 text-red-600 hover:bg-red-100' :
                s === 'aprovada' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' :
                s === 'comprada' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' :
                'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}>
              {updating ? '...' : `→ ${STATUS_LABEL[s]}`}
            </button>
          ))}
        </div>
      )}

      <ItemsPanel req={req} onUpdate={onUpdate} />

      {isAdmin && req.status === 'pendente' && (
        <div className="flex justify-end mt-2">
          <button onClick={() => onDelete(req)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Nova Requisição Form ──────────────────────────────────────────────────────
function NovaReqModal({ obras, onClose, onSaved }) {
  const [obra, setObra] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ description: '', unit: 'un', quantity: '', unit_price: '0' }])
  const [saving, setSaving] = useState(false)

  const addRow = () => setItems(i => [...i, { description: '', unit: 'un', quantity: '', unit_price: '0' }])
  const removeRow = (idx) => setItems(i => i.filter((_, j) => j !== idx))
  const updateRow = (idx, field, val) => setItems(i => i.map((r, j) => j === idx ? { ...r, [field]: val } : r))

  const handleSave = async () => {
    const validItems = items.filter(i => i.description.trim() && i.quantity)
    if (validItems.length === 0) { toast.error('Adicione ao menos um material'); return }
    setSaving(true)
    try {
      await comprasAPI.create({
        obra_id: obra || null,
        notes,
        items: validItems.map(i => ({
          description: i.description,
          unit: i.unit,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price || 0),
        })),
      })
      toast.success('Requisição criada!')
      onSaved()
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao criar requisição') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Obra (opcional)</label>
        <select value={obra} onChange={e => setObra(e.target.value)} className="input">
          <option value="">Sem obra específica</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Observações</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input" rows={2} placeholder="Urgência, fornecedor sugerido..." />
      </div>
      <div>
        <label className="label">Materiais *</label>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-1 text-[10px] font-semibold text-text-muted uppercase px-1">
            <span className="col-span-5">Descrição</span>
            <span className="col-span-2">Un</span>
            <span className="col-span-2">Qtd</span>
            <span className="col-span-2">Preço</span>
            <span className="col-span-1"></span>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-1 items-center">
              <input value={item.description} onChange={e => updateRow(idx, 'description', e.target.value)}
                placeholder="Material *" className="input text-xs py-1.5 col-span-5" />
              <select value={item.unit} onChange={e => updateRow(idx, 'unit', e.target.value)} className="input text-xs py-1.5 col-span-2">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="number" value={item.quantity} onChange={e => updateRow(idx, 'quantity', e.target.value)}
                placeholder="Qtd" className="input text-xs py-1.5 col-span-2" />
              <input type="number" step="0.01" value={item.unit_price} onChange={e => updateRow(idx, 'unit_price', e.target.value)}
                placeholder="R$" className="input text-xs py-1.5 col-span-2" />
              <button onClick={() => removeRow(idx)} className="col-span-1 flex justify-center text-gray-400 hover:text-red-500">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button onClick={addRow} className="flex items-center gap-1 text-xs text-brand-orange hover:underline">
            <Plus size={12} /> Adicionar linha
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Criando...' : 'Criar Requisição'}
        </button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Compras() {
  const { isCompanyAdmin } = useAuth()
  const [reqs, setReqs] = useState([])
  const [obras, setObras] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteReq, setDeleteReq] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = { per_page: 50 }
      if (statusFilter) params.status = statusFilter
      const { data } = await comprasAPI.list(params)
      setReqs(data.items)
      setTotal(data.total)
    } catch { toast.error('Erro ao carregar requisições') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])
  useEffect(() => {
    obrasAPI.list({ per_page: 100 }).then(r => setObras(r.data.items || [])).catch(() => {})
  }, [])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await comprasAPI.delete(deleteReq.id)
      toast.success('Requisição excluída!')
      setDeleteReq(null)
      load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao excluir') }
    finally { setDeleting(false) }
  }

  const counts = reqs.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})

  return (
    <Layout title="Compras & Estoque">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Pendentes', value: counts.pendente || 0, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Aprovadas', value: counts.aprovada || 0, icon: CheckCircle, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Compradas', value: counts.comprada || 0, icon: ShoppingCart, color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'Recebidas', value: counts.recebida || 0, icon: Package, color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-xl p-4 flex items-center gap-3`}>
            <item.icon size={22} className={item.color} />
            <div>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-text-muted">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!statusFilter ? 'bg-navy-900 text-white' : 'bg-surface text-text-muted hover:bg-gray-100'}`}>
            Todas
          </button>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === v ? 'bg-navy-900 text-white' : 'bg-surface text-text-muted hover:bg-gray-100'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={16} /> Nova Requisição
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : reqs.length === 0 ? (
        <div className="card text-center py-16">
          <Truck size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-text-muted text-sm">Nenhuma requisição encontrada</p>
          <button onClick={() => setModalOpen(true)} className="btn-primary mt-4 mx-auto">
            <Plus size={15} /> Criar primeira requisição
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reqs.map(req => (
            <ReqCard key={req.id} req={req} onDelete={setDeleteReq} onUpdate={load} isAdmin={isCompanyAdmin} />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Requisição de Material">
        <NovaReqModal obras={obras} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load() }} />
      </Modal>

      <ConfirmDialog open={!!deleteReq} onClose={() => setDeleteReq(null)} onConfirm={handleDelete}
        loading={deleting} title={`Excluir requisição "${deleteReq?.number}"?`}
        message="A requisição e todos os seus itens serão removidos." />
    </Layout>
  )
}
