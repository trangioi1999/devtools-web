import { useCallback, useRef, useState } from 'react'

export interface ToastMessage {
  id: number
  text: string
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((text: string) => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, text }])
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, 2000)
  }, [])

  return { toasts, showToast }
}
