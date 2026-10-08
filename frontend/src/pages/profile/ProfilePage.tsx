import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { useSession } from '../../features/auth/useSession.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { formatDateTime } from '../../lib/format.ts'
import { roleLabel } from '../../lib/roles.ts'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useSession()
  useDocumentTitle('Profile · TravelBus Manager')

  if (!user) return null

  const phone = user.phone?.trim() ? user.phone : 'Not provided'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profile"
        description="Account details for the signed-in session."
        actions={<StatusBadge status={user.is_active ? 'ACTIVE' : 'INACTIVE'} />}
      />
      <dl className="grid gap-4 rounded-sm border border-line bg-surface p-4 text-sm shadow-panel sm:grid-cols-2">
        <Field term="Name" value={user.name} />
        <Field term="Role" value={roleLabel(user.role)} />
        <Field term="Email" value={user.email} />
        <Field term="Phone" value={phone} />
        <Field term="Signed up" value={formatDateTime(user.created_at)} />
      </dl>
      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            logout()
            navigate('/', { replace: true })
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  )
}

function Field({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{term}</dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  )
}
