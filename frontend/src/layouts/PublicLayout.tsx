import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { PageSkeleton } from '../components/feedback/LoadingSkeleton.tsx'
import { Brand } from '../components/navigation/Brand.tsx'
import { SessionActions } from '../components/navigation/SessionActions.tsx'
import { SkipLink } from '../components/navigation/SkipLink.tsx'
import { ButtonLink } from '../components/ui/Button.tsx'
import { useSession } from '../features/auth/useSession.ts'

export function PublicLayout() {
  const { status, user, isSigningOut, finishSignOut } = useSession()

  useEffect(() => {
    if (isSigningOut) finishSignOut()
  }, [isSigningOut, finishSignOut])

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <SkipLink />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Brand />
          <nav aria-label="Account" className="flex items-center gap-2">
            {status === 'loading' ? (
              <p className="text-sm text-muted">Checking session</p>
            ) : user ? (
              <SessionActions />
            ) : (
              <>
                <ButtonLink to="/login" variant="ghost" size="sm">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/register" size="sm">
                  Create account
                </ButtonLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="outline-none">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>TravelBus Manager</p>
          <p>Intercity booking, trip operations, and arrival updates.</p>
        </div>
      </footer>
    </div>
  )
}
