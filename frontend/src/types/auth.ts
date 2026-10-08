import type { UserRole } from './common.ts'

export type User = {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export type RegisterRequest = {
  name: string
  email: string
  phone?: string | null
  password: string
  role?: UserRole
}

export type LoginRequest = {
  email: string
  password: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
  expires_in_minutes: number
  user: User
}
