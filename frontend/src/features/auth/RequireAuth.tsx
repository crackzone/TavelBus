import type { ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/feedback/ErrorState.tsx'
import { PageSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { returnPath } from '../../lib/roles.ts'
import type { UserRole } from '../../types/common.ts'
import { useSession } from './useSession.ts'

export function RequireAuth({ role, children }: { role: UserRole; children: ReactNode }) {
  const location = useLocation()
  const session = useSession()

  if (session.status === 'loading') return <PageSkeleton />
  if (session.status === 'error') return <SessionError />
  if (!session.user) {
    if (session.isSigningOut) return <PageSkeleton />
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from }} />
  }
  if (session.user.role !== role) return <Navigate to="/forbidden" replace />
  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const location = useLocation()
  const session = useSession()
  if (session.status === 'loading') return <PageSkeleton />
  if (session.status === 'error') return <SessionError />
  if (session.user) return <Navigate to={returnPath(location.state, session.user.role)} replace />
  return children
}

function SessionError() {
  const navigate = useNavigate()
  const { error, retry, logout } = useSession()
  const requestId = isApiError(error) ? error.requestId : undefined

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <ErrorState
        heading="h1"
        title="Session check failed"
        message={getErrorMessage(error)}
        requestId={requestId}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={retry}>
              Try again
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Sign out
            </Button>
          </div>
        }
      />
    </div>
  )
}
