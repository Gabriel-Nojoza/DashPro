import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '@/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(true)

  // Verify token against backend on mount — fixes stale role from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    authAPI.me()
      .then(({ data }) => {
        localStorage.setItem('user', JSON.stringify(data))
        setUser(data)
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // Sync auth state across browser tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'user') setUser(e.newValue ? JSON.parse(e.newValue) : null)
      if (e.key === 'token' && !e.newValue) setUser(null)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const isSuperAdmin = user?.role === 'super_admin'
  const isCompanyAdmin = user?.role === 'company_admin' || isSuperAdmin
  const isSupervisor = user?.role === 'supervisor'
  const isEmployee = !!user
  const companyRamo = user?.company_ramo || 'comercio'
  const isConstrucao = companyRamo === 'construcao'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isSuperAdmin, isCompanyAdmin, isSupervisor, isEmployee, companyRamo, isConstrucao }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
