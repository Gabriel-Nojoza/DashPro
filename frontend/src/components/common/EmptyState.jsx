export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-surface border border-gray-100 flex items-center justify-center mb-4">
          <Icon size={28} className="text-gray-300" />
        </div>
      )}
      <p className="font-semibold text-navy-900">{title}</p>
      {description && <p className="text-sm text-text-muted mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
