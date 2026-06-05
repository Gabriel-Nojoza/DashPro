import { useEffect, useState } from 'react'
import { productsAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle, RefreshCw } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  sku: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().default('un'),
  min_stock: z.coerce.number().min(0),
  cost_price: z.coerce.number().min(0),
  sale_price: z.coerce.number().min(0.01, 'Preço obrigatório'),
  current_stock: z.coerce.number().min(0),
})

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

function ProductForm({ onSubmit, defaultValues, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || { unit: 'un', min_stock: 0, cost_price: 0, current_stock: 0 },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Nome *</label>
          <input {...register('name')} className="input" placeholder="Nome do produto" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">SKU / Código</label>
          <input {...register('sku')} className="input" placeholder="PRD-001" />
        </div>
        <div>
          <label className="label">Categoria</label>
          <input {...register('category')} className="input" placeholder="Ex: Eletrônicos" />
        </div>
        <div>
          <label className="label">Unidade</label>
          <select {...register('unit')} className="input">
            <option value="un">Unidade (un)</option>
            <option value="kg">Quilograma (kg)</option>
            <option value="g">Grama (g)</option>
            <option value="l">Litro (l)</option>
            <option value="m">Metro (m)</option>
            <option value="cx">Caixa (cx)</option>
            <option value="pc">Peça (pc)</option>
          </select>
        </div>
        <div>
          <label className="label">Estoque Mínimo</label>
          <input {...register('min_stock')} type="number" step="0.001" className="input" placeholder="0" />
        </div>
        <div>
          <label className="label">Preço de Custo (R$)</label>
          <input {...register('cost_price')} type="number" step="0.01" className="input" placeholder="0,00" />
        </div>
        <div>
          <label className="label">Preço de Venda (R$) *</label>
          <input {...register('sale_price')} type="number" step="0.01" className="input" placeholder="0,00" />
          {errors.sale_price && <p className="text-red-500 text-xs mt-1">{errors.sale_price.message}</p>}
        </div>
        {!defaultValues && (
          <div>
            <label className="label">Estoque Inicial</label>
            <input {...register('current_stock')} type="number" step="0.001" className="input" placeholder="0" />
          </div>
        )}
        <div className={defaultValues ? 'col-span-2' : ''}>
          <label className="label">Descrição</label>
          <textarea {...register('description')} className="input min-h-[60px] resize-none" placeholder="Descrição opcional" />
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

export default function Products() {
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [lowStock, setLowStock] = useState(false)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [deleteProduct, setDeleteProduct] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const perPage = 15

  const load = async () => {
    setLoading(true)
    try {
      const [prodRes, catRes] = await Promise.all([
        productsAPI.list({ page, per_page: perPage, search: search || undefined, category: category || undefined, low_stock: lowStock || undefined }),
        productsAPI.categories(),
      ])
      setProducts(prodRes.data.items)
      setTotal(prodRes.data.total)
      setCategories(catRes.data)
    } catch {
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, search, category, lowStock])

  const handleSave = async (values) => {
    setSaving(true)
    try {
      if (editProduct) {
        await productsAPI.update(editProduct.id, values)
        toast.success('Produto atualizado!')
      } else {
        await productsAPI.create(values)
        toast.success('Produto criado!')
      }
      setModalOpen(false)
      setEditProduct(null)
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
      await productsAPI.delete(deleteProduct.id)
      toast.success('Produto excluído!')
      setDeleteProduct(null)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <Layout title="Produtos">
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar produto ou SKU..." className="input pl-9" />
          </div>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">Todas categorias</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1) }} className="accent-brand-orange" />
            Estoque baixo
          </label>
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          <button onClick={() => { setEditProduct(null); setModalOpen(true) }} className="btn-primary">
            <Plus size={16} /> Novo Produto
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Produto</th>
                <th className="table-header hidden md:table-cell">SKU</th>
                <th className="table-header hidden lg:table-cell">Categoria</th>
                <th className="table-header">Estoque</th>
                <th className="table-header hidden md:table-cell">Custo</th>
                <th className="table-header">Venda</th>
                <th className="table-header w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={Package} title="Nenhum produto encontrado" description="Crie seu primeiro produto clicando em Novo Produto" /></td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className="hover:bg-surface transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {p.is_low_stock && <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="table-cell hidden md:table-cell text-text-muted font-mono text-xs">{p.sku || '—'}</td>
                  <td className="table-cell hidden lg:table-cell">
                    {p.category ? <span className="px-2 py-0.5 bg-navy-900/8 text-navy-800 rounded text-xs font-medium">{p.category}</span> : '—'}
                  </td>
                  <td className="table-cell">
                    <span className={p.is_low_stock ? 'text-amber-600 font-semibold' : ''}>
                      {Number(p.current_stock).toLocaleString('pt-BR')} {p.unit}
                    </span>
                    {p.is_low_stock && <span className="text-xs text-amber-500 block">mín: {p.min_stock}</span>}
                  </td>
                  <td className="table-cell hidden md:table-cell text-text-muted">{fmt(p.cost_price)}</td>
                  <td className="table-cell font-semibold text-brand-orange">{fmt(p.sale_price)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditProduct(p); setModalOpen(true) }} className="p-1.5 rounded-lg hover:bg-navy-900/10 text-navy-800 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteProduct(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-text-muted">Mostrando {products.length} de {total} produtos</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Anterior</button>
              <span className="text-xs self-center">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Próximo</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditProduct(null) }} title={editProduct ? 'Editar Produto' : 'Novo Produto'} size="lg">
        <ProductForm onSubmit={handleSave} defaultValues={editProduct} loading={saving} />
      </Modal>

      <ConfirmDialog
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Excluir "${deleteProduct?.name}"?`}
        message="Esta ação não pode ser desfeita. O histórico de movimentações será mantido."
      />
    </Layout>
  )
}
