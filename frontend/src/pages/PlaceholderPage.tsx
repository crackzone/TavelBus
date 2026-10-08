import { EmptyState } from '../components/common/EmptyState.tsx'
import { PageHeader } from '../components/common/PageHeader.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  useDocumentTitle(`${title} · TravelBus Manager`)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <EmptyState
        title="No records on this screen"
        description="The navigation is ready. This workflow is not connected yet, so there is no data to show."
      />
    </div>
  )
}
