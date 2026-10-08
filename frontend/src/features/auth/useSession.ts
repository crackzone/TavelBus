import { createContext, useContext } from 'react'
import type { LoginRequest, RegisterRequest, User } from '../../types/auth.ts'

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated' | 'error'

export type SessionContextValue = {
  status: SessionStatus
  user: User | null
  error: unknown
  retry: () => void
  isSigningOut: boolean
  login: (body: LoginRequest) => Promise<User>
  register: (body: RegisterRequest) => Promise<User>
  logout: () => void
  finishSignOut: () => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) {
    throw new Error('useSession must be used within AuthProvider.')
  }
  return value
}
