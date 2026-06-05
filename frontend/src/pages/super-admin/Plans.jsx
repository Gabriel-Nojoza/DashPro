import { useEffect, useState } from 'react'
import { plansAPI, companiesAPI } from '@/api'
import Layout from '@/components/layout/Layout'
import toast from 'react-hot-toast'
import {
  MessageSquare, BarChart3, Bot, Brain, Check, Plus,
  Pencil, Trash2, Building2, Loader2, Zap, Tag,
  HardHat, UtensilsCrossed, Wrench, Heart, ShoppingBag, Truck, ChevronRight,
} from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// ─── Configuração visual dos planos ──────────────────────────────────────────

const PLAN_CONFIG = {
  conecta: {
    color: 'border-blue-200 bg-white',
    badge: 'bg-blue-100 text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    icon: MessageSquare,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    highlight: false,
    msgs: 500,
    excedente: 0.25,
    features: [
      'WhatsApp integrado',
      'Envio de relatórios automáticos',
      'Até 500 mensagens/mês',
      'Notificações em tempo real',
      'Suporte por chat',
    ],
    notIncluded: ['Dashboard Power BI / Excel', 'Chat Bot com IA', 'IA para análise de dados', 'Chat interno da empresa'],
    ideal: 'Pequenos negócios que querem automatizar a comunicação básica.',
  },
  gestao: {
    color: 'border-orange-300 bg-white',
    badge: 'bg-brand-orange/10 text-brand-orange',
    button: 'bg-brand-orange hover:bg-orange-600 text-white',
    icon: BarChart3,
    iconBg: 'bg-orange-100',
    iconColor: 'text-brand-orange',
    highlight: true,
    msgs: 1500,
    excedente: 0.20,
    features: [
      'Tudo do Conecta',
      'Dashboard Power BI ou Excel',
      'Até 1.500 mensagens/mês',
      'Indicadores em tempo real',
      'Exportação de relatórios',
    ],
    notIncluded: ['Chat Bot com IA', 'IA para análise de dados', 'Chat interno da empresa'],
    ideal: 'Gestores que precisam de visão de dados e indicadores do negócio.',
  },
  automacao: {
    color: 'border-purple-300 bg-white',
    badge: 'bg-purple-100 text-purple-700',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
    icon: Bot,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    highlight: false,
    msgs: 3000,
    excedente: 0.18,
    features: [
      'Tudo do Gestão',
      'Chat Bot com IA no WhatsApp',
      'Até 3.000 mensagens/mês',
      'Atendimento automático 24h',
      'Integração com fluxos de trabalho',
    ],
    notIncluded: ['IA para análise de dados', 'Chat interno da empresa'],
    ideal: 'Empresas que precisam automatizar atendimento fora do horário comercial.',
  },
  inteligencia: {
    color: 'border-navy-900 bg-navy-900',
    badge: 'bg-white/20 text-white',
    button: 'bg-white hover:bg-gray-100 text-navy-900',
    icon: Brain,
    iconBg: 'bg-white/15',
    iconColor: 'text-white',
    highlight: false,
    msgs: 10000,
    excedente: null,
    features: [
      'Tudo do Automação',
      'IA para análise de relatórios',
      'Chat interno da empresa',
      'Até 10.000 mensagens/mês (fair use)',
      'IA trabalhando nos seus dados',
      'Suporte prioritário',
    ],
    notIncluded: [],
    ideal: 'Empresas que querem IA trabalhando nos dados do negócio em tempo real.',
  },
}

// ─── Exemplos por setor ───────────────────────────────────────────────────────

