import { Bell, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function Header({ title }) {
  const { user } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      <h1 className="text-lg font-bold text-navy-900">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-1.5 text-sm bg-surface border border-gray-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
          />
        </div>

        <button className="relative p-2 text-gray-500 hover:text-navy-900 hover:bg-surface rounded-lg transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-orange rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
          <div className="w-8 h-8 rounded-full bg-navy-900 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-navy-900 leading-tight">{user?.name}</p>
            <p className="text-xs text-text-muted capitalize leading-tight">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
