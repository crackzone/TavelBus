import type { ChatRequest, ChatResponse } from '../types/assistant.ts'
import { apiRequest } from './client.ts'

export function sendChat(body: ChatRequest): Promise<ChatResponse> {
  return apiRequest<ChatResponse>('/api/v1/assistant/chat', { method: 'POST', body })
}
