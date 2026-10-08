import { ErrorState } from '../components/feedback/ErrorState.tsx'
import { ButtonLink } from '../components/ui/Button.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function NotFoundPage() {
  useDocumentTitle('Page not found · TravelBus Manager')
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <ErrorState
        heading="h1"
        title="Page not found"
        message="That address is not part of TravelBus Manager."
        action={
          <ButtonLink to="/" variant="secondary">
            Back to home
          </ButtonLink>
        }
      />
    </div>
  )
}
