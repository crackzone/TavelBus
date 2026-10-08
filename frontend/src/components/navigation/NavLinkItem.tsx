import { Link, useLocation } from 'react-router-dom'
import { cx } from '../../lib/cx.ts'
import type { NavItem } from './types.ts'

export function NavLinkItem({
  item,
  onNavigate,
  inverted = false,
  orientation = 'horizontal',
}: {
  item: NavItem
  onNavigate?: () => void
  inverted?: boolean
  orientation?: 'horizontal' | 'vertical'
}) {
  const { pathname } = useLocation()
  const active = item.isActive(pathname)
  const Icon = item.icon
  const vertical = orientation === 'vertical'
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cx(
        inverted ? 'focus-ring-light' : 'focus-ring',
        'min-h-11 items-center gap-2 rounded-sm text-sm',
        vertical ? 'flex w-full border-l-2 px-3' : 'inline-flex border-b-2 px-3',
        inverted && active && 'border-white bg-white/10 font-semibold text-white',
        inverted && !active && 'border-transparent text-on-navy hover:bg-white/5 hover:text-white',
        !inverted && active && 'border-navy font-semibold text-navy',
        !inverted && !active && 'border-transparent text-muted hover:text-ink',
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}
