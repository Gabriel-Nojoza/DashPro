import { useEffect, useState, useRef } from 'react'
import { veiculosAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Car, RefreshCw, Search, ImagePlus, X, Loader2 } from 'lucide-react'

const statusLabel = { disponivel: 'Disponível', reservado: 'Reservado', vendido: 'Vendido' }
const statusBadge = {
  disponivel: 'bg-emerald-100 text-emerald-700',
  reservado:  'bg-amber-100 text-amber-700',
  vendido:    'bg-gray-100 text-gray-500',
}

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const schema = z.object({
  marca:          z.string().min(1, 'Obrigatório'),
  modelo:         z.string().min(1, 'Obrigatório'),
  ano_fabricacao: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  ano_modelo:     z.coerce.number().min(1900).max(new Date().getFullYear() + 2),
  cor:            z.string().optional(),
  km:             z.coerce.number().min(0).default(0),
  placa:          z.string().optional(),
  combustivel:    z.string().default('flex'),
  transmissao:    z.string().default('manual'),
  tipo:           z.string().default('hatch'),
  preco_custo:    z.coerce.number().min(0).default(0),
  preco_venda:    z.coerce.number().min(0, 'Obrigatório'),
  status:         z.string().default('disponivel'),
  descricao:      z.string().optional(),
})

