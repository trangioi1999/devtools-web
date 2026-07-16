import type { ToastMessage } from './useToast'

export function Toast({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50">
      {toasts.map((t) => (
        <div key={t.id} className="bg-slate-800 text-white text-sm px-3 py-1.5 rounded shadow-lg">
          {t.text}
        </div>
      ))}
    </div>
  )
}
