import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const schema = z.object({
  email: z.string().min(1, 'E-mail obrigatorio').email('E-mail invalido'),
  password: z.string().min(1, 'Senha obrigatoria'),
  remember: z.boolean().optional(),
})

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: true },
  })

  const onSubmit = async ({ email, password }) => {
    try {
      const user = await login(email, password)
      toast.success(`Bem-vindo, ${user.name}!`)
      navigate(user.role === 'super_admin' ? '/admin/companies' : '/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail || 'E-mail ou senha incorretos'
      toast.error(msg)
    }
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundImage: "url('/banner-dashpro.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 6%',
      }}
    >
      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#ffffff',
          borderRadius: 18,
          padding: '40px 32px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 2 }}>Bem-vindo ao</p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#071B3A', margin: '0 0 6px' }}>
            DashPro <span style={{ color: '#FF6A00' }}>Business</span>
          </h1>
          <p style={{ fontSize: 12.5, color: '#94a3b8' }}>
            Faça login para acessar sua conta
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

          {/* Email */}
          <div style={{ position: 'relative' }}>
            <Mail size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              {...register('email')}
              type="email"
              placeholder="E-mail"
              autoComplete="email"
              className="input"
              style={{ height: 44, paddingLeft: 36, paddingRight: 12, borderRadius: 8, fontSize: 14 }}
            />
            {errors.email && <p style={{ marginTop: 3, fontSize: 11, color: '#ef4444' }}>{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <Lock size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              autoComplete="current-password"
              className="input"
              style={{ height: 44, paddingLeft: 36, paddingRight: 40, borderRadius: 8, fontSize: 14 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            {errors.password && <p style={{ marginTop: 3, fontSize: 11, color: '#ef4444' }}>{errors.password.message}</p>}
          </div>

          {/* Remember */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
              <input {...register('remember')} type="checkbox" style={{ accentColor: '#FF6A00', width: 14, height: 14 }} />
              <span style={{ fontSize: 12, color: '#475569' }}>Lembrar de mim</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: 4,
              height: 46,
              width: '100%',
              background: 'linear-gradient(135deg, #FF6A00 0%, #E83A00 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              borderRadius: 8,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.8 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 8px 24px rgba(255,106,0,0.35)',
              letterSpacing: '0.03em',
            }}
          >
            {isSubmitting ? (
              <><Loader2 size={16} className="animate-spin" /> Entrando...</>
            ) : 'Entrar'}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 20 }}>
          Não tem uma conta?{' '}
          <button
            type="button"
            onClick={() => toast('Entre em contato com o administrador.')}
            style={{ color: '#FF6A00', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12 }}
          >
            Fale com o administrador
          </button>
        </p>
      </div>
    </div>
  )
}
