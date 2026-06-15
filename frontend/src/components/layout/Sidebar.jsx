import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, Users, Package, BarChart3, ShoppingCart,
  MessageSquare, Settings, LogOut, Building2,
  CreditCard, Archive, UserCheck, HardHat, ClipboardList,
  DollarSign, Truck, FolderOpen, Car,
} from 'lucide-react'

// ─── Comércio ────────────────────────────────────────────────────────────────
const navItemsComercio = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clientes', roles: ['company_admin'] },
  { to: '/products', icon: Package, label: 'Produtos' },
  { to: '/stock', icon: Archive, label: 'Estoque' },
  { to: '/orders', icon: ShoppingCart, label: 'Pedidos' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
]

// navItemsAutomoveis é gerado dinamicamente no componente com base nos feature flags

// ─── Construção Civil ─────────────────────────────────────────────────────────
const navItemsConstrucao = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/obras', icon: HardHat, label: 'Obras' },
  { to: '/equipe-obra', icon: UserCheck, label: 'Equipe de Obra' },
  { to: '/orcamentos', icon: ClipboardList, label: 'Orçamentos' },
  { to: '/compras', icon: Truck, label: 'Compras & Estoque' },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/documentos-obra', icon: FolderOpen, label: 'Documentos' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
]

const superAdminItems = [
  { to: '/admin/companies', icon: Building2, label: 'Empresas' },
  { to: '/admin/plans', icon: CreditCard, label: 'Planos' },
]

export default function Sidebar() {
  const { user, logout, isSuperAdmin, isCompanyAdmin, isConstrucao, isAutomoveis, hasWhatsapp, hasRelatorios } = useAuth()
  const navigate = useNavigate()

  const navItemsAutomoveis = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/veiculos', icon: Car, label: 'Veículos' },
    { to: '/clients', icon: Users, label: 'Clientes' },
    { to: '/financeiro-auto', icon: DollarSign, label: 'Financeiro' },
    ...(hasRelatorios ? [{ to: '/reports', icon: BarChart3, label: 'Relatórios' }] : []),
    ...(hasWhatsapp ? [{ to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' }] : []),
  ]

  const baseNavItems = isConstrucao ? navItemsConstrucao : isAutomoveis ? navItemsAutomoveis : navItemsComercio
  const hiddenAdminRoutes = new Set(
    isConstrucao
      ? [] // construção não esconde nada para admin
      : ['/products', '/stock', '/orders']
  )

  const visibleNavItems = baseNavItems
    .filter((item) => !item.roles || item.roles.includes(user?.role))
    .filter((item) => (isCompanyAdmin ? !hiddenAdminRoutes.has(item.to) : true))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
          isActive
            ? 'bg-brand-orange text-white shadow-sm'
            : 'text-blue-200 hover:bg-navy-800 hover:text-white'
        }`
      }
    >
      <Icon size={18} className="shrink-0" />
      <span>{label}</span>
    </NavLink>
  )

  return (
    <aside className="w-64 min-h-screen bg-navy-900 flex flex-col fixed left-0 top-0 bottom-0 z-40">
      {/* Logo */}
      <div className="flex items-center justify-center px-6 py-5 border-b border-navy-800">
        <img src="/logo.png" alt="DashPro Business" className="h-10 object-contain" />
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-blue-300 text-xs truncate">{user?.company_name || 'Super Admin'}</p>
            {isConstrucao && (
              <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide">Construção Civil</span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {isSuperAdmin && (
          <>
            <div className="pt-4 pb-1 px-1">
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Super Admin</p>
            </div>
            {superAdminItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-navy-800 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-blue-200 hover:bg-red-600/20 hover:text-red-400 transition-all w-full"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
