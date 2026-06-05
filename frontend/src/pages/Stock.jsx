import { useEffect, useState } from 'react'
import { stockAPI, productsAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import EmptyState from '@/components/common/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Archive, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const schema = z.object({
  product_id: z.string().min(1, 'Produto obrigatório'),
  type: z.enum(['entrada', 'saida', 'ajuste', 'perda', 'devolucao']),
  quantity: z.coerce.number().min(0.001, 'Quantidade obrigatória'),
  unit_cost: z.coerce.number().optional(),
  reason: z.string().optional(),
  reference: z.string().optional(),
})

const typeConfig = {
  entrada: { label: 'Entrada', color: 'text-emerald-600', icon: ArrowDownCircle },
  saida: { label: 'Saída', color: 'text-red-500', icon: ArrowUpCircle },
  ajuste: { label: 'Ajuste', color: 'text-blue-600', icon: Archive },
  perda: { label: 'Perda', color: 'text-amber-600', icon: ArrowUpCircle },
  devolucao: { label: 'Devolução', color: 'text-purple-600', icon: ArrowDownCircle },
}

function MovementForm({ onSubmit, products, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: 'entrada' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Produto *</label>
        <select {...register('product_id')} className="input">
          <option value="">Selecione um produto</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} (estoque: {Number(p.current_stock).toLocaleString('pt-BR')} {p.unit})</option>
          ))}
        </select>
        {errors.product_id && <p className="text-red-500 text-xs mt-1">{errors.product_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Tipo *</label>
          <select {...register('type')} className="input">
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="ajuste">Ajuste</option>
            <option value="perda">Perda</option>
            <option value="devolucao">Devolução</option>
          </select>
        </div>
        <div>
          <label className="label">Quantidade *</label>
          <input {...register('quantity')} type="number" step="0.001" className="input" placeholder="0" />
          {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
        </div>
        <div>
          <label className="label">Custo Unitário (R$)</label>
          <input {...register('unit_cost')} type="number" step="0.01" className="input" placeholder="0,00" />
        </div>
        <div>
          <label className="label">Referência</label>
          <input {...register('reference')} className="input" placeholder="NF, Pedido, etc." />
        </div>
        <div className="col-span-2">
          <label className="label">Motivo</label>
          <input {...register('reason')} className="input" placeholder="Motivo da movimentação" />
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Registrando...' : 'Registrar Movimentação'}
        </button>
      </div>
    </form>
  )
}

export default function Stock() {
  const [movements, setMovements] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const perPage = 20

  const load = async () => {
    setLoading(true)
    try {
      const [movRes, prodRes] = await Promise.all([
        stockAPI.list({ page, per_page: perPage, type: typeFilter || undefined }),
        productsAPI.list({ per_page: 100, is_active: true }),
      ])
      setMovements(movRes.data.items)
      setTotal(movRes.data.total)
      setProducts(prodRes.data.items)
    } catch {
      toast.error('Erro ao carregar estoque')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, typeFilter])

  const handleSave = async (values) => {
    setSaving(true)
    try {
      await stockAPI.create(values)
      toast.success('Movimentação registrada!')
      setModalOpen(false)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao registrar')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <Layout title="Estoque">
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">Todos os tipos</option>
            {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          <div className="flex-1" />
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={16} /> Nova Movimentação
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Data</th>
                <th className="table-header">Produto</th>
                <th className="table-header">Tipo</th>
                <th className="table-header">Qtd</th>
                <th className="table-header hidden md:table-cell">Antes</th>
                <th className="table-header hidden md:table-cell">Depois</th>
                <th className="table-header hidden lg:table-cell">Motivo</th>
                <th className="table-header hidden md:table-cell">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              ) : movements.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon={Archive} title="Nenhuma movimentação" description="Registre entradas e saídas de estoque" /></td></tr>
              ) : movements.map((m) => {
                const cfg = typeConfig[m.type] || typeConfig.ajuste
                const Icon = cfg.icon
                return (
                  <tr key={m.id} className="hover:bg-surface transition-colors">
                    <td className="table-cell text-xs text-text-muted whitespace-nowrap">
                      {m.created_at ? format(new Date(m.created_at), 'dd/MM/yy HH:mm', { locale: ptBR }) : '—'}
                    </td>
                    <td className="table-cell font-medium">{m.product_name || '—'}</td>
                    <td className="table-cell">
                      <span className={`flex items-center gap-1 text-xs font-semibold ${cfg.color}`}>
                        <Icon size={13} />{cfg.label}
                      </span>
                    </td>
                    <td className={`table-cell font-semibold ${cfg.color}`}>
                      {['saida', 'perda'].includes(m.type) ? '-' : '+'}{Number(m.quantity).toLocaleString('pt-BR')}
                    </td>
                    <td className="table-cell hidden md:table-cell text-text-muted">{Number(m.quantity_before).toLocaleString('pt-BR')}</td>
                    <td className="table-cell hidden md:table-cell font-medium">{Number(m.quantity_after).toLocaleString('pt-BR')}</td>
                    <td className="table-cell hidden lg:table-cell text-text-muted text-xs max-w-[160px] truncate">{m.reason || m.reference || '—'}</td>
                    <td className="table-cell hidden md:table-cell text-text-muted text-xs">{m.user_name || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-text-muted">{total} movimentações</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Anterior</button>
              <span className="text-xs self-center">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Próximo</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Movimentação de Estoque" size="md">
        <MovementForm onSubmit={handleSave} products={products} loading={saving} />
      </Modal>
    </Layout>
  )
}
