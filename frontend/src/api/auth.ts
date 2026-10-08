import type { LoginRequest, RegisterRequest, TokenResponse, User } from '../types/auth.ts'
import { apiRequest } from './client.ts'

export function register(body: RegisterRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/api/v1/auth/register', {
    method: 'POST',
    body,
    auth: false,
  })
}

export function login(body: LoginRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body,
    auth: false,
  })
}

export function getCurrentUser(): Promise<User> {
  return apiRequest<User>('/api/v1/auth/me')
}
