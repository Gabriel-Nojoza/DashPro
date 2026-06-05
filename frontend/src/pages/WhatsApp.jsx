import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  AlertTriangle, Bot, CheckCircle2, Loader2, MessageSquare,
  RefreshCw, Send, Wifi, WifiOff, Users, Search,
  PhoneOff, QrCode, RotateCcw, UserCheck, Hash,
  Phone, Smartphone,
} from 'lucide-react'

import { whatsappAPI } from '@/api'

function UsageCard({ usage }) {
  if (!usage) return null
  const pct = Math.min(usage.pct_used, 100)
  const isOver = usage.is_over_limit
  const isWarn = pct >= 80

  return (
    <div className={`card border-2 ${isOver ? 'border-red-300 bg-red-50/30' : isWarn ? 'border-amber-300 bg-amber-50/30' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-navy-900 text-sm">Consumo de Mensagens — {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
        {isOver && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">Limite atingido</span>}
        {isWarn && !isOver && <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">⚠ 80% usado</span>}
      </div>

      <div className="flex items-end gap-2 mb-2">
        <span className="text-3xl font-black text-navy-900">{usage.count}</span>
        <span className="text-text-muted text-sm mb-1">/ {usage.total_limit} msgs</span>
        {usage.extra_credits > 0 && (
          <span className="text-xs text-emerald-600 font-semibold mb-1">(+{usage.extra_credits} créditos extras)</span>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-surface rounded-xl p-3">
          <p className="text-text-muted">Restante</p>
          <p className={`font-bold text-base mt-0.5 ${isOver ? 'text-red-600' : 'text-navy-900'}`}>{usage.remaining} msgs</p>
        </div>
        <div className="bg-surface rounded-xl p-3">
          <p className="text-text-muted">Excedente gerado</p>
          <p className={`font-bold text-base mt-0.5 ${usage.extra_msgs_used > 0 ? 'text-red-600' : 'text-navy-900'}`}>
            {usage.extra_msgs_used > 0
              ? `${usage.extra_msgs_used} msgs = R$ ${usage.extra_cost.toFixed(2)}`
              : '—'}
          </p>
        </div>
      </div>

      {isOver && (
        <div className="mt-3 p-3 bg-red-100 rounded-xl text-xs text-red-700">
          <strong>Limite mensal atingido.</strong> Mensagens extras serão cobradas a R$ {usage.extra_msg_price.toFixed(2)}/msg no fechamento do mês. Entre em contato com o administrador para adicionar créditos.
        </div>
      )}
      {isWarn && !isOver && (
        <div className="mt-3 p-3 bg-amber-50 rounded-xl text-xs text-amber-700">
          Você está usando {pct}% do limite. Ao atingir 100%, mensagens extras serão cobradas a R$ {usage.extra_msg_price.toFixed(2)}/msg.
        </div>
      )}
    </div>
  )
}
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'

const botStatusMap = {
  online: {
    label: 'Funcionando',
    className: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  },
  attention: {
    label: 'Atencao',
    className: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
  inactive: {
    label: 'Inativo',
    className: 'bg-slate-100 text-slate-600 border border-slate-200',
  },
  unconfigured: {
    label: 'Pendente',
    className: 'bg-blue-100 text-blue-700 border border-blue-200',
  },
}

function SummaryCard({ icon: Icon, label, value, helper, tone = 'navy' }) {
  const toneClasses = {
    navy: 'bg-navy-900 text-white',
    orange: 'bg-brand-orange text-white',
    white: 'bg-white text-navy-900 border border-gray-100',
  }

  return (
    <div className={`rounded-2xl p-5 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs uppercase tracking-[0.18em] ${tone === 'white' ? 'text-text-muted' : 'text-white/70'}`}>{label}</p>
          <p className="text-3xl font-black mt-2">{value}</p>
          <p className={`text-sm mt-2 ${tone === 'white' ? 'text-text-muted' : 'text-white/75'}`}>{helper}</p>
        </div>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tone === 'white' ? 'bg-surface text-brand-orange' : 'bg-white/12 text-white'}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function BotStatusBadge({ status }) {
  const config = botStatusMap[status] || botStatusMap.attention
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  )
}

function fmtUptime(seconds) {
  if (!seconds && seconds !== 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

function fmtDatetime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function AdminOverview({ overview, loading, refreshing, onRefresh }) {
  const companies = overview?.companies || []
  const checkedAt = overview?.bot_checked_at
    ? new Date(overview.bot_checked_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--'

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-36 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="card h-[420px] animate-pulse bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="rounded-[28px] bg-gradient-to-br from-navy-900 via-[#0b2d5e] to-[#081a35] text-white p-6 shadow-lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
              <Bot size={14} />
              Bot WhatsApp — Baileys
            </div>
            <h2 className="text-3xl font-black mt-4">
              {overview?.bot_connected ? 'Bot conectado e operando' : 'Bot offline ou aguardando'}
            </h2>
            <p className="text-sm text-blue-100 mt-3 leading-6">
              {overview?.bot_message || 'Sem retorno do bot no momento.'}
            </p>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-white/60 text-xs uppercase tracking-[0.14em]">Uptime</p>
                <p className="text-lg font-bold mt-1">{fmtUptime(overview?.uptime_seconds)}</p>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-white/60 text-xs uppercase tracking-[0.14em]">Ultima conexao</p>
                <p className="text-sm font-bold mt-1">{fmtDatetime(overview?.last_connected_at)}</p>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-white/60 text-xs uppercase tracking-[0.14em]">Grupos ativos</p>
                <p className="text-lg font-bold mt-1">{overview?.joined_groups ?? 0} / {overview?.configured_groups ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/8 border border-white/10 p-4 min-w-[220px]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${overview?.bot_connected ? 'bg-emerald-500/25 text-emerald-200' : 'bg-red-500/25 text-red-200'}`}>
                {overview?.bot_connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                {overview?.bot_connected ? 'Online' : 'Offline'}
              </div>
            </div>
            <div className="space-y-2 text-sm text-blue-100">
              <div className="flex justify-between">
                <span className="text-white/60">Empresas</span>
                <span className="font-semibold">{overview?.summary?.total_companies ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Funcionando</span>
                <span className="font-semibold text-emerald-300">{overview?.summary?.online_companies ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Pendentes</span>
                <span className="font-semibold text-amber-300">
                  {(overview?.summary?.inactive_companies ?? 0) + (overview?.summary?.unconfigured_companies ?? 0)}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-xs text-white/50">Atualizado às {checkedAt}</p>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-navy-900 px-3 py-2 text-xs font-semibold hover:bg-slate-100 transition-colors disabled:opacity-60"
              >
                {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Company table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-navy-900">Status por empresa</h3>
          <p className="text-sm text-text-muted mt-1">Situação do bot e notificações configuradas em cada empresa.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="border-b border-gray-100 bg-surface/70">
              <tr>
                <th className="table-header">Empresa</th>
                <th className="table-header">Status do Bot</th>
                <th className="table-header">Destino configurado</th>
                <th className="table-header">Notificações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companies.length === 0 && (
                <tr>
                  <td colSpan={4} className="table-cell text-center text-text-muted py-10">Nenhuma empresa cadastrada</td>
                </tr>
              )}
              {companies.map((company) => (
                <tr key={company.company_id} className="hover:bg-surface transition-colors align-top">
                  <td className="table-cell">
                    <p className="font-semibold text-navy-900">{company.company_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize bg-navy-900/8 text-navy-900">
                        {company.plan}
                      </span>
                      {!company.whatsapp_active && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                          WhatsApp desligado
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="table-cell">
                    <BotStatusBadge status={company.bot_status} />
                    <p className="text-xs text-text-muted mt-1.5 leading-5">{company.bot_message}</p>
                    {company.bot_group_name && (
                      <p className="text-xs text-emerald-600 mt-1">✓ {company.bot_group_name}</p>
                    )}
                  </td>

                  <td className="table-cell">
                    {company.group_id ? (
                      <div>
                        <p className="text-xs text-text-muted uppercase tracking-wide">Grupo</p>
                        <p className="text-sm font-medium text-navy-900 break-all mt-0.5">
                          {company.bot_group_name || company.group_id}
                        </p>
                      </div>
                    ) : company.phone_number ? (
                      <div>
                        <p className="text-xs text-text-muted uppercase tracking-wide">Número</p>
                        <p className="text-sm font-medium text-navy-900 mt-0.5">{company.phone_number}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted">Não configurado</p>
                    )}
                  </td>

                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${company.send_daily_report ? 'bg-brand-orange/10 text-brand-orange' : 'bg-gray-100 text-gray-400'}`}>
                        Diário
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${company.send_low_stock_alert ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                        Estoque
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${company.send_order_delivered ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                        Pedido
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function WhatsApp() {
  const { isSuperAdmin } = useAuth()
  const [, setSettings] = useState(null)
  const [status, setStatus] = useState(null)
  const [adminOverview, setAdminOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [refreshingAdmin, setRefreshingAdmin] = useState(false)
  const [usage, setUsage] = useState(null)
  const [botStatus, setBotStatus] = useState(null)
  const [botQr, setBotQr] = useState(null)
  const [botGroups, setBotGroups] = useState([])
  const [botContacts, setBotContacts] = useState([])
  const [botLoading, setBotLoading] = useState(true)
  const [botRefreshing, setBotRefreshing] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const { register, handleSubmit, reset, setValue, watch } = useForm()
  const selectedGroupId = watch('group_id')
  const selectedPhone = watch('phone_number')
  const selectedGroup = botGroups.find((group) => group.id === selectedGroupId)
  const selectedContact = botContacts.find((contact) => contact.phone === selectedPhone)

  const loadCompanySettings = async () => {
    setLoading(true)
    try {
      const { data } = await whatsappAPI.getSettings()
      setSettings(data)
      reset(data)
    } catch {
      toast.error('Erro ao carregar configuracoes')
    } finally {
      setLoading(false)
    }
  }

  const loadAdminOverview = async (silent = false) => {
    if (silent) setRefreshingAdmin(true)
    else setLoading(true)

    try {
      const { data } = await whatsappAPI.adminOverview()
      setAdminOverview(data)
    } catch {
      toast.error('Erro ao carregar status do bot')
    } finally {
      if (silent) setRefreshingAdmin(false)
      else setLoading(false)
    }
  }

  const loadBotWorkspace = async (silent = false) => {
    if (silent) setBotRefreshing(true)
    else setBotLoading(true)

    try {
      const [statusResponse, qrResponse, groupsResponse, contactsResponse] = await Promise.all([
        whatsappAPI.botStatus(),
        whatsappAPI.botQr(),
        whatsappAPI.botGroups(),
        whatsappAPI.botContacts(),
      ])

      setBotStatus(statusResponse.data)
      setBotQr(qrResponse.data)
      setBotGroups(groupsResponse.data.items || [])
      setBotContacts(contactsResponse.data.items || [])
    } catch {
      toast.error('Erro ao carregar integracao do bot')
    } finally {
      if (silent) setBotRefreshing(false)
      else setBotLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin) loadAdminOverview()
    else {
      loadCompanySettings()
      loadBotWorkspace()
      whatsappAPI.getMyUsage().then(r => setUsage(r.data)).catch(() => {})
    }
  }, [isSuperAdmin, reset])

  const handleSave = async (values) => {
    setSaving(true)
    try {
      const { data } = await whatsappAPI.updateSettings(values)
      setSettings(data)
      toast.success('Configuracoes salvas!')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleCheckStatus = async () => {
    setCheckingStatus(true)
    try {
      const { data } = await whatsappAPI.status()
      setStatus(data)
    } catch {
      setStatus({ connected: false, message: 'Falha ao consultar status' })
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleSend = async (event) => {
    event.preventDefault()
    if (!phone || !message) return toast.error('Preencha o numero e a mensagem')

    setSending(true)
    try {
      await whatsappAPI.send({ phone, message })
      toast.success('Mensagem enviada!')
      setPhone('')
      setMessage('')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar')
    } finally {
      setSending(false)
    }
  }

  const handleSendReport = async () => {
    try {
      await whatsappAPI.sendReport()
      toast.success('Relatorio enviado!')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar relatorio')
    }
  }

  const handleUseGroup = (group) => {
    setValue('group_id', group.id, { shouldDirty: true })
    toast.success(`Grupo ${group.subject} selecionado. Salve as configuracoes.`)
  }

  const handleUseContact = (contact) => {
    setValue('phone_number', contact.phone, { shouldDirty: true })
    toast.success(`Numero ${contact.phone} selecionado. Salve as configuracoes.`)
  }

  const filteredContacts = botContacts.filter((contact) => {
    if (!contactSearch.trim()) return true
    const query = contactSearch.trim().toLowerCase()
    return contact.name.toLowerCase().includes(query)
      || contact.phone.toLowerCase().includes(query)
      || contact.id.toLowerCase().includes(query)
  })

  if (isSuperAdmin) {
    return (
      <Layout title="WhatsApp">
        <AdminOverview
          overview={adminOverview}
          loading={loading}
          refreshing={refreshingAdmin}
          onRefresh={() => loadAdminOverview(true)}
        />
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout title="WhatsApp">
        <div className="space-y-5">
          <div className="card h-64 animate-pulse bg-gray-100" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="card h-48 animate-pulse bg-gray-100" />
            <div className="card h-48 animate-pulse bg-gray-100" />
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="WhatsApp">
      <div className="space-y-5">

        {/* ── Bloco principal: QR Code do Bot ────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-orange/10 rounded-xl flex items-center justify-center">
                <QrCode size={18} className="text-brand-orange" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900">QR Code do Bot WhatsApp</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Gerencie a conexão do bot e escaneie o QR para parear o WhatsApp.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                botStatus?.connected
                  ? 'bg-emerald-100 text-emerald-700'
                  : botQr?.available
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-500'
              }`}>
                {botStatus?.connected
                  ? <><Wifi size={12} /> Conectado</>
                  : botQr?.available
                    ? <><QrCode size={12} /> Aguardando leitura</>
                    : <><WifiOff size={12} /> Desconectado</>}
              </span>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-navy-900/5 text-navy-900">
                Automático
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-0">
            {/* Left: info + buttons + settings */}
            <div className="xl:col-span-2 p-6 space-y-5">
              {/* Info fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: Smartphone, label: 'Slot do WhatsApp',  value: 'Bot Principal' },
                  { icon: Phone,      label: 'Número conectado',   value: botStatus?.connected ? 'Conectado' : '—' },
                  { icon: Hash,       label: 'Estado',             value: botStatus?.state || '—' },
                ].map(item => (
                  <div key={item.label} className="bg-surface rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon size={13} className="text-text-muted" />
                      <p className="text-xs text-text-muted uppercase tracking-wide">{item.label}</p>
                    </div>
                    <p className="text-sm font-bold text-navy-900">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={checkingStatus}
                  className="btn-secondary flex items-center gap-2"
                >
                  {checkingStatus ? <Loader2 size={14} className="animate-spin" /> : <WifiOff size={14} />}
                  Ver status
                </button>
                <button
                  type="button"
                  onClick={() => loadBotWorkspace(true)}
                  disabled={botRefreshing}
                  className="btn-primary flex items-center gap-2"
                >
                  {botRefreshing ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                  Gerar QR
                </button>
                <button
                  type="button"
                  onClick={() => loadBotWorkspace(true)}
                  disabled={botRefreshing}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RotateCcw size={14} /> Trocar celular
                </button>
                <button
                  type="button"
                  onClick={() => loadBotWorkspace(true)}
                  disabled={botRefreshing}
                  className="btn-secondary flex items-center gap-2"
                >
                  <UserCheck size={14} /> Sincronizar contatos
                </button>
              </div>

              {/* Settings form */}
              <form onSubmit={handleSubmit(handleSave)} className="space-y-4 pt-4 border-t border-gray-100">
                <input type="hidden" {...register('phone_number')} />
                <input type="hidden" {...register('group_id')} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-surface rounded-xl p-4">
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Grupo selecionado</p>
                    <p className="text-sm font-semibold text-navy-900">
                      {selectedGroup?.subject || selectedGroupId || 'Nenhum grupo'}
                    </p>
                    {selectedGroupId && <p className="text-[11px] text-text-muted mt-1 break-all">{selectedGroupId}</p>}
                  </div>
                  <div className="bg-surface rounded-xl p-4">
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Contato selecionado</p>
                    <p className="text-sm font-semibold text-navy-900">
                      {selectedContact?.name || selectedPhone || 'Nenhum contato'}
                    </p>
                    {selectedPhone && <p className="text-[11px] text-text-muted mt-1">{selectedPhone}</p>}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Notificações automáticas</p>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { name: 'send_daily_report',    label: 'Relatório diário' },
                      { name: 'send_low_stock_alert', label: 'Estoque baixo' },
                      { name: 'send_order_delivered', label: 'Pedido entregue' },
                    ].map(item => (
                      <label key={item.name} className="flex items-center gap-2 cursor-pointer">
                        <input {...register(item.name)} type="checkbox" className="accent-brand-orange w-4 h-4" />
                        <span className="text-sm text-navy-900">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input {...register('is_active')} type="checkbox" className="accent-brand-orange w-4 h-4" />
                    <span className="text-sm font-semibold text-navy-900">Integração ativa</span>
                  </label>
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar configurações'}
                  </button>
                </div>
              </form>
            </div>

            {/* Right: QR Code preview */}
            <div className="xl:border-l border-t xl:border-t-0 border-gray-100 p-6 flex flex-col items-center justify-center bg-surface/40">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-4">Preview do QR Code</p>
              {botLoading ? (
                <div className="w-48 h-48 rounded-2xl bg-gray-100 animate-pulse" />
              ) : botQr?.available && botQr?.qr_ascii ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <pre className="font-mono text-[6px] leading-[6px] text-black whitespace-pre select-none">
                    {botQr.qr_ascii}
                  </pre>
                  {botQr.last_qr_at && (
                    <p className="text-[10px] text-text-muted text-center mt-3">
                      Atualizado às {new Date(botQr.last_qr_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              ) : (
                <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3">
                  {botStatus?.connected
                    ? <><CheckCircle2 size={32} className="text-emerald-500" /><p className="text-xs text-emerald-600 font-semibold text-center">Bot conectado ao WhatsApp</p></>
                    : <><QrCode size={32} className="text-gray-300" /><p className="text-xs text-text-muted text-center">Clique em "Gerar QR" para exibir o código</p></>
                  }
                </div>
              )}
              <p className="text-[10px] text-text-muted text-center mt-4 max-w-[180px]">
                Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo
              </p>
            </div>
          </div>
        </div>

        {/* ── Consumo de mensagens ────────────────────────────────────── */}
        <UsageCard usage={usage} />

        {/* ── Grupos e Contatos ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Grupos */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-navy-900" />
                <h3 className="font-bold text-navy-900">Grupos</h3>
                <span className="text-xs font-semibold text-text-muted bg-surface px-2 py-0.5 rounded-full">{botGroups.length}</span>
              </div>
              <button type="button" onClick={() => loadBotWorkspace(true)} disabled={botRefreshing} className="btn-secondary text-xs py-1.5">
                {botRefreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              </button>
            </div>
            <div className="divide-y divide-gray-50 max-h-[400px] overflow-auto">
              {botGroups.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center px-6">
                  <Users size={28} className="text-gray-200 mb-2" />
                  <p className="text-sm font-semibold text-navy-900">Nenhum grupo encontrado</p>
                  <p className="text-xs text-text-muted mt-1">Conecte o bot e clique em Sincronizar.</p>
                </div>
              ) : botGroups.map(group => (
                <div key={group.id} className={`flex items-center gap-3 px-5 py-3.5 hover:bg-surface transition-colors ${selectedGroupId === group.id ? 'bg-brand-orange/5 border-l-2 border-brand-orange' : ''}`}>
                  <div className="w-9 h-9 rounded-xl bg-navy-900/5 flex items-center justify-center shrink-0">
                    <Users size={15} className="text-navy-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{group.subject}</p>
                    <p className="text-[11px] text-text-muted truncate">{group.id}</p>
                  </div>
                  <button type="button" onClick={() => handleUseGroup(group)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${selectedGroupId === group.id ? 'bg-brand-orange text-white' : 'bg-surface hover:bg-navy-900/10 text-navy-900'}`}>
                    {selectedGroupId === group.id ? 'Selecionado' : 'Usar'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Contatos */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-navy-900" />
                <h3 className="font-bold text-navy-900">Contatos</h3>
                <span className="text-xs font-semibold text-text-muted bg-surface px-2 py-0.5 rounded-full">{filteredContacts.length}</span>
              </div>
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="Buscar por nome ou número..."
                  className="input pl-8 text-sm py-2"
                />
              </div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[340px] overflow-auto">
              {filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center px-6">
                  <Phone size={28} className="text-gray-200 mb-2" />
                  <p className="text-sm font-semibold text-navy-900">
                    {contactSearch ? 'Nenhum resultado' : 'Nenhum contato sincronizado'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {contactSearch ? 'Tente outro termo.' : 'Conecte o bot para carregar os contatos.'}
                  </p>
                </div>
              ) : filteredContacts.map(contact => (
                <div key={contact.id} className={`flex items-center gap-3 px-5 py-3.5 hover:bg-surface transition-colors ${selectedPhone === contact.phone ? 'bg-brand-orange/5 border-l-2 border-brand-orange' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-navy-900/5 flex items-center justify-center shrink-0 text-sm font-bold text-navy-900">
                    {(contact.name || contact.phone)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{contact.name}</p>
                    <p className="text-xs text-text-muted">{contact.phone}</p>
                  </div>
                  <button type="button" onClick={() => handleUseContact(contact)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${selectedPhone === contact.phone ? 'bg-brand-orange text-white' : 'bg-surface hover:bg-navy-900/10 text-navy-900'}`}>
                    {selectedPhone === contact.phone ? 'Selecionado' : 'Usar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Enviar mensagem + Ações rápidas ────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="card">
            <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2">
              <Send size={16} className="text-brand-orange" /> Enviar mensagem manual
            </h3>
            <form onSubmit={handleSend} className="space-y-3">
              <div>
                <label className="label">Número (com DDD e código do país)</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="5585999999999" />
              </div>
              <div>
                <label className="label">Mensagem</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} className="input min-h-[90px] resize-none" placeholder="Digite sua mensagem..." />
              </div>
              <button type="submit" disabled={sending} className="btn-primary w-full justify-center">
                {sending ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : <><Send size={14} /> Enviar</>}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2">
              <Bot size={16} className="text-brand-orange" /> Ações rápidas
            </h3>
            <div className="space-y-3">
              <button onClick={handleSendReport} className="w-full flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:bg-surface transition-colors text-left group">
                <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center group-hover:bg-brand-orange/20 transition-colors">
                  <Send size={16} className="text-brand-orange" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">Enviar relatório diário agora</p>
                  <p className="text-xs text-text-muted">Envia para o grupo ou número configurado.</p>
                </div>
              </button>
              <button onClick={() => loadBotWorkspace(true)} disabled={botRefreshing} className="w-full flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:bg-surface transition-colors text-left group">
                <div className="w-10 h-10 bg-navy-900/5 rounded-xl flex items-center justify-center group-hover:bg-navy-900/10 transition-colors">
                  <RefreshCw size={16} className="text-navy-900" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">Sincronizar grupos e contatos</p>
                  <p className="text-xs text-text-muted">Atualiza a lista a partir do bot conectado.</p>
                </div>
              </button>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
