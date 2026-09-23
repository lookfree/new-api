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
import { describe, expect, it } from 'vitest'

import {
  buildTryItPayload,
  estimateConversationTokens,
  estimateCostUsd,
  estimateTokens,
  formatTryCost,
  getTryPricing,
  parseStreamUsage,
  pickTryGroup,
  supportsTryChat,
  TRY_MAX_TOKENS,
  type TryMessage,
} from '../lib/try-it'
import type { PricingModel } from '../types'

const tokenModel: PricingModel = {
  id: 1,
  model_name: 'glm-4-plus',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 3,
  enable_groups: ['default', 'vip'],
  group_ratio: { default: 1, vip: 0.5 },
}

describe('estimateTokens', () => {
  it('counts nothing for empty text', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('counts about one token per four Latin characters, at least one', () => {
    expect(estimateTokens('abcdefgh')).toBe(2)
    expect(estimateTokens('a')).toBe(1)
  })

  it('counts CJK characters at 0.6 token each and rounds up', () => {
    expect(estimateTokens('你好你好你好你好你好')).toBe(6)
    // 2 CJK (1.2) + 4 Latin (1) = 2.2
    expect(estimateTokens('你好abcd')).toBe(3)
  })
})

describe('estimateConversationTokens', () => {
  it('splits user text (plus the typed message) from assistant text', () => {
    const messages: TryMessage[] = [
      { role: 'user', content: 'abcdefgh' },
      { role: 'assistant', content: 'abcdefghijklmnop' },
    ]

    expect(estimateConversationTokens(messages, 'abcd')).toEqual({
      inputTokens: 3,
      outputTokens: 4,
    })
  })

  it('is zero for an empty conversation with nothing typed', () => {
    expect(estimateConversationTokens([], '')).toEqual({
      inputTokens: 0,
      outputTokens: 0,
    })
  })
})

describe('getTryPricing', () => {
  it('doubles the model ratio into a USD-per-million input price and scales output by the completion ratio', () => {
    expect(getTryPricing(tokenModel, 'default')).toEqual({
      kind: 'token',
      inputPerMillion: 2,
      outputPerMillion: 6,
    })
  })

  it("applies the billed group's ratio", () => {
    expect(getTryPricing(tokenModel, 'vip')).toEqual({
      kind: 'token',
      inputPerMillion: 1,
      outputPerMillion: 3,
    })
  })

  it('prices a per-request model per call, with the group ratio', () => {
    const model: PricingModel = {
      ...tokenModel,
      quota_type: 1,
      model_price: 0.05,
    }

    expect(getTryPricing(model, 'vip')).toEqual({
      kind: 'request',
      perRequest: 0.025,
    })
  })

  it('states no price for tiered pricing, where one number would mislead', () => {
    const model: PricingModel = {
      ...tokenModel,
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("base", p * 2)',
    }

    expect(getTryPricing(model)).toBeNull()
  })

  it('states no price when the ratios are not numbers', () => {
    expect(getTryPricing({ ...tokenModel, model_ratio: Number.NaN })).toBeNull()
  })
})

describe('estimateCostUsd', () => {
  const pricing = {
    kind: 'token',
    inputPerMillion: 2,
    outputPerMillion: 6,
  } as const

  it('prices input and output tokens separately', () => {
    expect(
      estimateCostUsd(pricing, {
        inputTokens: 1000,
        outputTokens: 500,
        requests: 1,
      })
    ).toBeCloseTo(0.005, 10)
  })

  it('multiplies a per-request price by the number of requests', () => {
    expect(
      estimateCostUsd(
        { kind: 'request', perRequest: 0.05 },
        { inputTokens: 0, outputTokens: 0, requests: 3 }
      )
    ).toBeCloseTo(0.15, 10)
  })

  it('is unknown without a unit price', () => {
    expect(
      estimateCostUsd(null, { inputTokens: 1, outputTokens: 1, requests: 1 })
    ).toBeNull()
  })
})

describe('formatTryCost', () => {
  it('shows yuan at the yuan-per-credit price with four decimals', () => {
    expect(formatTryCost(0.005, 7.3)).toBe('¥0.0365')
  })

  it('falls back to dollars when there is no usable exchange price', () => {
    expect(formatTryCost(0.005)).toBe('$0.0050')
    expect(formatTryCost(0.005, 0)).toBe('$0.0050')
    expect(formatTryCost(0.005, Number.NaN)).toBe('$0.0050')
  })

  it('shows a dash when the cost is unknown', () => {
    expect(formatTryCost(null, 7.3)).toBe('—')
  })
})

describe('pickTryGroup', () => {
  it('takes the first group that enables the model and that the viewer can use', () => {
    expect(pickTryGroup(tokenModel, ['vip', 'other'])).toBe('vip')
  })

  it("prefers the viewer's own group when it enables the model and is usable", () => {
    expect(pickTryGroup(tokenModel, ['default', 'vip'], 'vip')).toBe('vip')
    expect(pickTryGroup(tokenModel, ['default', 'vip'], 'other')).toBe(
      'default'
    )
    expect(pickTryGroup(tokenModel, ['default'], 'vip')).toBe('default')
  })

  it('skips the auto group and blank names', () => {
    const model: PricingModel = {
      ...tokenModel,
      enable_groups: ['', 'auto', 'default'],
    }

    expect(pickTryGroup(model, ['auto', 'default'])).toBe('default')
  })

  it('leaves the group to the server when none qualifies', () => {
    expect(pickTryGroup(tokenModel, [])).toBeUndefined()
    expect(pickTryGroup(tokenModel, ['unrelated'])).toBeUndefined()
  })
})

describe('buildTryItPayload', () => {
  const history: TryMessage[] = [{ role: 'user', content: 'hi' }]

  it('asks for a streamed, length-capped reply with the chosen temperature', () => {
    expect(
      buildTryItPayload({
        model: 'glm-4-plus',
        group: 'vip',
        history,
        temperature: 0.3,
      })
    ).toEqual({
      model: 'glm-4-plus',
      group: 'vip',
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
      temperature: 0.3,
      max_tokens: TRY_MAX_TOKENS,
    })
  })

  it('leaves the group out when none was chosen', () => {
    const payload = buildTryItPayload({
      model: 'glm-4-plus',
      history,
      temperature: 0.7,
    })

    expect(payload).not.toHaveProperty('group')
  })

  it('sends only the latest eleven messages, still starting with a user turn', () => {
    const long: TryMessage[] = Array.from({ length: 13 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `m${index}`,
    }))

    const payload = buildTryItPayload({
      model: 'glm-4-plus',
      history: long,
      temperature: 0.7,
    })

    expect(payload.messages).toHaveLength(11)
    expect(payload.messages[0]).toEqual({ role: 'user', content: 'm2' })
    expect(payload.messages.at(-1)).toEqual({ role: 'user', content: 'm12' })
  })

  it('leaves out an exchange the model answered with nothing', () => {
    const payload = buildTryItPayload({
      model: 'glm-4-plus',
      history: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'ok' },
        { role: 'user', content: 'blank please' },
        { role: 'assistant', content: '' },
        { role: 'user', content: 'again' },
      ],
      temperature: 0.7,
    })

    expect(payload.messages).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 'again' },
    ])
  })
})

