import { useEffect, useState } from 'react'
import { usersAPI, companiesAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Pencil, Trash2, Users as UsersIcon, RefreshCw, Building2 } from 'lucide-react'

function UserForm({ onSubmit, defaultValues, loading, companyList, companiesLoading, showCompanyField }) {
  const schema = z.object({
    name: z.string().min(1, 'Nome obrigatório'),
    email: z.string().email('Email inválido'),
    password: defaultValues
      ? z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal(''))
      : z.string().min(6, 'Mínimo 6 caracteres'),
    is_active: z.boolean().optional(),
    company_id: showCompanyField && !defaultValues
      ? z.string().min(1, 'Selecione a empresa')
      : z.string().optional(),
  })

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues
      ? { ...defaultValues }
      : { is_active: true },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {showCompanyField && !defaultValues && (
        <div>
          <label className="label">Empresa *</label>
          <select {...register('company_id')} className="input" disabled={companiesLoading}>
            <option value="">{companiesLoading ? 'Carregando...' : 'Selecione a empresa...'}</option>
            {companyList.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.company_id && <p className="text-red-500 text-xs mt-1">{errors.company_id.message}</p>}
        </div>
      )}
      <div>
        <label className="label">Nome *</label>
        <input {...register('name')} className="input" placeholder="Nome completo" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className="label">Email *</label>
        <input {...register('email')} type="email" className="input" placeholder="email@empresa.com" />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <label className="label">{defaultValues ? 'Nova Senha (deixe vazio para não alterar)' : 'Senha *'}</label>
        <input {...register('password')} type="password" className="input" placeholder="••••••" />
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
      </div>
      {defaultValues && (
        <label className="flex items-center gap-3">
          <input {...register('is_active')} type="checkbox" className="accent-brand-orange w-4 h-4" />
          <span className="text-sm">Conta ativa</span>
        </label>
      )}
      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

export default function Users() {
  const { user: me, isSuperAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [deleteUser, setDeleteUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [companyList, setCompanyList] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [companyFilter, setCompanyFilter] = useState('')
  const perPage = 15

  const load = async () => {
    setLoading(true)
    try {
      const params = { page, per_page: perPage }
      if (isSuperAdmin && companyFilter) params.company_id = companyFilter
      const { data } = await usersAPI.list(params)
      setUsers(data.items)
      setTotal(data.total)
    } catch {
      toast.error('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  const loadCompanies = async ({ silent = false } = {}) => {
    if (!isSuperAdmin) return
    setCompaniesLoading(true)
    try {
      const { data } = await companiesAPI.list({ per_page: 100 })
      setCompanyList(data.items || [])
    } catch {
      if (!silent) toast.error('Erro ao carregar empresas')
    } finally {
      setCompaniesLoading(false)
    }
  }

  useEffect(() => { load() }, [page, companyFilter])
  useEffect(() => { if (isSuperAdmin) loadCompanies({ silent: true }) }, [isSuperAdmin])
  useEffect(() => { if (modalOpen && isSuperAdmin) loadCompanies() }, [modalOpen])

  const handleSave = async (values) => {
    setSaving(true)
    try {
      const payload = { ...values, role: 'company_admin' }
      if (!payload.password) delete payload.password
      if (!payload.company_id) delete payload.company_id
      if (editUser) {
        await usersAPI.update(editUser.id, payload)
        toast.success('Cliente atualizado!')
      } else {
        await usersAPI.create(payload)
        toast.success('Cliente criado!')
      }
      setModalOpen(false)
      setEditUser(null)
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
      await usersAPI.delete(deleteUser.id)
      toast.success('Cliente excluído!')
      setDeleteUser(null)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / perPage)
  const colSpan = isSuperAdmin ? 5 : 4

  return (
    <Layout title="Clientes">
      <div className="card">
        <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <p className="text-sm text-text-muted whitespace-nowrap">{total} cliente{total !== 1 ? 's' : ''}</p>
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-text-muted shrink-0" />
                <select
                  value={companyFilter}
                  onChange={e => { setCompanyFilter(e.target.value); setPage(1) }}
                  className="input py-1.5 text-sm min-w-[180px]"
                >
                  <option value="">Todas as empresas</option>
                  {companyList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
            {isSuperAdmin && (
              <button onClick={() => { setEditUser(null); setModalOpen(true) }} className="btn-primary">
                <Plus size={16} /> Novo Cliente
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Nome</th>
                <th className="table-header">Email</th>
                {isSuperAdmin && <th className="table-header">Empresa</th>}
                <th className="table-header">Status</th>
                <th className="table-header">Último acesso</th>
                <th className="table-header w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(colSpan + 2)].map((_, j) => (
                    <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={colSpan + 2}>
                  <EmptyState icon={UsersIcon} title="Nenhum cliente" description="Adicione clientes para dar acesso ao sistema" />
                </td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-surface transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">
                        {u.name}{u.id === me?.id && <span className="text-xs text-text-muted ml-1">(você)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell text-text-muted">{u.email}</td>
                  {isSuperAdmin && (
                    <td className="table-cell text-xs text-text-muted">
                      {companyList.find(c => c.id === u.company_id)?.name || '—'}
                    </td>
                  )}
                  <td className="table-cell">
                    <span className={u.is_active ? 'badge-ativo' : 'badge-inativo'}>{u.is_active ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="table-cell text-xs text-text-muted">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString('pt-BR') : 'Nunca'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditUser(u); setModalOpen(true) }} className="p-1.5 rounded-lg hover:bg-navy-900/10 text-navy-800 transition-colors"><Pencil size={14} /></button>
                      {isSuperAdmin && u.id !== me?.id && (
                        <button onClick={() => setDeleteUser(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
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
            <p className="text-xs text-text-muted">{total} clientes</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Anterior</button>
              <span className="text-xs self-center">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Próximo</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditUser(null) }} title={editUser ? 'Editar Cliente' : 'Novo Cliente'}>
        <UserForm
          onSubmit={handleSave}
          defaultValues={editUser}
          loading={saving}
          companyList={companyList}
          companiesLoading={companiesLoading}
          showCompanyField={isSuperAdmin}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Excluir "${deleteUser?.name}"?`}
        message="O cliente perderá todo o acesso ao sistema."
      />
    </Layout>
  )
}
