import { ErrorState } from '../components/feedback/ErrorState.tsx'
import { ButtonLink } from '../components/ui/Button.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function UnauthorizedPage() {
  useDocumentTitle('Sign in required · TravelBus Manager')
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <ErrorState
        heading="h1"
        title="Sign in required"
        message="Sign in is required before this page can open."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/login">Sign in</ButtonLink>
            <ButtonLink to="/" variant="secondary">
              Back to home
            </ButtonLink>
          </div>
        }
      />
    </div>
  )
}
