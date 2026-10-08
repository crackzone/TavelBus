import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { LoadingSkeleton } from '../components/feedback/LoadingSkeleton.tsx'
import { driverNav } from '../app/navigation.ts'
import { Brand } from '../components/navigation/Brand.tsx'
import { MobileNavigation } from '../components/navigation/MobileNavigation.tsx'
import { NavLinkItem } from '../components/navigation/NavLinkItem.tsx'
import { SessionActions } from '../components/navigation/SessionActions.tsx'
import { SkipLink } from '../components/navigation/SkipLink.tsx'

export function DriverLayout() {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <SkipLink />
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex min-h-16 max-w-2xl items-center justify-between gap-4 px-4">
          <Brand />
          <SessionActions />
        </div>
        <nav aria-label="Driver" className="mx-auto hidden max-w-2xl gap-1 px-2 lg:flex">
          {driverNav.map((item) => (
            <NavLinkItem key={item.label} item={item} />
          ))}
        </nav>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-2xl px-4 py-5 pb-28 outline-none lg:pb-10">
        <Suspense fallback={<LoadingSkeleton lines={6} label="Loading page" />}>
          <Outlet />
        </Suspense>
      </main>
      <MobileNavigation label="Driver" items={driverNav} className="lg:hidden" />
    </div>
  )
}
