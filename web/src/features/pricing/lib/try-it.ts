/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import type { ChatCompletionRequest } from '@/features/playground/types'

import { EXCLUDED_GROUPS, QUOTA_TYPE_VALUES } from '../constants'
import type { PricingModel } from '../types'
import {
  isDynamicPricingModel,
  isUnconfiguredTaskUsageModel,
} from './dynamic-price'
import { getDisplayGroupRatio } from './model-helpers'

// ----------------------------------------------------------------------------
// "Try it" mini chat in the model dialog
// ----------------------------------------------------------------------------

export type TryMessage = { role: 'user' | 'assistant'; content: string }

export type TryUsage = { promptTokens: number; completionTokens: number }

export const TRY_DEFAULT_TEMPERATURE = 0.7

/** Keeps one try-out reply short; the customer pays for every token. */
export const TRY_MAX_TOKENS = 1024

export const TRY_MAX_INPUT_CHARS = 2000

// Odd, so the window of an alternating user/assistant history starts with a
// user message.
const TRY_MAX_HISTORY = 11

/** Endpoint types a chat conversation can be relayed through. */
const CHAT_ENDPOINT_TYPES = new Set([
  'openai',
  'openai-response',
  'openai-response-compact',
  'anthropic',
  'gemini',
])

/**
 * Whether the model can hold a chat conversation. Image, embedding, rerank and
 * video models list only their own endpoint types and cannot be tried in a chat
 * box; a model that lists none is given the benefit of the doubt.
 */
export function supportsTryChat(model: PricingModel): boolean {
  const types = model.supported_endpoint_types
  if (!types || types.length === 0) return true
  return types.some((type) => CHAT_ENDPOINT_TYPES.has(type))
}

/** Error code the relay returns when the balance cannot cover the request. */
export const INSUFFICIENT_QUOTA_CODE = 'insufficient_user_quota'

/**
 * Rough token count, as in the prototype: about four characters per token,
 * with CJK characters costing more. Only used until the reply reports real
 * usage.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  const cjk = (text.match(/[一-鿿]/g) ?? []).length
  const other = text.length - cjk
  return Math.max(1, Math.ceil(cjk * 0.6 + other / 4))
}

/** Estimated tokens of a conversation plus the message still being typed. */
export function estimateConversationTokens(
  messages: readonly TryMessage[],
  pendingInput: string
): { inputTokens: number; outputTokens: number } {
  let inputTokens = estimateTokens(pendingInput)
  let outputTokens = 0
  for (const message of messages) {
    if (message.role === 'user') {
      inputTokens += estimateTokens(message.content)
    } else {
      outputTokens += estimateTokens(message.content)
    }
  }
  return { inputTokens, outputTokens }
}

/** What one token or request costs, in USD-denominated credit. */
export type TryPricing =
  | { kind: 'token'; inputPerMillion: number; outputPerMillion: number }
  | { kind: 'request'; perRequest: number }

/**
 * The model's unit prices for the group the try-out is billed under, or null
 * when they cannot be stated as a single number (tiered or usage-schema
 * pricing), in which case no cost is shown.
 */
export function getTryPricing(
  model: PricingModel,
  group?: string
): TryPricing | null {
  if (isDynamicPricingModel(model) || isUnconfiguredTaskUsageModel(model)) {
    return null
  }

  const ratio = getDisplayGroupRatio(model, group)
  if (model.quota_type === QUOTA_TYPE_VALUES.REQUEST) {
    const perRequest = (model.model_price || 0) * ratio
    return Number.isFinite(perRequest) ? { kind: 'request', perRequest } : null
  }

  const inputPerMillion = model.model_ratio * 2 * ratio
  const outputPerMillion = inputPerMillion * model.completion_ratio
  if (!Number.isFinite(inputPerMillion) || !Number.isFinite(outputPerMillion)) {
    return null
  }
  return { kind: 'token', inputPerMillion, outputPerMillion }
}

/** Cost in USD credit, or null when the model has no single unit price. */
export function estimateCostUsd(
  pricing: TryPricing | null,
  usage: { inputTokens: number; outputTokens: number; requests: number }
): number | null {
  if (!pricing) return null
  if (pricing.kind === 'request') return pricing.perRequest * usage.requests
  return (
    (usage.inputTokens * pricing.inputPerMillion +
      usage.outputTokens * pricing.outputPerMillion) /
    1_000_000
  )
}

/**
 * Prints a credit amount in yuan when the site has a yuan-per-credit price
 * (what the customer actually pays to top up), otherwise in dollars.
 */
export function formatTryCost(
  costUsd: number | null,
  yuanPerCredit?: number
): string {
  if (costUsd === null) return '—'
  if (
    yuanPerCredit !== undefined &&
    Number.isFinite(yuanPerCredit) &&
    yuanPerCredit > 0
  ) {
    return `¥${(costUsd * yuanPerCredit).toFixed(4)}`
  }
  return `$${costUsd.toFixed(4)}`
}

/**
 * The group to bill the try-out under: among the groups that both enable the
 * model and are usable by the viewer, the viewer's own group if it is one of
 * them (what their API key would be billed under), else the first. Undefined
 * lets the server use the viewer's own group.
 */
export function pickTryGroup(
  model: PricingModel,
  usableGroups: readonly string[],
  ownGroup?: string
): string | undefined {
  const enabled = Array.isArray(model.enable_groups) ? model.enable_groups : []
  const candidates = enabled.filter(
    (group) => !EXCLUDED_GROUPS.includes(group) && usableGroups.includes(group)
  )
  return ownGroup && candidates.includes(ownGroup) ? ownGroup : candidates[0]
}

// Some providers reject blank message content, so an exchange the model
// answered with nothing is left out of what the next request carries.
function withoutUnansweredTurns(history: readonly TryMessage[]): TryMessage[] {
  const kept: TryMessage[] = []
  for (const message of history) {
    if (message.role === 'assistant' && !message.content.trim()) {
      if (kept.at(-1)?.role === 'user') kept.pop()
    } else {
      kept.push(message)
    }
  }
  return kept
}

/** Playground chat request for the conversation so far, streamed. */
export function buildTryItPayload(input: {
  model: string
  group?: string
  history: readonly TryMessage[]
  temperature: number
}): ChatCompletionRequest {
  return {
    model: input.model,
    ...(input.group ? { group: input.group } : {}),
    messages: withoutUnansweredTurns(input.history)
      .slice(-TRY_MAX_HISTORY)
      .map((message) => ({ role: message.role, content: message.content })),
    stream: true,
    temperature: input.temperature,
    max_tokens: TRY_MAX_TOKENS,
  }
}

/** Token usage carried by a streamed chunk (the relay adds it to the last one). */
export function parseStreamUsage(data: string): TryUsage | null {
  if (!data.includes('"usage"')) return null
  try {
    const usage = (JSON.parse(data) as { usage?: unknown }).usage
    if (!usage || typeof usage !== 'object') return null
    const counts = usage as Record<string, unknown>
    const promptTokens = counts.prompt_tokens
    const completionTokens = counts.completion_tokens
    if (
      typeof promptTokens !== 'number' ||
      typeof completionTokens !== 'number'
    ) {
      return null
    }
    return { promptTokens, completionTokens }
  } catch {
    return null
  }
}
