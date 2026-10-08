import { Suspense, useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LoadingSkeleton } from '../components/feedback/LoadingSkeleton.tsx'
import { adminNav } from '../app/navigation.ts'
import { Sidebar } from '../components/navigation/Sidebar.tsx'
import { SkipLink } from '../components/navigation/SkipLink.tsx'
import { Topbar } from '../components/navigation/Topbar.tsx'
import { Drawer } from '../components/ui/Drawer.tsx'

const MENU_ID = 'admin-navigation'

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const openMenu = useCallback(() => setMenuOpen(true), [])

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <SkipLink />
      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Sidebar
          label="Administration"
          items={adminNav}
          visible="desktop"
          className="sticky top-0 h-dvh w-64"
        />
        <div className="min-w-0">
          <Topbar title="Administration" onMenu={openMenu} menuOpen={menuOpen} menuId={MENU_ID} />
          <main id="main" tabIndex={-1} className="min-w-0 px-4 py-6 outline-none lg:px-8">
            <Suspense fallback={<LoadingSkeleton lines={6} label="Loading page" />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      <Drawer id={MENU_ID} open={menuOpen} title="Menu" onClose={closeMenu}>
        <Sidebar label="Administration" items={adminNav} onNavigate={closeMenu} className="h-full w-full" />
      </Drawer>
    </div>
  )
}
