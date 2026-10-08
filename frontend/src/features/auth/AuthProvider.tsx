import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCurrentUser, login as loginRequest, register as registerRequest } from '../../api/auth.ts'
import { setUnauthorizedHandler } from '../../api/client.ts'
import { queryKeys } from '../../api/query-keys.ts'
import { isApiError } from '../../lib/api-error.ts'
import { clearAccessToken, getAccessToken, setAccessToken } from '../../lib/token-store.ts'
import type { LoginRequest, RegisterRequest, User } from '../../types/auth.ts'
import { SessionContext, type SessionStatus } from './useSession.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [hasToken, setHasToken] = useState(() => getAccessToken() !== null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const sessionQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: getCurrentUser,
    enabled: hasToken,
    retry: false,
  })
  const { refetch } = sessionQuery

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setHasToken(false)
      queryClient.removeQueries({ queryKey: queryKeys.me })
    })
    return () => setUnauthorizedHandler(null)
  }, [queryClient])

  useEffect(() => {
    if (!hasToken) queryClient.clear()
  }, [hasToken, queryClient])

  const completeSignIn = useCallback(
    async (accessToken: string): Promise<User> => {
      setAccessToken(accessToken)
      try {
        const user = await getCurrentUser()
        queryClient.setQueryData(queryKeys.me, user)
        setHasToken(true)
        return user
      } catch (error) {
        clearAccessToken()
        setHasToken(false)
        queryClient.removeQueries({ queryKey: queryKeys.me })
        throw error
      }
    },
    [queryClient],
  )

  const login = useCallback(
    (body: LoginRequest) => loginRequest(body).then((response) => completeSignIn(response.access_token)),
    [completeSignIn],
  )

  const register = useCallback(
    (body: RegisterRequest) => registerRequest(body).then((response) => completeSignIn(response.access_token)),
    [completeSignIn],
  )

  const logout = useCallback(() => {
    clearAccessToken()
    setIsSigningOut(true)
    setHasToken(false)
  }, [])

  const finishSignOut = useCallback(() => {
    setIsSigningOut(false)
  }, [])

  const retry = useCallback(() => {
    void refetch()
  }, [refetch])

  const unauthorized = isApiError(sessionQuery.error) && sessionQuery.error.status === 401
  const status: SessionStatus = !hasToken || unauthorized
    ? 'anonymous'
    : sessionQuery.data
      ? 'authenticated'
      : sessionQuery.isError
        ? 'error'
        : 'loading'

  const value = useMemo(
    () => ({
      status,
      user: status === 'authenticated' ? (sessionQuery.data ?? null) : null,
      error: sessionQuery.error,
      isSigningOut,
      retry,
      login,
      register,
      logout,
      finishSignOut,
    }),
    [status, sessionQuery.data, sessionQuery.error, isSigningOut, retry, login, register, logout, finishSignOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
