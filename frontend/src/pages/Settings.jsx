import { useEffect, useState } from 'react'
import { companiesAPI } from '@/api'
import { authAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Building2, Lock, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function Settings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPass, setSavingPass] = useState(false)

  const { register, handleSubmit, reset } = useForm()
  const { register: regPass, handleSubmit: handlePass, reset: resetPass, formState: { errors: passErrors } } = useForm()

  useEffect(() => {
    if (user?.role === 'super_admin') { setLoading(false); return }
    companiesAPI.me()
      .then((r) => reset(r.data))
      .catch(() => toast.error('Erro ao carregar empresa'))
      .finally(() => setLoading(false))
  }, [])

  const handleSaveCompany = async (values) => {
    setSaving(true)
    try {
      await companiesAPI.updateMe(values)
      toast.success('Dados atualizados!')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePass = async (values) => {
    if (values.new_password !== values.confirm_password) return toast.error('As senhas não coincidem')
    setSavingPass(true)
    try {
      await authAPI.changePassword({ current_password: values.current_password, new_password: values.new_password })
      toast.success('Senha alterada!')
      resetPass()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao alterar senha')
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <Layout title="Configurações">
      <div className="max-w-2xl space-y-6">
        {user?.role !== 'super_admin' && (
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center">
                <Building2 size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900">Dados da Empresa</h3>
                <p className="text-xs text-text-muted">Atualize as informações da sua empresa</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : (
              <form onSubmit={handleSubmit(handleSaveCompany)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Nome da Empresa</label>
                    <input {...register('name')} className="input" />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input {...register('email')} type="email" className="input" />
                  </div>
                  <div>
                    <label className="label">Telefone</label>
                    <input {...register('phone')} className="input" />
                  </div>
                  <div>
                    <label className="label">CNPJ</label>
                    <input {...register('cnpj')} className="input" />
                  </div>
                  <div>
                    <label className="label">Endereço</label>
                    <input {...register('address')} className="input" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center">
              <Lock size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-navy-900">Alterar Senha</h3>
              <p className="text-xs text-text-muted">Mantenha sua conta segura</p>
            </div>
          </div>

          <form onSubmit={handlePass(handleChangePass)} className="space-y-4">
            <div>
              <label className="label">Senha Atual</label>
              <input {...regPass('current_password', { required: true })} type="password" className="input" placeholder="••••••" />
            </div>
            <div>
              <label className="label">Nova Senha</label>
              <input {...regPass('new_password', { required: true, minLength: 6 })} type="password" className="input" placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="label">Confirmar Nova Senha</label>
              <input {...regPass('confirm_password', { required: true })} type="password" className="input" placeholder="Repita a nova senha" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingPass} className="btn-primary">
                {savingPass ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Alterar Senha'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
