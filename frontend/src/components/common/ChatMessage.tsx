import type { ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

export type ChatMessageKind = 'user' | 'assistant' | 'verified' | 'tracking' | 'policy' | 'proposal'

const LABELS: Record<ChatMessageKind, string> = {
  user: 'You',
  assistant: 'Assistant',
  verified: 'Verified backend data',
  tracking: 'Live tracking result',
  policy: 'Policy answer',
  proposal: 'Action proposal',
}

export function ChatMessage({ kind, content, children }: { kind: ChatMessageKind; content?: string; children?: ReactNode }) {
  const fromUser = kind === 'user'
  return (
    <article
      className={cx(
        'max-w-[40rem] rounded-sm border p-3',
        fromUser ? 'ml-auto border-navy bg-navy text-white' : 'bg-surface text-ink',
        kind === 'verified' && 'border-brand bg-brand-soft',
        kind === 'tracking' && 'border-success bg-success-soft',
        kind === 'policy' && 'border-line',
        kind === 'proposal' && 'border-warning bg-warning-soft',
        kind === 'assistant' && 'border-line',
      )}
    >
      <p className={cx('text-xs font-medium uppercase tracking-wide', fromUser ? 'text-white/80' : 'text-muted')}>
        {LABELS[kind]}
      </p>
      {content ? <p className="mt-2 whitespace-pre-wrap text-sm">{content}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
      {kind === 'proposal' ? <p className="mt-2 text-sm">This note does not confirm the action.</p> : null}
    </article>
  )
}
