import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDialogBehavior } from '../../hooks/useDialogBehavior.ts'

export function Drawer({
  id,
  open,
  title,
  onClose,
  children,
}: {
  id?: string
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDialogBehavior(open, onClose, panelRef)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-navy/40" onClick={onClose} aria-hidden="true" />
      <div
        id={id}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-[min(100%,20rem)] flex-col bg-navy text-white outline-none"
      >
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <h2 id={titleId} className="text-sm font-semibold">
            {title}
          </h2>
          <button type="button" className="focus-ring-light min-h-11 rounded-sm px-3 text-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
