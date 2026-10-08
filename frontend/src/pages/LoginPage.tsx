import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/common/PageHeader.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Input } from '../components/ui/Input.tsx'
import { FormAlert } from '../features/auth/FormAlert.tsx'
import { useSession } from '../features/auth/useSession.ts'
import { firstField, focusField, validateLogin, type LoginField, type FieldErrors } from '../features/auth/validation.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { useToast } from '../hooks/useToast.ts'
import { getErrorMessage, isApiError } from '../lib/api-error.ts'
import { isRecord } from '../lib/is-record.ts'
import { returnPath } from '../lib/roles.ts'

export function LoginPage() {
  useDocumentTitle('Sign in · TravelBus Manager')
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useSession()
  const { push } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({})
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null)
  const [pending, setPending] = useState(false)
  const redirected = isRecord(location.state) && typeof location.state.from === 'string'

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateLogin({ email, password })
    setErrors(nextErrors)
    setFormError(null)
    const invalid = firstField(nextErrors)
    if (invalid) {
      focusField(invalid)
      return
    }

    setPending(true)
    try {
      const user = await login({ email: email.trim(), password })
      setPassword('')
      push({ title: 'Signed in', description: `Welcome, ${user.name}.`, tone: 'success' })
      navigate(returnPath(location.state, user.role), { replace: true })
    } catch (error) {
      setFormError({
        message: getErrorMessage(error),
        requestId: isApiError(error) ? error.requestId : undefined,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-12">
      <PageHeader
        title="Sign in"
        description={
          redirected
            ? 'Sign in to open that page.'
            : 'Use the email and password for your TravelBus account.'
        }
      />
      <form className="grid gap-4" onSubmit={onSubmit} noValidate aria-busy={pending}>
        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {formError ? <FormAlert message={formError.message} requestId={formError.requestId} /> : null}
        <Button type="submit" loading={pending}>
          Sign in
        </Button>
      </form>
      <p className="text-sm text-muted">
        New to TravelBus?{' '}
        <Link to="/register" className="focus-ring font-medium text-brand">
          Create an account
        </Link>
      </p>
    </div>
  )
}
