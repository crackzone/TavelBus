import { SessionActions } from './SessionActions.tsx'

export function Topbar({
  title,
  onMenu,
  menuOpen = false,
  menuId,
}: {
  title: string
  onMenu?: () => void
  menuOpen?: boolean
  menuId?: string
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-line bg-surface px-4">
      <div className="flex items-center gap-2">
        {onMenu ? (
          <button
            type="button"
            className="focus-ring inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-medium lg:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-haspopup="dialog"
            onClick={onMenu}
          >
            Menu
          </button>
        ) : null}
        <p className="text-sm font-semibold text-navy">{title}</p>
      </div>
      <SessionActions />
    </header>
  )
}
