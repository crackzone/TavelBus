import { useContext } from 'react'
import { ToastContext, type ToastInput } from '../components/feedback/toast-context.ts'

export function useToast(): { push: (toast: ToastInput) => void } {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider.')
  }
  return context
}
