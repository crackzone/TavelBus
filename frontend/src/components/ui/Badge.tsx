import type { ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

const toneClass: Record<BadgeTone, string> = {
  neutral: 'border-line bg-canvas text-ink',
  info: 'border-transparent bg-brand-soft text-brand',
  success: 'border-transparent bg-success-soft text-success',
  warning: 'border-transparent bg-warning-soft text-warning',
  danger: 'border-transparent bg-danger-soft text-danger',
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={cx('inline-flex min-h-6 items-center rounded-sm border px-2 text-xs font-medium', toneClass[tone])}>
      {children}
    </span>
  )
}