const SECTORS = [
  {
    key: 'construcao', label: 'Construção', icon: HardHat, color: 'text-amber-600 bg-amber-50',
    examples: {
      conecta:     'Relatório diário de progresso da obra via WhatsApp para o cliente',
      gestao:      'Painel com custo por etapa e % de conclusão de cada projeto',
      automacao:   'Bot que agenda visitas de vistoria e responde fornecedores automaticamente',
      inteligencia:'IA que analisa o progresso e identifica risco de atrasos antes que aconteçam',
    },
  },
  {
    key: 'alimentacao', label: 'Alimentação', icon: UtensilsCrossed, color: 'text-red-600 bg-red-50',
    examples: {
      conecta:     'Envio do cardápio do dia e relatório de vendas diretamente pelo WhatsApp',
      gestao:      'Painel de vendas por prato, ticket médio e controle de estoque em tempo real',
      automacao:   'Bot que recebe pedidos, confirma reservas e responde dúvidas do cardápio 24h',
      inteligencia:'IA que monitora desperdício, identifica pratos lucrativos e sugere promoções',
    },
  },
  {
    key: 'manutencao', label: 'Manutenção', icon: Wrench, color: 'text-slate-600 bg-slate-50',
    examples: {
      conecta:     'Técnico envia relatório de visita via WhatsApp ao finalizar cada OS',
      gestao:      'Painel com OS abertas, tempo médio de atendimento e custo por chamado',
      automacao:   'Bot que recebe chamados e direciona automaticamente para o técnico certo',
      inteligencia:'IA que prevê falhas recorrentes e agenda manutenção preventiva com antecedência',
    },
  },
  {
    key: 'saude', label: 'Saúde', icon: Heart, color: 'text-rose-600 bg-rose-50',
    examples: {
      conecta:     'Lembretes automáticos de consulta e envio de resultados pelo WhatsApp',
      gestao:      'Dashboard de agenda, taxa de no-show e faturamento por especialidade',
      automacao:   'Bot de triagem que agenda consultas e responde dúvidas automaticamente',
      inteligencia:'IA que analisa histórico clínico e gera relatórios de acompanhamento do paciente',
    },
  },
  {
    key: 'varejo', label: 'Varejo', icon: ShoppingBag, color: 'text-green-600 bg-green-50',
    examples: {
      conecta:     'Promoções e confirmação de pedidos disparadas pelo WhatsApp automaticamente',
      gestao:      'Painel de estoque, ticket médio e os produtos mais vendidos do período',
      automacao:   'Bot que rastreia pedidos, processa trocas e responde clientes 24h',
      inteligencia:'IA que prevê demanda, evita ruptura de estoque e sugere reposição automática',
    },
  },
  {
    key: 'logistica', label: 'Logística', icon: Truck, color: 'text-blue-600 bg-blue-50',
    examples: {
      conecta:     'Confirmação de entrega e notificação automática ao cliente via WhatsApp',
      gestao:      'Painel com rotas, tempo médio de entrega e custo por km rodado',
      automacao:   'Bot que rastreia entregas e reagenda automaticamente em caso de falha',
      inteligencia:'IA que otimiza rotas, reduz combustível e analisa desempenho da frota',
    },
  },
]

const PLAN_ORDER = ['conecta', 'gestao', 'automacao', 'inteligencia']
const PLAN_LABELS = { conecta: 'Conecta', gestao: 'Gestão', automacao: 'Automação', inteligencia: 'Inteligência' }
const STATUS_LABELS = { active: 'Ativo', trial: 'Trial', suspended: 'Suspenso', cancelled: 'Cancelado' }

// ─── Card de plano ────────────────────────────────────────────────────────────

