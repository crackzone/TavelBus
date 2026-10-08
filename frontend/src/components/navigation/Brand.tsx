import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx.ts'

export function Brand({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const light = tone === 'light'
  return (
    <Link
      to="/"
      className={cx(
        'focus-ring inline-flex min-h-11 items-center gap-2 rounded-sm font-semibold',
        light ? 'focus-ring-light text-white' : 'text-navy',
      )}
    >
      <span
        aria-hidden="true"
        className={cx('grid size-8 place-items-center text-xs', light ? 'bg-white text-navy' : 'bg-navy text-white')}
      >
        TB
      </span>
      <span>TravelBus</span>
    </Link>
  )
}