describe('parseStreamUsage', () => {
  it('reads the token counts from the chunk that carries usage', () => {
    const chunk = JSON.stringify({
      choices: [],
      usage: { prompt_tokens: 12, completion_tokens: 34, total_tokens: 46 },
    })

    expect(parseStreamUsage(chunk)).toEqual({
      promptTokens: 12,
      completionTokens: 34,
    })
  })

  it('ignores content chunks, the done marker and malformed data', () => {
    expect(
      parseStreamUsage('{"choices":[{"delta":{"content":"hi"}}]}')
    ).toBeNull()
    expect(parseStreamUsage('[DONE]')).toBeNull()
    expect(parseStreamUsage('{"usage": broken')).toBeNull()
  })

  it('ignores a usage object without both counts', () => {
    expect(parseStreamUsage('{"usage":{"prompt_tokens":5}}')).toBeNull()
    expect(parseStreamUsage('{"usage":null}')).toBeNull()
  })
})

describe('supportsTryChat', () => {
  it.each([['openai'], ['anthropic'], ['gemini'], ['openai-response']])(
    'allows a model reachable through the %s endpoint',
    (endpoint) => {
      expect(
        supportsTryChat({ ...tokenModel, supported_endpoint_types: [endpoint] })
      ).toBe(true)
    }
  )

  it.each([
    [['image-generation']],
    [['embeddings']],
    [['jina-rerank']],
    [['openai-video']],
  ])('refuses a model that only offers %j', (endpoints) => {
    expect(
      supportsTryChat({ ...tokenModel, supported_endpoint_types: endpoints })
    ).toBe(false)
  })

  it('allows a model with any chat endpoint next to non-chat ones', () => {
    expect(
      supportsTryChat({
        ...tokenModel,
        supported_endpoint_types: ['image-generation', 'openai'],
      })
    ).toBe(true)
  })

  it('gives a model with no listed endpoints the benefit of the doubt', () => {
    expect(
      supportsTryChat({ ...tokenModel, supported_endpoint_types: [] })
    ).toBe(true)
    expect(supportsTryChat(tokenModel)).toBe(true)
  })
})
