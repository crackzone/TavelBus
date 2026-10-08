import { ErrorState } from '../components/feedback/ErrorState.tsx'
import { ButtonLink } from '../components/ui/Button.tsx'
import { useSession } from '../features/auth/useSession.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { homeForRole } from '../lib/roles.ts'

export function ForbiddenPage() {
  useDocumentTitle('Access denied · TravelBus Manager')
  const { user } = useSession()
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <ErrorState
        heading="h1"
        title="Access denied"
        message="This account does not have access to the requested page."
        action={
          <ButtonLink to={user ? homeForRole(user.role) : '/'} variant="secondary">
            {user ? 'Go to your workspace' : 'Back to home'}
          </ButtonLink>
        }
      />
    </div>
  )
}
