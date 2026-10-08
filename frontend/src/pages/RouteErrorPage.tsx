import { Brand } from '../components/navigation/Brand.tsx'
import { ErrorState } from '../components/feedback/ErrorState.tsx'
import { ButtonLink } from '../components/ui/Button.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function RouteErrorPage() {
  useDocumentTitle('Page unavailable · TravelBus Manager')
  return (
    <div className="min-h-dvh bg-canvas px-4 py-10 text-ink">
      <div className="mx-auto max-w-lg">
        <Brand />
        <div className="mt-8">
          <ErrorState
            heading="h1"
            title="This page could not be opened"
            message="An unexpected problem stopped this screen from loading."
            action={<ButtonLink to="/">Back to home</ButtonLink>}
          />
        </div>
      </div>
    </div>
  )
}
