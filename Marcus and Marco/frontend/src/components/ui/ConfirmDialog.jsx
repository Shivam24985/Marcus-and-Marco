export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', variant = 'danger' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 animate-scale-in p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">{title}</h3>
        <p className="text-sm text-surface-600 dark:text-surface-400 mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={variant === 'danger' ? 'btn-danger text-sm' : 'btn-primary text-sm'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
