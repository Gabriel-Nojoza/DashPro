import { useEffect, useState } from 'react'
import { gastosAutoAPI, veiculosAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, DollarSign, RefreshCw, TrendingUp, TrendingDown, Wallet } from 'lucide-react'

const CATEGORIAS_SAIDA = [
  { value: 'mecanico',      label: 'Mecânico' },
  { value: 'pecas',         label: 'Troca de Peças' },
  { value: 'pintura',       label: 'Pintura / Funilaria' },
  { value: 'documentacao',  label: 'Documentação' },
  { value: 'combustivel',   label: 'Combustível' },
  { value: 'seguro',        label: 'Seguro' },
  { value: 'limpeza',       label: 'Higienização / Limpeza' },
  { value: 'compra',        label: 'Compra de Veículo' },
  { value: 'outros',        label: 'Outros' },
]

const CATEGORIAS_ENTRADA = [
  { value: 'venda',         label: 'Venda de Veículo' },
  { value: 'servico',       label: 'Serviço Prestado' },
  { value: 'outros',        label: 'Outros' },
]

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

const schema = z.object({
  tipo:       z.enum(['entrada', 'saida']),
  categoria:  z.string().min(1, 'Obrigatório'),
  descricao:  z.string().min(1, 'Obrigatório'),
  valor:      z.coerce.number().positive('Valor deve ser positivo'),
  data:       z.string().min(1, 'Obrigatório'),
  veiculo_id: z.string().optional(),
})

