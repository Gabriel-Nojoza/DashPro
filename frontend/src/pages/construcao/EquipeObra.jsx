import { useEffect, useState, useRef } from 'react'
import { trabalhadoresAPI, obrasAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, RefreshCw, HardHat,
  Phone, FileText, Upload, Download, X, Loader2,
} from 'lucide-react'

const CARGOS = [
  'Mestre de Obras', 'Pedreiro', 'Servente', 'Eletricista', 'Encanador',
  'Carpinteiro', 'Armador', 'Pintor', 'Azulejista', 'Gesseiro',
  'Soldador', 'Operador de Máquinas', 'Motorista', 'Vigia', 'Outro',
]

const STATUS_STYLE = {
  ativo: 'bg-emerald-100 text-emerald-700',
  afastado: 'bg-amber-100 text-amber-700',
  inativo: 'bg-gray-100 text-gray-500',
}

// ─── SSO Document categories ──────────────────────────────────────────────────
const SSO_DOCS = [
  { key: 'aso',        label: 'ASO — Atestado de Saúde Ocupacional', required: true,  hasValidity: true },
  { key: 'ctps',       label: 'CTPS — Carteira de Trabalho',          required: true,  hasValidity: false },
  { key: 'rg_cpf',     label: 'RG e CPF',                             required: true,  hasValidity: false },
  { key: 'pis_nit',    label: 'PIS / NIT',                            required: true,  hasValidity: false },
  { key: 'foto',       label: 'Foto 3x4',                             required: false, hasValidity: false },
  { key: 'comprov_res',label: 'Comprovante de Residência',            required: false, hasValidity: false },
  { key: 'nr18',       label: 'NR-18 — Segurança na Construção Civil',required: true,  hasValidity: true },
  { key: 'nr35',       label: 'NR-35 — Trabalho em Altura',           required: false, hasValidity: true },
  { key: 'nr10',       label: 'NR-10 — Eletricidade',                 required: false, hasValidity: true },
  { key: 'nr33',       label: 'NR-33 — Espaço Confinado',             required: false, hasValidity: true },
  { key: 'ficha_epi',  label: 'Ficha de Entrega de EPI',              required: true,  hasValidity: false },
  { key: 'integracao', label: 'Integração de Segurança da Obra',      required: true,  hasValidity: false },
  { key: 'outros',     label: 'Outros documentos',                    required: false, hasValidity: false },
]

