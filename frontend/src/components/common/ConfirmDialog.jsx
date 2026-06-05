import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Confirmar ação" size="sm">
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle size={22} className="text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-navy-900">{title}</p>
          <p className="text-sm text-text-muted mt-1">{message}</p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger flex-1 justify-center">
            {loading ? 'Aguarde...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
