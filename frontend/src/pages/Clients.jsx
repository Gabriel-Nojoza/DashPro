import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { clientsAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import StatusBadge from '@/components/common/StatusBadge'
import EmptyState from '@/components/common/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Search, Pencil, Trash2, Users, Phone, Mail, RefreshCw, Download } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  cpf_cnpj: z.string().optional(),
  status: z.enum(['ativo', 'potencial', 'inativo']),
  responsible: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
})

function ClientForm({ onSubmit, defaultValues, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || { status: 'ativo' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Nome *</label>
          <input {...register('name')} className="input" placeholder="Nome completo" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Telefone</label>
          <input {...register('phone')} className="input" placeholder="(11) 99999-9999" />
        </div>
        <div>
          <label className="label">Email</label>
          <input {...register('email')} type="email" className="input" placeholder="email@exemplo.com" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label">CPF / CNPJ</label>
          <input {...register('cpf_cnpj')} className="input" placeholder="000.000.000-00" />
        </div>
        <div>
          <label className="label">Status</label>
          <select {...register('status')} className="input">
            <option value="ativo">Ativo</option>
            <option value="potencial">Potencial</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
        <div>
          <label className="label">Responsável</label>
          <input {...register('responsible')} className="input" placeholder="Nome do responsável" />
        </div>
        <div>
          <label className="label">Cidade</label>
          <input {...register('city')} className="input" placeholder="São Paulo" />
        </div>
        <div>
          <label className="label">Estado</label>
          <input {...register('state')} className="input" placeholder="SP" maxLength={2} />
        </div>
        <div className="col-span-2">
          <label className="label">Observações</label>
          <textarea {...register('notes')} className="input min-h-[80px] resize-none" placeholder="Anotações sobre o cliente..." />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

export default function Clients() {
  const [clients, setClients] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [deleteClient, setDeleteClient] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const perPage = 15

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await clientsAPI.list({ page, per_page: perPage, search: search || undefined, status: statusFilter || undefined })
      setClients(data.items)
      setTotal(data.total)
    } catch {
      toast.error('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, search, statusFilter])

  const handleSave = async (values) => {
    setSaving(true)
    try {
      if (editClient) {
        await clientsAPI.update(editClient.id, values)
        toast.success('Cliente atualizado!')
      } else {
        await clientsAPI.create(values)
        toast.success('Cliente criado!')
      }
      setModalOpen(false)
      setEditClient(null)
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
      await clientsAPI.delete(deleteClient.id)
      toast.success('Cliente excluído!')
      setDeleteClient(null)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <Layout title="Clientes">
      <div className="card">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nome, email ou telefone..."
              className="input pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="input w-auto"
          >
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="potencial">Potencial</option>
            <option value="inativo">Inativo</option>
          </select>
          <button onClick={load} className="btn-secondary">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => { setEditClient(null); setModalOpen(true) }} className="btn-primary">
            <Plus size={16} /> Novo Cliente
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Nome</th>
                <th className="table-header hidden md:table-cell">Contato</th>
                <th className="table-header hidden lg:table-cell">Cidade</th>
                <th className="table-header">Status</th>
                <th className="table-header hidden md:table-cell">Responsável</th>
                <th className="table-header w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState icon={Users} title="Nenhum cliente encontrado" description="Crie seu primeiro cliente clicando em Novo Cliente" />
                </td></tr>
              ) : clients.map((c) => (
                <tr key={c.id} className="hover:bg-surface transition-colors">
                  <td className="table-cell font-medium">{c.name}</td>
                  <td className="table-cell hidden md:table-cell">
                    <div className="space-y-0.5">
                      {c.phone && <div className="flex items-center gap-1 text-xs text-text-muted"><Phone size={11} />{c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1 text-xs text-text-muted"><Mail size={11} />{c.email}</div>}
                    </div>
                  </td>
                  <td className="table-cell hidden lg:table-cell text-text-muted">{c.city}{c.state ? ` - ${c.state}` : ''}</td>
                  <td className="table-cell"><StatusBadge status={c.status} /></td>
                  <td className="table-cell hidden md:table-cell text-text-muted">{c.responsible || '—'}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditClient(c); setModalOpen(true) }}
                        className="p-1.5 rounded-lg hover:bg-navy-900/10 text-navy-800 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteClient(c)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-text-muted">Mostrando {clients.length} de {total} clientes</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Anterior</button>
              <span className="text-xs text-text-muted self-center">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Próximo</button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditClient(null) }}
        title={editClient ? 'Editar Cliente' : 'Novo Cliente'}
        size="lg"
      >
        <ClientForm onSubmit={handleSave} defaultValues={editClient} loading={saving} />
      </Modal>

      <ConfirmDialog
        open={!!deleteClient}
        onClose={() => setDeleteClient(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Excluir "${deleteClient?.name}"?`}
        message="Esta ação não pode ser desfeita. Pedidos vinculados a este cliente serão mantidos."
      />
    </Layout>
  )
}