function UploadModal({ category, trabId, onClose, onDone }) {
  const [file, setFile] = useState(null)
  const [expires, setExpires] = useState('')
  const [saving, setSaving] = useState(false)
  const catInfo = SSO_DOCS.find(d => d.key === category)

  const handleSubmit = async () => {
    if (!file) { toast.error('Selecione um arquivo'); return }
    setSaving(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('category', category)
      if (expires) form.append('expires_at', expires)
      await trabalhadoresAPI.uploadDocumento(trabId, form)
      toast.success('Documento enviado!')
      onDone()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao enviar')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-navy-900">{catInfo?.label}</p>
      <div>
        <label className="label">Arquivo *</label>
        <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={e => setFile(e.target.files[0])}
          className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-orange file:text-white hover:file:bg-brand-orange/90" />
      </div>
      {catInfo?.hasValidity && (
        <div>
          <label className="label">Validade do documento</label>
          <input type="date" value={expires} onChange={e => setExpires(e.target.value)} className="input" />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : <><Upload size={14} /> Enviar</>}
        </button>
      </div>
    </div>
  )
}

// ─── Documentos Panel ─────────────────────────────────────────────────────────
function DocumentosPanel({ trabId, isAdmin }) {
  const [docs, setDocs] = useState([])
  const [uploadingCat, setUploadingCat] = useState(null)

  const loadDocs = async () => {
    try {
      const { data } = await trabalhadoresAPI.listDocumentos(trabId)
      setDocs(data)
    } catch {}
  }

  useEffect(() => { loadDocs() }, [trabId])

  const handleDelete = async (docId) => {
    try {
      await trabalhadoresAPI.deleteDocumento(trabId, docId)
      loadDocs()
    } catch { toast.error('Erro ao remover') }
  }

  const docsByCategory = docs.reduce((acc, d) => {
    const key = d.category || 'outros'
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

  const pending = SSO_DOCS.filter(s => s.required && !docsByCategory[s.key]?.length).length

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-navy-900">SSO & Documentos</p>
        {pending > 0 && (
          <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
            {pending} obrigatório{pending > 1 ? 's' : ''} pendente{pending > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {SSO_DOCS.map(cat => {
          const catDocs = docsByCategory[cat.key] || []
          const hasDoc = catDocs.length > 0
          const latestDoc = catDocs[0]
          const isExpired = latestDoc?.expires_at && new Date(latestDoc.expires_at) < new Date()

          return (
            <div key={cat.key} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
              hasDoc && !isExpired ? 'bg-emerald-50' : cat.required ? 'bg-red-50' : 'bg-surface'
            }`}>
              <span className="shrink-0 text-sm">
                {hasDoc && !isExpired ? '✅' : cat.required ? '❌' : '⬜'}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${cat.required ? 'text-navy-900' : 'text-gray-600'}`}>
                  {cat.label}
                  {cat.required && <span className="ml-1 text-[9px] text-red-500 font-bold">OBRIG.</span>}
                </p>
                {hasDoc && latestDoc.expires_at && (
                  <p className={`text-[10px] ${isExpired ? 'text-red-600 font-semibold' : 'text-text-muted'}`}>
                    Validade: {new Date(latestDoc.expires_at + 'T00:00:00').toLocaleDateString('pt-BR')}
                    {isExpired && ' — VENCIDO'}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {hasDoc && (
                  <a href={latestDoc.file_url} target="_blank" rel="noreferrer"
                    className="p-1 hover:text-brand-orange text-gray-400 transition-colors" title="Baixar">
                    <Download size={11} />
                  </a>
                )}
                {isAdmin && hasDoc && (
                  <button onClick={() => handleDelete(latestDoc.id)}
                    className="p-1 hover:text-red-500 text-gray-400 transition-colors" title="Remover">
                    <X size={11} />
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => setUploadingCat(cat.key)}
                    className="p-1 hover:text-brand-orange text-gray-400 transition-colors" title="Enviar">
                    <Upload size={11} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {uploadingCat && (
        <Modal open={true} onClose={() => setUploadingCat(null)} title="Enviar Documento">
          <UploadModal
            category={uploadingCat}
            trabId={trabId}
            onClose={() => setUploadingCat(null)}
            onDone={() => { setUploadingCat(null); loadDocs() }}
          />
        </Modal>
      )}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function TrabCard({ t, onEdit, onDelete, isAdmin }) {
  const [showDocs, setShowDocs] = useState(false)

  return (
    <div className="card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-navy-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {t.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-navy-900 truncate">{t.name}</p>
            <p className="text-xs text-brand-orange font-medium">{t.cargo}</p>
            {t.obra_name && <p className="text-xs text-text-muted truncate">Obra: {t.obra_name}</p>}
            {t.phone && (
              <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                <Phone size={10} /> {t.phone}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[t.status]}`}>
            {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
          </span>
          {isAdmin && (
            <div className="flex gap-1">
              <button onClick={() => onEdit(t)} className="p-1.5 rounded-lg hover:bg-navy-900/10 text-navy-800 transition-colors"><Pencil size={13} /></button>
              <button onClick={() => onDelete(t)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={13} /></button>
            </div>
          )}
        </div>
      </div>

      {t.cpf && <p className="text-xs text-text-muted mt-2">CPF: {t.cpf}</p>}
      {t.notes && <p className="text-xs text-text-muted mt-1 line-clamp-2">{t.notes}</p>}

      <button onClick={() => setShowDocs(o => !o)}
        className="mt-2 text-xs text-navy-900 hover:text-brand-orange transition-colors flex items-center gap-1">
        <FileText size={11} /> {showDocs ? 'Ocultar documentos' : 'Ver documentos'}
      </button>
      {showDocs && <DocumentosPanel trabId={t.id} isAdmin={isAdmin} />}
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────
function TrabForm({ onSubmit, defaultValues, loading, obras }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: defaultValues || { cargo: 'Pedreiro', status: 'ativo' },
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Nome *</label>
        <input {...register('name', { required: 'Obrigatório' })} className="input" placeholder="Nome completo" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Cargo *</label>
          <select {...register('cargo')} className="input">
            {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select {...register('status')} className="input">
            <option value="ativo">Ativo</option>
            <option value="afastado">Afastado</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">CPF</label>
          <input {...register('cpf')} className="input" placeholder="000.000.000-00" />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input {...register('phone')} className="input" placeholder="(85) 99999-0000" />
        </div>
      </div>
      <div>
        <label className="label">Obra vinculada</label>
        <select {...register('obra_id')} className="input">
          <option value="">Equipe geral</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Observações</label>
        <textarea {...register('notes')} className="input" rows={2} placeholder="Especialidade, contato de emergência..." />
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
export default function EquipeObra() {
  const { isCompanyAdmin } = useAuth()
  const [workers, setWorkers] = useState([])
  const [obras, setObras] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [obraFilter, setObraFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ativo')
  const [modalOpen, setModalOpen] = useState(false)
  const [editWorker, setEditWorker] = useState(null)
  const [deleteWorker, setDeleteWorker] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = { per_page: 100 }
      if (obraFilter) params.obra_id = obraFilter
      if (statusFilter) params.status = statusFilter
      const { data } = await trabalhadoresAPI.list(params)
      setWorkers(data.items)
      setTotal(data.total)
    } catch { toast.error('Erro ao carregar equipe') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [obraFilter, statusFilter])
  useEffect(() => {
    obrasAPI.list({ per_page: 100 }).then(r => setObras(r.data.items || [])).catch(() => {})
  }, [])

  const handleSave = async (values) => {
    setSaving(true)
    try {
      const payload = { ...values }
      if (!payload.obra_id) delete payload.obra_id
      if (editWorker) {
        await trabalhadoresAPI.update(editWorker.id, payload)
        toast.success('Trabalhador atualizado!')
      } else {
        await trabalhadoresAPI.create(payload)
        toast.success('Trabalhador cadastrado!')
      }
      setModalOpen(false)
      setEditWorker(null)
      load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await trabalhadoresAPI.delete(deleteWorker.id)
      toast.success('Trabalhador removido!')
      setDeleteWorker(null)
      load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao excluir') }
    finally { setDeleting(false) }
  }

  const byCargo = workers.reduce((acc, w) => { acc[w.cargo] = (acc[w.cargo] || 0) + 1; return acc }, {})

  return (
    <Layout title="Equipe de Obra">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-surface rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-navy-900">{total}</p>
          <p className="text-xs text-text-muted mt-1">Total</p>
        </div>
        {Object.entries(byCargo).slice(0, 3).map(([cargo, count]) => (
          <div key={cargo} className="bg-surface rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-navy-900">{count}</p>
            <p className="text-xs text-text-muted mt-1 truncate">{cargo}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input py-1.5 text-sm">
            <option value="">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="afastado">Afastados</option>
            <option value="inativo">Inativos</option>
          </select>
          <select value={obraFilter} onChange={e => setObraFilter(e.target.value)} className="input py-1.5 text-sm">
            <option value="">Todas as obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          {isCompanyAdmin && (
            <button onClick={() => { setEditWorker(null); setModalOpen(true) }} className="btn-primary">
              <Plus size={16} /> Cadastrar Trabalhador
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : workers.length === 0 ? (
        <div className="card text-center py-16">
          <HardHat size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-text-muted text-sm">Nenhum trabalhador cadastrado</p>
          {isCompanyAdmin && (
            <button onClick={() => setModalOpen(true)} className="btn-primary mt-4 mx-auto">
              <Plus size={15} /> Cadastrar primeiro trabalhador
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map(t => (
            <TrabCard key={t.id} t={t}
              onEdit={w => { setEditWorker(w); setModalOpen(true) }}
              onDelete={setDeleteWorker}
              isAdmin={isCompanyAdmin}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditWorker(null) }}
        title={editWorker ? 'Editar Trabalhador' : 'Cadastrar Trabalhador'}>
        <TrabForm onSubmit={handleSave} defaultValues={editWorker} loading={saving} obras={obras} />
      </Modal>

      <ConfirmDialog open={!!deleteWorker} onClose={() => setDeleteWorker(null)} onConfirm={handleDelete}
        loading={deleting} title={`Remover "${deleteWorker?.name}"?`}
        message="O trabalhador e seus documentos serão removidos." />
    </Layout>
  )
}
