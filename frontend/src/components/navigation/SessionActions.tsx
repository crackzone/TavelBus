import { useNavigate } from 'react-router-dom'
import { useSession } from '../../features/auth/useSession.ts'
import { roleLabel } from '../../lib/roles.ts'
import { Button, ButtonLink } from '../ui/Button.tsx'

export function SessionActions() {
  const navigate = useNavigate()
  const { status, user, logout } = useSession()

  if (status === 'loading') {
    return <p className="text-sm text-muted">Checking session</p>
  }

  if (!user) {
    return (
      <ButtonLink to="/login" variant="secondary" size="sm">
        Sign in
      </ButtonLink>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <p className="hidden min-w-0 items-baseline gap-2 text-sm sm:flex">
        <span className="max-w-36 truncate font-medium text-ink">{user.name}</span>
        <span className="sr-only">, </span>
        <span className="text-muted">{roleLabel(user.role)}</span>
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          logout()
          navigate('/', { replace: true })
        }}
      >
        Sign out
      </Button>
    </div>
  )
}