function VeiculoForm({ onSubmit, defaultValues, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || { combustivel: 'flex', transmissao: 'manual', tipo: 'hatch', status: 'disponivel', km: 0, preco_custo: 0 },
  })

  return (
    <form id="veiculo-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Marca *</label>
          <input {...register('marca')} className="input" placeholder="Ex: Fiat, VW, Toyota" />
          {errors.marca && <p className="text-red-500 text-xs mt-1">{errors.marca.message}</p>}
        </div>
        <div>
          <label className="label">Modelo *</label>
          <input {...register('modelo')} className="input" placeholder="Ex: Onix, Gol, Corolla" />
          {errors.modelo && <p className="text-red-500 text-xs mt-1">{errors.modelo.message}</p>}
        </div>
        <div>
          <label className="label">Ano Fab. *</label>
          <input {...register('ano_fabricacao')} type="number" className="input" placeholder="2022" />
          {errors.ano_fabricacao && <p className="text-red-500 text-xs mt-1">{errors.ano_fabricacao.message}</p>}
        </div>
        <div>
          <label className="label">Ano Modelo *</label>
          <input {...register('ano_modelo')} type="number" className="input" placeholder="2023" />
        </div>
        <div>
          <label className="label">Cor</label>
          <input {...register('cor')} className="input" placeholder="Branco, Preto, Prata..." />
        </div>
        <div>
          <label className="label">Placa</label>
          <input {...register('placa')} className="input" placeholder="ABC-1234" />
        </div>
        <div>
          <label className="label">KM</label>
          <input {...register('km')} type="number" className="input" placeholder="0" />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select {...register('tipo')} className="input">
            {['hatch','sedan','suv','pickup','van','caminhao','moto','outro'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Combustível</label>
          <select {...register('combustivel')} className="input">
            <option value="flex">Flex</option>
            <option value="gasolina">Gasolina</option>
            <option value="etanol">Etanol</option>
            <option value="diesel">Diesel</option>
            <option value="eletrico">Elétrico</option>
            <option value="hibrido">Híbrido</option>
          </select>
        </div>
        <div>
          <label className="label">Câmbio</label>
          <select {...register('transmissao')} className="input">
            <option value="manual">Manual</option>
            <option value="automatico">Automático</option>
            <option value="cvt">CVT</option>
          </select>
        </div>
        <div>
          <label className="label">Preço de Custo (R$)</label>
          <input {...register('preco_custo')} type="number" step="0.01" className="input" placeholder="0,00" />
        </div>
        <div>
          <label className="label">Preço de Venda (R$) *</label>
          <input {...register('preco_venda')} type="number" step="0.01" className="input" placeholder="0,00" />
          {errors.preco_venda && <p className="text-red-500 text-xs mt-1">{errors.preco_venda.message}</p>}
        </div>
        <div className="col-span-2">
          <label className="label">Status</label>
          <select {...register('status')} className="input">
            <option value="disponivel">Disponível</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Descrição / Observações</label>
          <textarea {...register('descricao')} className="input min-h-[80px]" placeholder="Detalhes do veículo..." />
        </div>
      </div>
    </form>
  )
}

export default function Veiculos() {
  const [veiculos, setVeiculos] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [preview, setPreview] = useState(null)

  // Fotos locais (fila antes de salvar) e upload em andamento
  const [pendingFiles, setPendingFiles] = useState([])
  const [pendingPreviews, setPendingPreviews] = useState([])
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fileRef = useRef(null)

  const perPage = 15

  const load = async () => {
    setLoading(true)
    try {
      const params = { page, per_page: perPage }
      if (search) params.search = search
      if (statusFilter === 'todos') {
        params.include_sold = true
      } else if (statusFilter) {
        params.status = statusFilter
      }
      const { data } = await veiculosAPI.list(params)
      setVeiculos(data.items)
      setTotal(data.total)
    } catch {
      toast.error('Erro ao carregar veículos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, search, statusFilter])

  const closeModal = () => {
    setModalOpen(false)
    setEditItem(null)
    setPendingFiles([])
    setPendingPreviews([])
  }

  const openNew = () => {
    setEditItem(null)
    setPendingFiles([])
    setPendingPreviews([])
    setModalOpen(true)
  }

  const openEdit = (v) => {
    setEditItem(v)
    setPendingFiles([])
    setPendingPreviews([])
    setModalOpen(true)
  }

  const addLocalFiles = (files) => {
    if (!files?.length) return
    const arr = Array.from(files)
    setPendingFiles(prev => [...prev, ...arr])
    const previews = arr.map(f => URL.createObjectURL(f))
    setPendingPreviews(prev => [...prev, ...previews])
    if (fileRef.current) fileRef.current.value = ''
  }

  const removeLocalFile = (index) => {
    URL.revokeObjectURL(pendingPreviews[index])
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
    setPendingPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadPending = async (veiculoId) => {
    let updated = null
    for (const file of pendingFiles) {
      const form = new FormData()
      form.append('file', file)
      const { data } = await veiculosAPI.uploadFoto(veiculoId, form)
      updated = data
    }
    setPendingFiles([])
    setPendingPreviews(prev => { prev.forEach(u => URL.revokeObjectURL(u)); return [] })
    return updated
  }

  const handleSave = async (values) => {
    setSaving(true)
    try {
      let veiculo
      if (editItem) {
        const { data } = await veiculosAPI.update(editItem.id, values)
        veiculo = data
        toast.success('Veículo atualizado!')
      } else {
        const { data } = await veiculosAPI.create(values)
        veiculo = data
        toast.success('Veículo cadastrado!')
      }

      if (pendingFiles.length > 0) {
        const withFotos = await uploadPending(veiculo.id)
        if (withFotos) veiculo = withFotos
      }

      setEditItem(veiculo)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFoto = async (index) => {
    try {
      const { data } = await veiculosAPI.deleteFoto(editItem.id, index)
      setEditItem(data)
      load()
    } catch {
      toast.error('Erro ao remover foto')
    }
  }

  const handleUploadFoto = async (files) => {
    if (!files?.length) return
    setUploadingFoto(true)
    try {
      let updated = editItem
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.append('file', file)
        const { data } = await veiculosAPI.uploadFoto(editItem.id, form)
        updated = data
      }
      setEditItem(updated)
      load()
      toast.success('Foto adicionada!')
    } catch {
      toast.error('Erro ao enviar foto')
    } finally {
      setUploadingFoto(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await veiculosAPI.delete(deleteItem.id)
      toast.success('Veículo excluído!')
      setDeleteItem(null)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  // Todas as fotos a mostrar: salvas + previews locais pendentes
  const uploadedFotos = editItem?.fotos || []
  const allPreviews = [
    ...uploadedFotos.map(url => ({ url, type: 'uploaded' })),
    ...pendingPreviews.map((url, i) => ({ url, type: 'pending', index: i })),
  ]

  const totalPages = Math.ceil(total / perPage)

  return (
    <Layout title="Veículos">
      {/* Lightbox */}
      {preview !== null && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <img src={allPreviews[preview]?.url} alt="preview" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
        </div>
      )}

      <div className="card">
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar marca, modelo, placa..."
              className="input pl-9"
            />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="input w-44">
            <option value="">Em Estoque</option>
            <option value="disponivel">Disponível</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendidos</option>
            <option value="todos">Todos</option>
          </select>
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          <button onClick={openNew} className="btn-primary"><Plus size={16} /> Novo Veículo</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Veículo</th>
                <th className="table-header">Placa</th>
                <th className="table-header">KM</th>
                <th className="table-header">Combustível</th>
                <th className="table-header">Preço Venda</th>
                <th className="table-header">Status</th>
                <th className="table-header w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => (
                    <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : veiculos.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState icon={Car} title="Nenhum veículo" description="Cadastre veículos para o seu estoque" />
                </td></tr>
              ) : veiculos.map(v => (
                <tr key={v.id} className="hover:bg-surface transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      {v.fotos?.[0] ? (
                        <img src={v.fotos[0]} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          <Car size={18} className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{v.marca} {v.modelo}</p>
                        <p className="text-xs text-text-muted">{v.ano_fabricacao}/{v.ano_modelo} · {v.cor || '—'} · {v.tipo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-sm">{v.placa || '—'}</td>
                  <td className="table-cell text-sm">{v.km.toLocaleString('pt-BR')} km</td>
                  <td className="table-cell text-sm capitalize">{v.combustivel} / {v.transmissao}</td>
                  <td className="table-cell font-semibold text-navy-900">{fmt(v.preco_venda)}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[v.status]}`}>
                      {statusLabel[v.status]}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-navy-900/10 text-navy-800 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteItem(v)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-text-muted">{total} veículos</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Anterior</button>
              <span className="text-xs self-center">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Próximo</button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editItem ? `${editItem.marca} ${editItem.modelo}` : 'Novo Veículo'}
      >
        <VeiculoForm onSubmit={handleSave} defaultValues={editItem} loading={saving} />

        {/* ── Seção de Fotos ── */}
        <div className="border-t border-gray-100 pt-4 mt-2">
          <p className="label mb-3">Fotos do Veículo</p>

          <div className="flex flex-wrap gap-2">
            {/* Fotos já salvas no servidor */}
            {uploadedFotos.map((url, i) => (
              <div key={`up-${i}`} className="relative group">
                <img
                  src={url}
                  alt={`foto ${i + 1}`}
                  onClick={() => setPreview(i)}
                  className="w-24 h-24 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1 rounded">Principal</span>
                )}
                {editItem && (
                  <button
                    type="button"
                    onClick={() => handleDeleteFoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}

            {/* Previews locais (aguardando salvar) */}
            {pendingPreviews.map((url, i) => (
              <div key={`pend-${i}`} className="relative group">
                <img
                  src={url}
                  alt="pendente"
                  className="w-24 h-24 object-cover rounded-xl border-2 border-dashed border-amber-400 opacity-80"
                />
                <span className="absolute bottom-1 left-1 bg-amber-500 text-white text-[9px] px-1 rounded">Pendente</span>
                <button
                  type="button"
                  onClick={() => removeLocalFile(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X size={10} />
                </button>
              </div>
            ))}

            {/* Botão adicionar */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingFoto}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-brand-orange hover:text-brand-orange transition-colors disabled:opacity-60"
            >
              {uploadingFoto
                ? <Loader2 size={20} className="animate-spin" />
                : <><ImagePlus size={20} /><span className="text-xs font-medium">Adicionar</span></>
              }
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                if (editItem) {
                  handleUploadFoto(e.target.files)
                } else {
                  addLocalFiles(e.target.files)
                }
              }}
            />
          </div>

          {pendingPreviews.length > 0 && !editItem && (
            <p className="text-xs text-amber-600 mt-2 font-medium">
              {pendingPreviews.length} foto(s) serão enviadas ao salvar o veículo.
            </p>
          )}
        </div>

        {/* Botão Salvar fora do form, vinculado via form= */}
        <div className="flex justify-end pt-3 border-t border-gray-100 mt-3">
          <button
            type="submit"
            form="veiculo-form"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Excluir "${deleteItem?.marca} ${deleteItem?.modelo}"?`}
        message="O veículo será removido do estoque permanentemente."
      />
    </Layout>
  )
}
