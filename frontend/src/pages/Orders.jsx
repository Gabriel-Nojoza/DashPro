import { useEffect, useState } from 'react'
import { ordersAPI, clientsAPI, productsAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import StatusBadge from '@/components/common/StatusBadge'
import EmptyState from '@/components/common/EmptyState'
import toast from 'react-hot-toast'
import { Plus, ShoppingCart, Trash2, RefreshCw, Eye, X, Search } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

function NewOrderModal({ onClose, onSave }) {
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [clientId, setClientId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      clientsAPI.list({ per_page: 100, status: 'ativo' }),
      productsAPI.list({ per_page: 100, is_active: true }),
    ]).then(([c, p]) => {
      setClients(c.data.items)
      setProducts(p.data.items)
    })
  }, [])

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0, discount: 0 }])
  }

  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))

  const updateItem = (i, field, value) => {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: value }
    if (field === 'product_id') {
      const prod = products.find((p) => p.id === value)
      if (prod) updated[i].unit_price = Number(prod.sale_price)
    }
    setItems(updated)
  }

  const subtotal = items.reduce((acc, item) => {
    return acc + (Number(item.quantity) * Number(item.unit_price)) - Number(item.discount || 0)
  }, 0)
  const total = subtotal - Number(discount || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!clientId) return toast.error('Selecione um cliente')
    if (items.length === 0) return toast.error('Adicione pelo menos um produto')
    if (items.some((i) => !i.product_id)) return toast.error('Selecione o produto em todos os itens')

    setSaving(true)
    try {
      await ordersAPI.create({
        client_id: clientId,
        payment_method: paymentMethod || null,
        discount: Number(discount || 0),
        notes,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          discount: Number(i.discount || 0),
        })),
      })
      toast.success('Pedido criado!')
      onSave()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao criar pedido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="label">Cliente *</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="input">
            <option value="">Selecione...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Forma de Pagamento</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
            <option value="">Selecione...</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao_credito">Cartão de Crédito</option>
            <option value="cartao_debito">Cartão de Débito</option>
            <option value="boleto">Boleto</option>
            <option value="transferencia">Transferência</option>
          </select>
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Produtos *</label>
          <button type="button" onClick={addItem} className="text-xs text-brand-orange font-semibold hover:underline flex items-center gap-1">
            <Plus size={13} /> Adicionar
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center bg-surface rounded-lg p-2">
              <div className="col-span-5">
                <select value={item.product_id} onChange={(e) => updateItem(i, 'product_id', e.target.value)} className="input text-xs py-1.5">
                  <option value="">Produto...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input type="number" step="0.001" min="0.001" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} className="input text-xs py-1.5" placeholder="Qtd" />
              </div>
              <div className="col-span-2">
                <input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)} className="input text-xs py-1.5" placeholder="R$" />
              </div>
              <div className="col-span-2 text-xs font-semibold text-brand-orange text-right">
                {fmt((Number(item.quantity) * Number(item.unit_price)) - Number(item.discount || 0))}
              </div>
              <div className="col-span-1 flex justify-end">
                <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-text-muted text-center py-4">Nenhum produto adicionado</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Desconto Geral (R$)</label>
          <input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} className="input" placeholder="0,00" />
        </div>
        <div>
          <label className="label">Total</label>
          <div className="input bg-surface font-bold text-brand-orange text-base">{fmt(total)}</div>
        </div>
        <div className="col-span-2">
          <label className="label">Observações</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-[60px] resize-none" placeholder="Obs sobre o pedido..." />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Criando...' : 'Criar Pedido'}</button>
      </div>
    </form>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewOrder, setViewOrder] = useState(null)
  const [deleteOrder, setDeleteOrder] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const perPage = 15

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await ordersAPI.list({ page, per_page: perPage, status: statusFilter || undefined })
      setOrders(data.items)
      setTotal(data.total)
    } catch {
      toast.error('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, statusFilter])

  const handleStatusChange = async (order, newStatus, cancelReason) => {
    try {
      await ordersAPI.updateStatus(order.id, { status: newStatus, cancel_reason: cancelReason })
      toast.success('Status atualizado!')
      load()
      if (viewOrder?.id === order.id) setViewOrder(null)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao atualizar')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await ordersAPI.delete(deleteOrder.id)
      toast.success('Pedido excluído!')
      setDeleteOrder(null)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / perPage)
  const statusFlow = { aberto: 'andamento', andamento: 'entregue' }

  return (
    <Layout title="Pedidos">
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">Todos os status</option>
            <option value="aberto">Aberto</option>
            <option value="andamento">Em Andamento</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          <div className="flex-1" />
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={16} /> Novo Pedido
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Pedido</th>
                <th className="table-header">Cliente</th>
                <th className="table-header hidden md:table-cell">Data</th>
                <th className="table-header">Status</th>
                <th className="table-header hidden lg:table-cell">Pagamento</th>
                <th className="table-header">Total</th>
                <th className="table-header w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              ) : orders.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={ShoppingCart} title="Nenhum pedido encontrado" description="Crie seu primeiro pedido clicando em Novo Pedido" /></td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} className="hover:bg-surface transition-colors">
                  <td className="table-cell font-mono text-xs font-semibold text-navy-900">{o.order_number}</td>
                  <td className="table-cell font-medium">{o.client_name || '—'}</td>
                  <td className="table-cell hidden md:table-cell text-xs text-text-muted">
                    {o.created_at ? format(new Date(o.created_at), 'dd/MM/yy HH:mm', { locale: ptBR }) : '—'}
                  </td>
                  <td className="table-cell"><StatusBadge status={o.status} /></td>
                  <td className="table-cell hidden lg:table-cell text-text-muted text-xs capitalize">
                    {o.payment_method?.replace(/_/g, ' ') || '—'}
                  </td>
                  <td className="table-cell font-semibold text-brand-orange">{fmt(o.total)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewOrder(o)} className="p-1.5 rounded-lg hover:bg-navy-900/10 text-navy-800 transition-colors"><Eye size={14} /></button>
                      {statusFlow[o.status] && (
                        <button
                          onClick={() => handleStatusChange(o, statusFlow[o.status])}
                          className="px-2 py-1 text-xs bg-brand-orange text-white rounded-lg hover:bg-brand-orange-dark transition-colors font-semibold"
                        >
                          {statusFlow[o.status] === 'andamento' ? 'Iniciar' : 'Entregar'}
                        </button>
                      )}
                      {['aberto', 'andamento'].includes(o.status) && (
                        <button onClick={() => setDeleteOrder(o)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-text-muted">{total} pedidos</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Anterior</button>
              <span className="text-xs self-center">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Próximo</button>
            </div>
          </div>
        )}
      </div>

      {/* View modal */}
      {viewOrder && (
        <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Pedido ${viewOrder.order_number}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="label">Cliente</span><p>{viewOrder.client_name}</p></div>
              <div><span className="label">Status</span><StatusBadge status={viewOrder.status} /></div>
              <div><span className="label">Pagamento</span><p className="capitalize">{viewOrder.payment_method?.replace(/_/g, ' ') || '—'}</p></div>
              <div><span className="label">Data</span><p>{viewOrder.created_at ? format(new Date(viewOrder.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—'}</p></div>
            </div>

            <div>
              <p className="label">Itens do Pedido</p>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100"><th className="text-left py-2 text-xs text-text-muted">Produto</th><th className="text-right py-2 text-xs text-text-muted">Qtd</th><th className="text-right py-2 text-xs text-text-muted">Unit.</th><th className="text-right py-2 text-xs text-text-muted">Total</th></tr></thead>
                <tbody>{(viewOrder.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2">{item.product_name}</td>
                    <td className="py-2 text-right">{Number(item.quantity).toLocaleString('pt-BR')}</td>
                    <td className="py-2 text-right text-text-muted">{fmt(item.unit_price)}</td>
                    <td className="py-2 text-right font-semibold">{fmt(item.total)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            <div className="flex justify-end gap-4 text-sm border-t border-gray-100 pt-3">
              <div className="text-right">
                <p className="text-text-muted">Subtotal: {fmt(viewOrder.subtotal)}</p>
                {Number(viewOrder.discount) > 0 && <p className="text-text-muted">Desconto: -{fmt(viewOrder.discount)}</p>}
                <p className="text-lg font-bold text-brand-orange">Total: {fmt(viewOrder.total)}</p>
              </div>
            </div>

            {viewOrder.notes && <p className="text-sm text-text-muted bg-surface rounded-lg p-3">{viewOrder.notes}</p>}

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              {viewOrder.status === 'aberto' && (
                <button onClick={() => handleStatusChange(viewOrder, 'cancelado')} className="btn-danger text-xs">Cancelar Pedido</button>
              )}
              {statusFlow[viewOrder.status] && (
                <button onClick={() => handleStatusChange(viewOrder, statusFlow[viewOrder.status])} className="btn-primary text-xs ml-auto">
                  {statusFlow[viewOrder.status] === 'andamento' ? 'Iniciar Andamento' : '✓ Marcar como Entregue'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Pedido" size="xl">
        <NewOrderModal onClose={() => setModalOpen(false)} onSave={() => { setModalOpen(false); load() }} />
      </Modal>

      <ConfirmDialog
        open={!!deleteOrder}
        onClose={() => setDeleteOrder(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Excluir pedido ${deleteOrder?.order_number}?`}
        message="Esta ação não pode ser desfeita."
      />
    </Layout>
  )
}
