export default function StatusBadge({ status }) {
  const map = {
    ativo: 'badge-ativo',
    active: 'badge-ativo',
    inativo: 'badge-inativo',
    potencial: 'badge-potencial',
    aberto: 'badge-aberto',
    andamento: 'badge-andamento',
    entregue: 'badge-entregue',
    cancelado: 'badge-cancelado',
    trial: 'badge-potencial',
    suspended: 'badge-cancelado',
  }

  const labels = {
    ativo: 'Ativo', active: 'Ativo',
    inativo: 'Inativo',
    potencial: 'Potencial',
    aberto: 'Aberto',
    andamento: 'Em Andamento',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
    trial: 'Trial',
    suspended: 'Suspenso',
  }

  const cls = map[status] || 'badge-inativo'
  const label = labels[status] || status

  return <span className={cls}>{label}</span>
}
