import { ErrorState } from '../../components/feedback/ErrorState.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'

export function LoadFailure({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  return (
    <ErrorState
      title={title}
      message={getErrorMessage(error)}
      requestId={isApiError(error) ? error.requestId : undefined}
      action={
        <Button type="button" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  )
}
