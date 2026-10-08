import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/common/PageHeader.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Select } from '../components/ui/Select.tsx'
import { FormAlert } from '../features/auth/FormAlert.tsx'
import { useSession } from '../features/auth/useSession.ts'
import {
  firstField,
  focusField,
  isUserRole,
  validateRegister,
  type FieldErrors,
  type RegisterField,
} from '../features/auth/validation.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { useToast } from '../hooks/useToast.ts'
import { getErrorMessage, isApiError } from '../lib/api-error.ts'
import { homeForRole } from '../lib/roles.ts'
import type { UserRole } from '../types/common.ts'

const roleOptions = [
  { value: 'PASSENGER', label: 'Passenger' },
  { value: 'DRIVER', label: 'Driver' },
  { value: 'ADMIN', label: 'Administrator' },
] as const

export function RegisterPage() {
  useDocumentTitle('Create account · TravelBus Manager')
  const navigate = useNavigate()
  const { register } = useSession()
  const { push } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('PASSENGER')
  const [errors, setErrors] = useState<FieldErrors<RegisterField>>({})
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateRegister({ name, email, phone, password, role })
    setErrors(nextErrors)
    setFormError(null)
    const invalid = firstField(nextErrors)
    if (invalid) {
      focusField(invalid)
      return
    }
    if (!isUserRole(role)) return

    const trimmedPhone = phone.trim()
    setPending(true)
    try {
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
      })
      setPassword('')
      push({ title: 'Account created', description: `Welcome, ${user.name}.`, tone: 'success' })
      navigate(homeForRole(user.role), { replace: true })
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
        title="Create account"
        description="Register as a passenger, driver, or administrator. The account service stores the role you choose."
      />
      <form className="grid gap-4" onSubmit={onSubmit} noValidate aria-busy={pending}>
        <Input
          id="name"
          label="Name"
          autoComplete="name"
          required
          value={name}
          error={errors.name}
          onChange={(event) => setName(event.target.value)}
        />
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
          id="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          hint="Optional. Up to 20 characters."
          value={phone}
          error={errors.phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <Input
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="8 to 128 characters."
          required
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Select
          id="role"
          label="Role"
          required
          value={role}
          options={roleOptions}
          error={errors.role}
          onChange={(event) => {
            if (isUserRole(event.target.value)) setRole(event.target.value)
          }}
        />
        {formError ? <FormAlert message={formError.message} requestId={formError.requestId} /> : null}
        <Button type="submit" loading={pending}>
          Create account
        </Button>
      </form>
      <p className="text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="focus-ring font-medium text-brand">
          Sign in
        </Link>
      </p>
    </div>
  )
}
