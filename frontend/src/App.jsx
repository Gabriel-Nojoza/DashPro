import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Clients from '@/pages/Clients'
import Products from '@/pages/Products'
import Stock from '@/pages/Stock'
import Orders from '@/pages/Orders'
import Reports from '@/pages/Reports'
import WhatsApp from '@/pages/WhatsApp'
import Users from '@/pages/Users'
import MinhaEquipe from '@/pages/MinhaEquipe'
import Settings from '@/pages/Settings'
import Obras from '@/pages/construcao/Obras'
import EquipeObra from '@/pages/construcao/EquipeObra'
import DocumentosObra from '@/pages/construcao/DocumentosObra'
import Orcamentos from '@/pages/construcao/Orcamentos'
import Compras from '@/pages/construcao/Compras'
import Financeiro from '@/pages/construcao/Financeiro'
import Companies from '@/pages/super-admin/Companies'
import Plans from '@/pages/super-admin/Plans'

function getDefaultRoute(user) {
  if (!user) return '/login'
  return user.role === 'super_admin' ? '/admin/companies' : '/dashboard'
}

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user)} replace />
  }
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getDefaultRoute(user)} replace /> : <Login />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute roles={['super_admin', 'company_admin']}><Clients /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/whatsapp" element={<ProtectedRoute roles={['super_admin', 'company_admin', 'employee']}><WhatsApp /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={['super_admin','company_admin']}><Users /></ProtectedRoute>} />
      <Route path="/minha-equipe" element={<ProtectedRoute roles={['company_admin','supervisor']}><MinhaEquipe /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute roles={['super_admin','company_admin']}><Settings /></ProtectedRoute>} />

      {/* Construção Civil */}
      <Route path="/equipe-obra" element={<ProtectedRoute roles={['company_admin','supervisor']}><EquipeObra /></ProtectedRoute>} />
      <Route path="/documentos-obra" element={<ProtectedRoute><DocumentosObra /></ProtectedRoute>} />
      <Route path="/obras" element={<ProtectedRoute><Obras /></ProtectedRoute>} />
      <Route path="/orcamentos" element={<ProtectedRoute><Orcamentos /></ProtectedRoute>} />
      <Route path="/compras" element={<ProtectedRoute><Compras /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />

      {/* Super Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['super_admin']}>
            <Navigate to="/admin/companies" replace />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/companies" element={<ProtectedRoute roles={['super_admin']}><Companies /></ProtectedRoute>} />
      <Route path="/admin/plans" element={<ProtectedRoute roles={['super_admin']}><Plans /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to={getDefaultRoute(user)} replace />} />
      <Route path="*" element={<Navigate to={getDefaultRoute(user)} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