function PlanCard({ plan, companies, activeSector, onEdit, onDelete }) {
  const cfg = PLAN_CONFIG[plan.slug] || PLAN_CONFIG.conecta
  const Icon = cfg.icon
  const companyCount = companies.filter(c => c.plan === plan.slug).length
  const isDark = plan.slug === 'inteligencia'
  const sector = SECTORS.find(s => s.key === activeSector)
  const example = sector?.examples[plan.slug]

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 ${cfg.color} p-6 shadow-sm transition-all hover:shadow-card-hover ${cfg.highlight ? 'scale-[1.02] shadow-lg' : ''}`}>
      {cfg.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 bg-brand-orange text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            ⭐ Mais escolhido
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.iconBg}`}>
          <Icon size={20} className={cfg.iconColor} />
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(plan)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-navy-900'}`}>
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(plan)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/60 hover:text-red-300' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit mb-3 ${cfg.badge}`}>{plan.name}</span>

      <p className={`text-3xl font-black mb-1 ${isDark ? 'text-white' : 'text-navy-900'}`}>
        {fmt(plan.price_monthly)}
        <span className={`text-sm font-normal ml-1 ${isDark ? 'text-white/60' : 'text-text-muted'}`}>/mês</span>
      </p>
      <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-text-muted'}`}>
        ou {fmt(plan.price_monthly * 12 * 0.85)}/ano (15% OFF)
      </p>

      {/* Mensagens */}
      <div className={`flex items-center gap-2 text-xs font-semibold mt-2 mb-4 px-3 py-2 rounded-xl ${isDark ? 'bg-white/10 text-white' : 'bg-surface text-navy-900'}`}>
        <MessageSquare size={13} />
        {cfg.msgs >= 10000 ? '10.000 msgs/mês (fair use)' : `${cfg.msgs.toLocaleString('pt-BR')} msgs/mês`}
        {cfg.excedente && <span className={`ml-auto ${isDark ? 'text-white/50' : 'text-text-muted'}`}>+R${cfg.excedente.toFixed(2)}/excedente</span>}
      </div>

      {/* Exemplo por setor */}
      {example && (
        <div className={`text-xs p-3 rounded-xl mb-4 leading-relaxed ${isDark ? 'bg-white/10 text-white/80' : 'bg-surface text-navy-900'}`}>
          <span className={`font-semibold block mb-1 ${isDark ? 'text-white/60' : 'text-text-muted'}`}>
            Exemplo em {sector.label}:
          </span>
          {example}
        </div>
      )}

      {/* Features */}
      <ul className="space-y-2 flex-1 mb-5">
        {cfg.features.map((f, i) => (
          <li key={i} className={`flex items-start gap-2 text-xs ${isDark ? 'text-white/80' : 'text-navy-900'}`}>
            <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
        {cfg.notIncluded.map((f, i) => (
          <li key={`n${i}`} className={`flex items-start gap-2 text-xs ${isDark ? 'text-white/25' : 'text-gray-300'}`}>
            <span className="w-[13px] shrink-0 text-center mt-0.5">—</span>
            {f}
          </li>
        ))}
      </ul>

      {/* Ideal para */}
      <p className={`text-xs italic mb-4 ${isDark ? 'text-white/50' : 'text-text-muted'}`}>
        Ideal para: {cfg.ideal}
      </p>

      {/* Empresas neste plano */}
      <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
        <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-white/50' : 'text-text-muted'}`}>
          <Building2 size={12} />
          <span><strong className={isDark ? 'text-white' : 'text-navy-900'}>{companyCount}</strong> empresa{companyCount !== 1 ? 's' : ''} neste plano</span>
        </div>
        {companyCount > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {companies.filter(c => c.plan === plan.slug).slice(0, 3).map(c => (
              <span key={c.id} className={`text-[10px] px-2 py-0.5 rounded-full font-medium truncate max-w-[110px] ${isDark ? 'bg-white/10 text-white/70' : 'bg-surface text-navy-900'}`}>
                {c.name}
              </span>
            ))}
            {companyCount > 3 && <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-text-muted'}`}>+{companyCount - 3}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal criar/editar ───────────────────────────────────────────────────────

function PlanModal({ plan, onClose, onSaved }) {
  const isEdit = !!plan?.id
  const [form, setForm] = useState({
    name: plan?.name || '',
    slug: plan?.slug || '',
    description: plan?.description || '',
    price_monthly: plan?.price_monthly ?? '',
    max_users: plan?.max_users ?? 9999,
    max_clients: plan?.max_clients ?? 9999,
    max_products: plan?.max_products ?? 9999,
    has_whatsapp: plan?.has_whatsapp ?? true,
    has_reports: plan?.has_reports ?? true,
    has_api: plan?.has_api ?? false,
    is_active: plan?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, price_monthly: parseFloat(form.price_monthly) || 0 }
      if (isEdit) { await plansAPI.update(plan.id, payload); toast.success('Plano atualizado!') }
      else { await plansAPI.create(payload); toast.success('Plano criado!') }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-navy-900">{isEdit ? 'Editar Plano' : 'Novo Plano'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 text-sm">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Nome</label><input value={form.name} onChange={e => set('name', e.target.value)} className="input" required /></div>
            <div><label className="label">Slug</label><input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase())} className="input" required disabled={isEdit} /></div>
          </div>
          <div><label className="label">Descrição curta</label><input value={form.description} onChange={e => set('description', e.target.value)} className="input" placeholder="Ex: WhatsApp + relatórios automáticos" /></div>
          <div><label className="label">Preço mensal (R$)</label><input type="number" step="0.01" min="0" value={form.price_monthly} onChange={e => set('price_monthly', e.target.value)} className="input" required /></div>
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Funcionalidades</p>
            {[
              { key: 'has_whatsapp', label: 'WhatsApp + bot PDF' },
              { key: 'has_reports',  label: 'Dashboard / Relatórios' },
              { key: 'has_api',      label: 'IA e API avançada' },
              { key: 'is_active',    label: 'Plano ativo' },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!form[item.key]} onChange={e => set(item.key, e.target.checked)} className="w-4 h-4 accent-brand-orange" />
                <span className="text-sm text-navy-900">{item.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : isEdit ? 'Salvar' : 'Criar plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Plans() {
  const [plans, setPlans] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [activeSector, setActiveSector] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const plansRes = await plansAPI.list()
      const sorted = [...(plansRes.data || [])].sort((a, b) => Number(a.price_monthly) - Number(b.price_monthly))
      setPlans(sorted)
    } catch { toast.error('Erro ao carregar planos') }

    try {
      const companiesRes = await companiesAPI.list({ per_page: 100 })
      setCompanies(companiesRes.data?.items || [])
    } catch { /* silencioso */ }

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (plan) => {
    const count = companies.filter(c => c.plan === plan.slug).length
    if (count > 0) { toast.error(`Este plano tem ${count} empresa(s). Mude-as antes de excluir.`); return }
    if (!confirm(`Excluir o plano "${plan.name}"?`)) return
    try { await plansAPI.delete(plan.id); toast.success('Plano excluído'); load() }
    catch { toast.error('Erro ao excluir') }
  }

  return (
    <Layout title="Planos">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-muted">{plans.length} planos disponíveis · {companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastradas</p>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo Plano
        </button>
      </div>

      {/* Filtro por setor */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
          Ver exemplos por setor
        </p>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map(s => {
            const Icon = s.icon
            const isActive = activeSector === s.key
            return (
              <button
                key={s.key}
                onClick={() => setActiveSector(isActive ? null : s.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isActive
                    ? `${s.color} border-current shadow-sm`
                    : 'bg-white border-gray-200 text-text-muted hover:border-gray-300'
                }`}
              >
                <Icon size={13} />
                {s.label}
              </button>
            )
          })}
          {activeSector && (
            <button onClick={() => setActiveSector(null)} className="px-3 py-2 rounded-xl text-xs text-text-muted hover:text-navy-900 transition-colors">
              Limpar ×
            </button>
          )}
        </div>
      </div>

      {/* Cards de plano */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="h-[560px] rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              companies={companies}
              activeSector={activeSector}
              onEdit={p => setModal(p)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Aviso de desconto anual */}
      <div className="card bg-navy-900 text-white mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
          <Tag size={20} className="text-brand-orange" />
        </div>
        <div className="flex-1">
          <p className="font-bold">Desconto no plano anual</p>
          <p className="text-sm text-blue-200 mt-0.5">Todos os planos têm <strong className="text-white">15% de desconto</strong> no pagamento anual. Mensagens excedentes são cobradas no mês seguinte conforme a tabela de cada plano.</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-white/50 uppercase tracking-wide">Excedentes por mensagem</p>
          <div className="flex gap-3 mt-1 text-sm font-semibold">
            <span className="text-blue-300">R$0,25</span>
            <span className="text-brand-orange">R$0,20</span>
            <span className="text-purple-300">R$0,18</span>
            <span className="text-white/40">fair use</span>
          </div>
          <p className="text-[10px] text-white/30 mt-0.5">Conecta · Gestão · Automação · Inteligência</p>
        </div>
      </div>

      {/* Empresas por plano */}
      {!loading && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-base font-bold text-navy-900">Empresas por Plano</h3>
            <p className="text-sm text-text-muted mt-1">Distribuição atual das empresas cadastradas.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-surface/70">
                <tr>
                  <th className="table-header">Empresa</th>
                  <th className="table-header">Plano</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Desde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companies.length === 0 ? (
                  <tr><td colSpan={4} className="table-cell text-center text-text-muted py-10">Nenhuma empresa cadastrada</td></tr>
                ) : companies.map(c => {
                  const cfg = PLAN_CONFIG[c.plan]
                  return (
                    <tr key={c.id} className="hover:bg-surface transition-colors">
                      <td className="table-cell font-medium text-navy-900">{c.name}</td>
                      <td className="table-cell">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg?.badge || 'bg-gray-100 text-gray-500'}`}>
                          {PLAN_LABELS[c.plan] || c.plan}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          c.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          c.status === 'trial'  ? 'bg-orange-100 text-orange-700'  :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </td>
                      <td className="table-cell text-text-muted text-sm">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <PlanModal
          plan={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </Layout>
  )
}
