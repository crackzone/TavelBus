import type { AgentActionType } from './common.ts'

export type ChatRequest = {
  message: string
  conversation_id?: string | null
}

export type ChatResponse = {
  response: string
  intent: string
  data_context: Record<string, unknown> | null
}

export type ActionProposalRequest = {
  action_type: AgentActionType
  parameters: Record<string, unknown>
}

export type ActionProposal = {
  proposal_id: string
  proposal_token: string
  action_type: AgentActionType
  summary: string
  expires_at: string
  requires_confirmation: boolean
}

export type ActionConfirmRequest = {
  proposal_token: string
  confirmed: boolean
}

export type ActionExecutionResult = {
  success: boolean
  action_type: AgentActionType
  message: string
  details: Record<string, unknown>
}
