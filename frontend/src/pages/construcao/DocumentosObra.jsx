import { useEffect, useState, useRef } from 'react'
import { documentosAPI, obrasAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  Upload, Download, Trash2, RefreshCw, FolderOpen,
  Loader2, FileText, Image, File,
} from 'lucide-react'

const DOC_TYPES_OBRA = [
  { key: 'planta',    label: 'Planta / Projeto' },
  { key: 'art',       label: 'ART / RRT' },
  { key: 'contrato',  label: 'Contrato' },
  { key: 'alvara',    label: 'Alvará / Licença' },
  { key: 'nf',        label: 'Nota Fiscal' },
  { key: 'memoria',   label: 'Memorial Descritivo' },
  { key: 'foto_obra', label: 'Fotos da Obra' },
  { key: 'outros',    label: 'Outros' },
]

const CAT_LABEL = DOC_TYPES_OBRA.reduce((a, d) => { a[d.key] = d.label; return a }, {})

function fileIcon(type) {
  if (!type) return <File size={16} className="text-gray-400" />
  if (type.includes('pdf')) return <FileText size={16} className="text-red-500" />
  if (type.includes('image')) return <Image size={16} className="text-blue-500" />
  return <File size={16} className="text-gray-400" />
}

function UploadPanel({ obraId, onDone }) {
  const [category, setCategory] = useState('planta')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleUpload = async () => {
    if (!file) { toast.error('Selecione um arquivo'); return }
    setSaving(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await documentosAPI.upload('obra', obraId, form)
      toast.success('Documento enviado!')
      setFile(null)
      onDone()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao enviar')
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-navy-900 flex items-center gap-2"><Upload size={13} /> Enviar novo documento</p>
      <div className="grid grid-cols-2 gap-2">
        <select value={category} onChange={e => setCategory(e.target.value)} className="input text-xs py-1.5">
          {DOC_TYPES_OBRA.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.dwg,.xlsx"
          onChange={e => setFile(e.target.files[0])}
          className="block text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-brand-orange file:text-white" />
      </div>
      {file && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted truncate">{file.name}</p>
          <button onClick={handleUpload} disabled={saving} className="btn-primary text-xs py-1.5 px-3 shrink-0">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <><Upload size={13} /> Enviar</>}
          </button>
        </div>
      )}
    </div>
  )
}

export default function DocumentosObra() {
  const { isCompanyAdmin } = useAuth()
  const [docs, setDocs] = useState([])
  const [obras, setObras] = useState([])
  const [obraFilter, setObraFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [deleteDoc, setDeleteDoc] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = { entity_type: 'obra' }
      if (obraFilter) params.entity_id = obraFilter
      const { data } = await documentosAPI.list(params)
      setDocs(data)
    } catch { toast.error('Erro ao carregar documentos') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [obraFilter])
  useEffect(() => {
    obrasAPI.list({ per_page: 100 }).then(r => setObras(r.data.items || [])).catch(() => {})
  }, [])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await documentosAPI.delete(deleteDoc.id)
      toast.success('Documento removido!')
      setDeleteDoc(null)
      load()
    } catch { toast.error('Erro ao excluir') }
    finally { setDeleting(false) }
  }

  // Group docs by obra
  const grouped = docs.reduce((acc, d) => {
    const key = d.entity_id || 'geral'
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

  const getObraName = (id) => obras.find(o => o.id === id)?.name || 'Geral'

  return (
    <Layout title="Documentos">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <select value={obraFilter} onChange={e => { setObraFilter(e.target.value); setShowUpload(false) }}
            className="input py-1.5 text-sm max-w-xs">
            <option value="">Todas as obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          {isCompanyAdmin && obraFilter && (
            <button onClick={() => setShowUpload(s => !s)} className="btn-primary">
              <Upload size={15} /> Enviar Documento
            </button>
          )}
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && obraFilter && (
        <div className="mb-5">
          <UploadPanel obraId={obraFilter} onDone={() => { setShowUpload(false); load() }} />
        </div>
      )}

      {!obraFilter && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-700 font-medium">
          Selecione uma obra no filtro acima para enviar documentos ou ver os documentos por obra.
        </div>
      )}

      {/* Documents */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="card text-center py-16">
          <FolderOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-text-muted text-sm">Nenhum documento encontrado</p>
          {isCompanyAdmin && !obraFilter && (
            <p className="text-xs text-text-muted mt-2">Selecione uma obra para enviar documentos</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([obraId, obraDocs]) => (
            <div key={obraId} className="card">
              <h3 className="text-sm font-bold text-navy-900 mb-3 flex items-center gap-2">
                <FolderOpen size={16} className="text-brand-orange" />
                {getObraName(obraId)}
                <span className="text-xs text-text-muted font-normal">({obraDocs.length} arquivo{obraDocs.length !== 1 ? 's' : ''})</span>
              </h3>
              <div className="space-y-2">
                {obraDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="shrink-0">{fileIcon(doc.file_type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-900 truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {doc.category && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                            {CAT_LABEL[doc.category] || doc.category}
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted">{doc.file_size}</span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {doc.uploaded_by_name && (
                          <span className="text-[10px] text-text-muted">por {doc.uploaded_by_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a href={doc.file_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-navy-800 hover:text-brand-orange transition-colors">
                        <Download size={14} /> Baixar
                      </a>
                      {isCompanyAdmin && (
                        <button onClick={() => setDeleteDoc(doc)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteDoc} onClose={() => setDeleteDoc(null)} onConfirm={handleDelete}
        loading={deleting} title={`Excluir "${deleteDoc?.name}"?`}
        message="O arquivo será removido permanentemente." />
    </Layout>
  )
}
