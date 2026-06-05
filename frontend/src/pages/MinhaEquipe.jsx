import { useEffect, useState } from 'react'
import { usersAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { Users, UserCheck, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const roleBadge = {
  company_admin: 'bg-navy-800/10 text-navy-800',
  supervisor: 'bg-blue-100 text-blue-700',
  employee: 'bg-gray-100 text-gray-600',
}
const roleLabel = {
  company_admin: 'Gerente',
  supervisor: 'Supervisor',
  employee: 'Funcionário',
}

function Avatar({ name, size = 8 }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-bold shrink-0`}>
      {name?.charAt(0).toUpperCase()}
    </div>
  )
}

function UserCard({ user, sub }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-colors">
      <Avatar name={user.name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy-900 truncate">{user.name}</p>
        <p className="text-xs text-text-muted truncate">{user.email}</p>
        {sub && <p className="text-xs text-blue-500 mt-0.5">{sub}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge[user.role] || 'bg-gray-100 text-gray-500'}`}>
          {roleLabel[user.role] || user.role}
        </span>
        <span className={user.is_active ? 'badge-ativo text-xs' : 'badge-inativo text-xs'}>
          {user.is_active ? 'Ativo' : 'Inativo'}
        </span>
      </div>
    </div>
  )
}

function SupervisorGroup({ supervisor, employees }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-blue-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        <Avatar name={supervisor.name} size={9} />
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-bold text-navy-900 truncate">{supervisor.name}</p>
          <p className="text-xs text-text-muted truncate">{supervisor.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">Supervisor</span>
          <span className="text-xs text-text-muted bg-white border border-gray-200 px-2 py-0.5 rounded-full">
            {employees.length} funcionário{employees.length !== 1 ? 's' : ''}
          </span>
          {open ? <ChevronDown size={16} className="text-blue-500" /> : <ChevronRight size={16} className="text-blue-500" />}
        </div>
      </button>

      {open && (
        <div className="p-3 bg-white space-y-2">
          {employees.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">Nenhum funcionário vinculado a este supervisor</p>
          ) : (
            employees.map(emp => <UserCard key={emp.id} user={emp} />)
          )}
        </div>
      )}
    </div>
  )
}

// ─── Gerente view: supervisors grouped with their employees ───────────────────
function GerenteView({ users }) {
  const supervisors = users.filter(u => u.role === 'supervisor')
  const employees = users.filter(u => u.role === 'employee')
  const withoutSupervisor = employees.filter(e => !e.supervisor_id)

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Supervisores', value: supervisors.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Funcionários', value: employees.length, color: 'text-navy-900', bg: 'bg-gray-50' },
          { label: 'Total da equipe', value: supervisors.length + employees.length, color: 'text-brand-orange', bg: 'bg-orange-50' },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-text-muted mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Supervisors with their employees */}
      {supervisors.length === 0 ? (
        <div className="card text-center py-10 text-text-muted text-sm">
          Nenhum supervisor cadastrado ainda.
        </div>
      ) : (
        supervisors.map(sup => (
          <SupervisorGroup
            key={sup.id}
            supervisor={sup}
            employees={employees.filter(e => e.supervisor_id === sup.id)}
          />
        ))
      )}

      {/* Employees without supervisor */}
      {withoutSupervisor.length > 0 && (
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-4 bg-gray-50 flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            <p className="text-sm font-semibold text-gray-600">Sem supervisor</p>
            <span className="ml-auto text-xs text-text-muted bg-white border border-gray-200 px-2 py-0.5 rounded-full">
              {withoutSupervisor.length} funcionário{withoutSupervisor.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="p-3 space-y-2 bg-white">
            {withoutSupervisor.map(emp => <UserCard key={emp.id} user={emp} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Supervisor view: just their employees ────────────────────────────────────
function SupervisorView({ users }) {
  const employees = users.filter(u => u.role === 'employee')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{employees.length}</p>
          <p className="text-xs text-text-muted mt-1">Funcionários</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{employees.filter(e => e.is_active).length}</p>
          <p className="text-xs text-text-muted mt-1">Ativos</p>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="card text-center py-10 text-text-muted text-sm">
          Nenhum funcionário na sua equipe ainda.
        </div>
      ) : (
        <div className="card space-y-2">
          {employees.map(emp => <UserCard key={emp.id} user={emp} />)}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MinhaEquipe() {
  const { user: me, isSupervisor } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await usersAPI.list({ per_page: 200 })
      setUsers(data.items || [])
    } catch {
      toast.error('Erro ao carregar equipe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <Layout title="Minha Equipe">
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-text-muted">
          {isSupervisor ? 'Seus funcionários' : 'Visão completa da equipe'}
        </p>
        <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : isSupervisor ? (
        <SupervisorView users={users} />
      ) : (
        <GerenteView users={users} />
      )}
    </Layout>
  )
}