function LancamentoForm({ onSubmit, defaultValues, loading, veiculos }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues
      ? { ...defaultValues, data: defaultValues.data, veiculo_id: defaultValues.veiculo_id || '' }
      : { tipo: 'saida', data: new Date().toISOString().slice(0, 10), veiculo_id: '' },
  })

  const tipo = watch('tipo')
  const categorias = tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Tipo *</label>
          <div className="flex gap-3">
            {['saida', 'entrada'].map(t => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input {...register('tipo')} type="radio" value={t} className="accent-brand-orange" />
                <span className={`text-sm font-semibold ${t === 'saida' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {t === 'saida' ? '↓ Saída (gasto)' : '↑ Entrada (receita)'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Categoria *</label>
          <select {...register('categoria')} className="input">
            <option value="">Selecione...</option>
            {categorias.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.categoria && <p className="text-red-500 text-xs mt-1">{errors.categoria.message}</p>}
        </div>

        <div>
          <label className="label">Data *</label>
          <input {...register('data')} type="date" className="input" />
          {errors.data && <p className="text-red-500 text-xs mt-1">{errors.data.message}</p>}
        </div>

        <div className="col-span-2">
          <label className="label">Descrição *</label>
          <input {...register('descricao')} className="input" placeholder="Ex: Troca de óleo e filtros, Venda do Civic..." />
          {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao.message}</p>}
        </div>

        <div>
          <label className="label">Valor (R$) *</label>
          <input {...register('valor')} type="number" step="0.01" className="input" placeholder="0,00" />
          {errors.valor && <p className="text-red-500 text-xs mt-1">{errors.valor.message}</p>}
        </div>

        <div>
          <label className="label">Veículo (opcional)</label>
          <select {...register('veiculo_id')} className="input">
            <option value="">Sem veículo específico</option>
            {veiculos.map(v => (
              <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.ano_modelo} {v.placa ? `· ${v.placa}` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

export default function FinanceiroAuto() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0, saldo: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [tipoFilter, setTipoFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [veiculos, setVeiculos] = useState([])
  const perPage = 20

  const load = async () => {
    setLoading(true)
    try {
      const params = { page, per_page: perPage }
      if (tipoFilter) params.tipo = tipoFilter
      const { data } = await gastosAutoAPI.list(params)
      setItems(data.items)
      setTotal(data.total)
      setTotais({ entradas: data.total_entradas, saidas: data.total_saidas, saldo: data.saldo })
    } catch {
      toast.error('Erro ao carregar lançamentos')
    } finally {
      setLoading(false)
    }
  }

  const loadVeiculos = async () => {
    try {
      const { data } = await veiculosAPI.list({ per_page: 200 })
      setVeiculos(data.items || [])
    } catch {}
  }

  useEffect(() => { load() }, [page, tipoFilter])
  useEffect(() => { loadVeiculos() }, [])

  const handleSave = async (values) => {
    setSaving(true)
    try {
      const payload = { ...values }
      if (!payload.veiculo_id) delete payload.veiculo_id
      if (editItem) {
        await gastosAutoAPI.update(editItem.id, payload)
        toast.success('Lançamento atualizado!')
      } else {
        await gastosAutoAPI.create(payload)
        toast.success('Lançamento registrado!')
      }
      setModalOpen(false)
      setEditItem(null)
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
      await gastosAutoAPI.delete(deleteItem.id)
      toast.success('Lançamento excluído!')
      setDeleteItem(null)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <Layout title="Financeiro">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Entradas</p>
            <p className="text-lg font-bold text-emerald-600">{fmt(totais.entradas)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <TrendingDown size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Saídas</p>
            <p className="text-lg font-bold text-red-500">{fmt(totais.saidas)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${totais.saldo >= 0 ? 'bg-navy-900/10' : 'bg-red-100'}`}>
            <Wallet size={20} className={totais.saldo >= 0 ? 'text-navy-900' : 'text-red-500'} />
          </div>
          <div>
            <p className="text-xs text-text-muted">Saldo</p>
            <p className={`text-lg font-bold ${totais.saldo >= 0 ? 'text-navy-900' : 'text-red-500'}`}>{fmt(totais.saldo)}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-5 flex-wrap">
          <select
            value={tipoFilter}
            onChange={e => { setTipoFilter(e.target.value); setPage(1) }}
            className="input w-44"
          >
            <option value="">Todos</option>
            <option value="entrada">↑ Entradas</option>
            <option value="saida">↓ Saídas</option>
          </select>
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          <button onClick={() => { setEditItem(null); setModalOpen(true) }} className="btn-primary ml-auto">
            <Plus size={16} /> Novo Lançamento
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Data</th>
                <th className="table-header">Tipo</th>
                <th className="table-header">Categoria</th>
                <th className="table-header">Descrição</th>
                <th className="table-header">Veículo</th>
                <th className="table-header">Valor</th>
                <th className="table-header w-20">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => (
                    <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState icon={DollarSign} title="Nenhum lançamento" description="Registre entradas e saídas financeiras" />
                </td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="hover:bg-surface transition-colors">
                  <td className="table-cell text-sm">{fmtDate(item.data)}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {item.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                    </span>
                  </td>
                  <td className="table-cell text-sm capitalize">
                    {[...CATEGORIAS_SAIDA, ...CATEGORIAS_ENTRADA].find(c => c.value === item.categoria)?.label || item.categoria}
                  </td>
                  <td className="table-cell text-sm">{item.descricao}</td>
                  <td className="table-cell text-xs text-text-muted">{item.veiculo_nome || '—'}</td>
                  <td className={`table-cell font-semibold ${item.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {item.tipo === 'entrada' ? '+' : '-'}{fmt(item.valor)}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditItem(item); setModalOpen(true) }} className="p-1.5 rounded-lg hover:bg-navy-900/10 text-navy-800 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteItem(item)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-text-muted">{total} lançamentos</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Anterior</button>
              <span className="text-xs self-center">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Próximo</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null) }} title={editItem ? 'Editar Lançamento' : 'Novo Lançamento'}>
        <LancamentoForm onSubmit={handleSave} defaultValues={editItem} loading={saving} veiculos={veiculos} />
      </Modal>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Excluir lançamento?"
        message="O lançamento será removido permanentemente."
      />
    </Layout>
  )
}
