import { userRoles, type UserRole } from '../../types/common.ts'

export type LoginField = 'email' | 'password'
export type RegisterField = 'name' | 'email' | 'phone' | 'password' | 'role'
export type FieldErrors<Field extends string> = Partial<Record<Field, string>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isUserRole(value: string): value is UserRole {
  return userRoles.some((role) => role === value)
}

export function validateLogin(input: { email: string; password: string }): FieldErrors<LoginField> {
  const errors: FieldErrors<LoginField> = {}
  const email = input.email.trim()
  if (!email) errors.email = 'Enter your email.'
  else if (!emailPattern.test(email)) errors.email = 'Enter a valid email address.'
  if (!input.password) errors.password = 'Enter your password.'
  return errors
}

export function validateRegister(input: {
  name: string
  email: string
  phone: string
  password: string
  role: string
}): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = {}
  const name = input.name.trim()
  const email = input.email.trim()
  const phone = input.phone.trim()

  if (name.length < 2) errors.name = 'Name must be at least 2 characters.'
  else if (name.length > 100) errors.name = 'Name must be 100 characters or fewer.'

  if (!email) errors.email = 'Enter your email.'
  else if (!emailPattern.test(email)) errors.email = 'Enter a valid email address.'

  if (phone.length > 20) errors.phone = 'Phone must be 20 characters or fewer.'

  if (input.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  else if (input.password.length > 128) errors.password = 'Password must be 128 characters or fewer.'

  if (!isUserRole(input.role)) errors.role = 'Choose passenger, driver, or administrator.'

  return errors
}

export function firstField<Field extends string>(errors: FieldErrors<Field>): Field | undefined {
  const [field] = Object.keys(errors)
  return field as Field | undefined
}

export function focusField(id: string | undefined): void {
  if (!id) return
  document.getElementById(id)?.focus()
}
