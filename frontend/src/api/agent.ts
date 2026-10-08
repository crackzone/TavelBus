import { ApiError } from '../lib/api-error.ts'
import { isRecord } from '../lib/is-record.ts'
import type { AgentActionType } from '../types/common.ts'
import type { ActionConfirmRequest, ActionExecutionResult, ActionProposal, ActionProposalRequest } from '../types/assistant.ts'
import { apiRequest } from './client.ts'

export async function proposeAction(body: ActionProposalRequest): Promise<ActionProposal> {
  const payload = await apiRequest<unknown>('/api/v1/agent/tools/propose', { method: 'POST', body })
  return readProposal(payload)
}

export async function confirmAction(body: ActionConfirmRequest): Promise<ActionExecutionResult> {
  const payload = await apiRequest<unknown>('/api/v1/agent/tools/confirm', { method: 'POST', body })
  return readResult(payload)
}

function readProposal(payload: unknown): ActionProposal {
  if (!isRecord(payload)) throw shapeError('proposal')
  const expiresAt = payload.expires_at
  if (typeof payload.proposal_id !== 'string' || typeof payload.proposal_token !== 'string' || typeof payload.summary !== 'string') {
    throw shapeError('proposal')
  }
  if (typeof expiresAt !== 'string' || Number.isNaN(new Date(expiresAt).getTime())) throw shapeError('expiry')
  return {
    proposal_id: payload.proposal_id,
    proposal_token: payload.proposal_token,
    action_type: readActionType(payload.action_type),
    summary: payload.summary,
    expires_at: expiresAt,
    requires_confirmation: payload.requires_confirmation !== false,
  }
}

function readResult(payload: unknown): ActionExecutionResult {
  if (!isRecord(payload) || typeof payload.success !== 'boolean' || typeof payload.message !== 'string') {
    throw shapeError('result')
  }
  return {
    success: payload.success,
    action_type: readActionType(payload.action_type),
    message: payload.message,
    details: isRecord(payload.details) ? payload.details : {},
  }
}

function readActionType(value: unknown): AgentActionType {
  if (value === 'BOOK_TICKET' || value === 'CANCEL_BOOKING') return value
  throw shapeError('action type')
}

function shapeError(field: string): ApiError {
  return new ApiError({
    status: 422,
    code: 'RESPONSE_SHAPE',
    requestId: '',
    details: null,
    userMessage: `The confirmation response did not include a readable ${field}.`,
  })
}
