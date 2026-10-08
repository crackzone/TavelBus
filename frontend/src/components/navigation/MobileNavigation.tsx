import { Link, useLocation } from 'react-router-dom'
import { cx } from '../../lib/cx.ts'
import type { NavItem } from './types.ts'

export function MobileNavigation({
  label,
  items,
  className,
}: {
  label: string
  items: readonly NavItem[]
  className?: string
}) {
  const { pathname } = useLocation()
  const columns = items.length >= 6 ? 'grid-cols-6' : items.length === 5 ? 'grid-cols-5' : 'grid-cols-4'
  return (
    <nav
      aria-label={label}
      className={cx('fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]', className)}
    >
      <ul className={cx('grid', columns)}>
        {items.map((item) => {
          const active = item.isActive(pathname)
          const Icon = item.icon
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'focus-ring flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] leading-none',
                  active ? 'font-semibold text-navy' : 'text-muted',
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                <span className="max-w-full truncate">{item.shortLabel}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
