import { createContext } from 'react'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export type ToastInput = {
  title: string
  description?: string
  tone?: ToastTone
}

export type ToastContextValue = {
  push: (toast: ToastInput) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
