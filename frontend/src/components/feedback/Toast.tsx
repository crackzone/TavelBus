import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../lib/cx.ts'
import { ToastContext, type ToastInput, type ToastTone } from './toast-context.ts'

type ToastRecord = {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

const toneClass: Record<ToastTone, string> = {
  info: 'border-line',
  success: 'border-success',
  warning: 'border-warning',
  danger: 'border-danger',
}

const toneLabel: Record<ToastTone, string> = {
  info: 'Notice',
  success: 'Success',
  warning: 'Warning',
  danger: 'Error',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timeouts = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const timeout = timeouts.current.get(id)
    if (timeout !== undefined) {
      window.clearTimeout(timeout)
      timeouts.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID()
      const toast: ToastRecord = {
        id,
        title: input.title,
        tone: input.tone ?? 'info',
        ...(input.description ? { description: input.description } : {}),
      }
      setToasts((current) => [...current, toast].slice(-4))
      const timeout = window.setTimeout(() => dismiss(id), 6000)
      timeouts.current.set(id, timeout)
    },
    [dismiss],
  )

  useEffect(() => {
    const activeTimeouts = timeouts.current
    return () => {
      for (const timeout of activeTimeouts.values()) window.clearTimeout(timeout)
    }
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role={toast.tone === 'danger' || toast.tone === 'warning' ? 'alert' : 'status'}
              className={cx(
                'pointer-events-auto w-full max-w-sm rounded-sm border bg-surface p-3 text-ink shadow-panel',
                toneClass[toast.tone],
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{toneLabel[toast.tone]}</p>
                  <p className="mt-1 text-sm font-semibold">{toast.title}</p>
                  {toast.description ? <p className="mt-1 text-sm text-muted">{toast.description}</p> : null}
                </div>
                <button type="button" className="focus-ring min-h-11 rounded-sm px-3 text-sm" onClick={() => dismiss(toast.id)}>
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
