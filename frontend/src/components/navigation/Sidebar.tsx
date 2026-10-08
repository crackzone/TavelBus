import { cx } from '../../lib/cx.ts'
import { Brand } from './Brand.tsx'
import { NavLinkItem } from './NavLinkItem.tsx'
import type { NavItem } from './types.ts'

export function Sidebar({
  label,
  items,
  onNavigate,
  visible = 'always',
  className,
}: {
  label: string
  items: readonly NavItem[]
  onNavigate?: () => void
  visible?: 'always' | 'desktop'
  className?: string
}) {
  return (
    <aside
      className={cx(
        visible === 'desktop' ? 'hidden lg:flex' : 'flex',
        'min-h-0 flex-col bg-navy text-white',
        className,
      )}
    >
      <div className="px-3 py-4">
        <Brand tone="light" />
      </div>
      <nav aria-label={label} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-6">
        {items.map((item) => (
          <NavLinkItem key={item.label} item={item} inverted orientation="vertical" onNavigate={onNavigate} />
        ))}
      </nav>
    </aside>
  )
}
