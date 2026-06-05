import { useEffect, useState } from 'react'
import { obrasAPI, usersAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, RefreshCw, HardHat, ChevronDown,
  ChevronRight, MapPin, User, Calendar, DollarSign, CheckCircle2,
} from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'

const STATUS_LABEL = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  pausada: 'Pausada',
  cancelada: 'Cancelada',
}
const STATUS_STYLE = {
  planejamento: 'bg-blue-100 text-blue-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  concluida: 'bg-emerald-100 text-emerald-700',
  pausada: 'bg-gray-100 text-gray-600',
  cancelada: 'bg-red-100 text-red-600',
}
const ETAPA_STATUS_LABEL = { pendente: 'Pendente', em_andamento: 'Em Andamento', concluida: 'Concluída' }

function ProgressBar({ value, color = 'bg-brand-orange' }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

// ─── Etapas panel ────────────────────────────────────────────────────────────
function EtapasPanel({ obra, onUpdate, isAdmin }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAddEtapa = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await obrasAPI.createEtapa(obra.id, { name: newName.trim(), order: obra.etapas.length })
      toast.success('Etapa adicionada!')
      setNewName('')
      setAdding(false)
      onUpdate()
    } catch {
      toast.error('Erro ao adicionar etapa')
    } finally { setSaving(false) }
  }

  const handleProgress = async (etapa, progress) => {
    const status = progress === 100 ? 'concluida' : progress > 0 ? 'em_andamento' : 'pendente'
    try {
      await obrasAPI.updateEtapa(obra.id, etapa.id, { progress, status })
      onUpdate()
    } catch { toast.error('Erro ao atualizar etapa') }
  }

  const handleDelete = async (etapa) => {
    try {
      await obrasAPI.deleteEtapa(obra.id, etapa.id)
      toast.success('Etapa removida!')
      onUpdate()
    } catch { toast.error('Erro ao remover etapa') }
  }

  return (
    <div className="border-t border-gray-100 mt-3 pt-3">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-xs font-semibold text-navy-900 mb-2 hover:text-brand-orange transition-colors">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Etapas ({obra.etapas?.length || 0})
      </button>

      {open && (
        <div className="space-y-2 pl-1">
          {(obra.etapas || []).map(etapa => (
            <div key={etapa.id} className="flex items-center gap-3 bg-surface rounded-lg p-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-navy-900 truncate">{etapa.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <ProgressBar value={etapa.progress} color={etapa.status === 'concluida' ? 'bg-emerald-500' : 'bg-brand-orange'} />
                  <span className="text-xs text-text-muted shrink-0">{etapa.progress}%</span>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="range" min={0} max={100} step={5}
                    value={etapa.progress}
                    onChange={e => handleProgress(etapa, Number(e.target.value))}
                    className="w-20 accent-brand-orange"
                  />
                  <button onClick={() => handleDelete(etapa)} className="p-1 hover:text-red-500 text-gray-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {isAdmin && (
            adding ? (
              <div className="flex gap-2">
                <input
                  autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddEtapa()}
                  placeholder="Nome da etapa..." className="input text-xs py-1.5 flex-1"
                />
                <button onClick={handleAddEtapa} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
                  {saving ? '...' : 'OK'}
                </button>
                <button onClick={() => setAdding(false)} className="btn-secondary text-xs py-1.5 px-3">✕</button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-brand-orange hover:underline mt-1">
                <Plus size={12} /> Adicionar etapa
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ─── Obra Card ────────────────────────────────────────────────────────────────
function ObraCard({ obra, onEdit, onDelete, onUpdate, isAdmin }) {
  return (
    <div className="card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-navy-900 truncate">{obra.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${STATUS_STYLE[obra.status]}`}>
              {STATUS_LABEL[obra.status]}
            </span>
          </div>
          {obra.client_name && (
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
              <User size={11} /> {obra.client_name}
            </p>
          )}
          {obra.address && (
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1 truncate">
              <MapPin size={11} className="shrink-0" /> {obra.address}
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onEdit(obra)} className="p-1.5 rounded-lg hover:bg-navy-900/10 text-navy-800 transition-colors"><Pencil size={14} /></button>
            <button onClick={() => onDelete(obra)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-surface rounded-xl p-2.5">
          <p className="text-xs text-text-muted flex items-center gap-1"><DollarSign size={11} /> Contrato</p>
          <p className="text-sm font-bold text-navy-900 mt-0.5">{fmt(obra.contract_value)}</p>
        </div>
        <div className="bg-surface rounded-xl p-2.5">
          <p className="text-xs text-text-muted flex items-center gap-1"><Calendar size={11} /> Prazo</p>
          <p className="text-sm font-bold text-navy-900 mt-0.5">{fmtDate(obra.end_date)}</p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="mb-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-text-muted flex items-center gap-1"><CheckCircle2 size={11} /> Avanço geral</span>
          <span className="font-semibold text-navy-900">{obra.progress}%</span>
        </div>
        <ProgressBar value={obra.progress} color={obra.progress === 100 ? 'bg-emerald-500' : 'bg-brand-orange'} />
      </div>

      <EtapasPanel obra={obra} onUpdate={onUpdate} isAdmin={isAdmin} />
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────
function ObraForm({ onSubmit, defaultValues, loading, users }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: defaultValues || { status: 'planejamento', contract_value: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Nome da Obra *</label>
        <input {...register('name', { required: 'Obrigatório' })} className="input" placeholder="Ex: Residencial Jardins Bloco A" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Contratante / Cliente</label>
          <input {...register('client_name')} className="input" placeholder="Nome do cliente" />
        </div>
        <div>
          <label className="label">Status</label>
          <select {...register('status')} className="input">
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Endereço / Localização</label>
        <input {...register('address')} className="input" placeholder="Rua, número, cidade" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Valor do Contrato (R$)</label>
          <input {...register('contract_value')} type="number" step="0.01" className="input" placeholder="0,00" />
        </div>
        <div>
          <label className="label">Responsável</label>
          <select {...register('responsible_id')} className="input">
            <option value="">Sem responsável</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Início previsto</label>
          <input {...register('start_date')} type="date" className="input" />
        </div>
        <div>
          <label className="label">Conclusão prevista</label>
          <input {...register('end_date')} type="date" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Descrição</label>
        <textarea {...register('description')} className="input" rows={2} placeholder="Detalhes da obra..." />
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
export default function Obras() {
  const { isCompanyAdmin } = useAuth()
  const [obras, setObras] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editObra, setEditObra] = useState(null)
  const [deleteObra, setDeleteObra] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [users, setUsers] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const params = { per_page: 50 }
      if (statusFilter) params.status = statusFilter
      const { data } = await obrasAPI.list(params)
      setObras(data.items)
      setTotal(data.total)
    } catch {
      toast.error('Erro ao carregar obras')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])
  useEffect(() => {
    usersAPI.list({ per_page: 100 }).then(r => setUsers(r.data.items || [])).catch(() => {})
  }, [])

  const handleSave = async (values) => {
    setSaving(true)
    try {
      const payload = { ...values }
      if (!payload.responsible_id) delete payload.responsible_id
      if (!payload.contract_value) payload.contract_value = 0
      if (editObra) {
        await obrasAPI.update(editObra.id, payload)
        toast.success('Obra atualizada!')
      } else {
        await obrasAPI.create(payload)
        toast.success('Obra criada!')
      }
      setModalOpen(false)
      setEditObra(null)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await obrasAPI.delete(deleteObra.id)
      toast.success('Obra excluída!')
      setDeleteObra(null)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao excluir')
    } finally { setDeleting(false) }
  }

  const statusCounts = obras.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc }, {})

  return (
    <Layout title="Obras">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: total, color: 'text-navy-900', bg: 'bg-surface' },
          { label: 'Em Andamento', value: statusCounts.em_andamento || 0, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Concluídas', value: statusCounts.concluida || 0, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Planejamento', value: statusCounts.planejamento || 0, color: 'text-blue-700', bg: 'bg-blue-50' },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-text-muted mt-1">{item.label}</p>
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
          {isCompanyAdmin && (
            <button onClick={() => { setEditObra(null); setModalOpen(true) }} className="btn-primary">
              <Plus size={16} /> Nova Obra
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : obras.length === 0 ? (
        <div className="card text-center py-16">
          <HardHat size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-text-muted text-sm">Nenhuma obra encontrada</p>
          {isCompanyAdmin && (
            <button onClick={() => setModalOpen(true)} className="btn-primary mt-4 mx-auto">
              <Plus size={15} /> Cadastrar primeira obra
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {obras.map(obra => (
            <ObraCard
              key={obra.id}
              obra={obra}
              onEdit={o => { setEditObra(o); setModalOpen(true) }}
              onDelete={setDeleteObra}
              onUpdate={load}
              isAdmin={isCompanyAdmin}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditObra(null) }}
        title={editObra ? 'Editar Obra' : 'Nova Obra'}>
        <ObraForm onSubmit={handleSave} defaultValues={editObra} loading={saving} users={users} />
      </Modal>

      <ConfirmDialog
        open={!!deleteObra} onClose={() => setDeleteObra(null)} onConfirm={handleDelete}
        loading={deleting} title={`Excluir "${deleteObra?.name}"?`}
        message="Todas as etapas da obra serão excluídas permanentemente."
      />
    </Layout>
  )
}
