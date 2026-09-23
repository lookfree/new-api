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
  buildBaseUrl,
  buildQuickStartSamples,
  formatDisplayKey,
} from '../lib/quick-start'

describe('buildBaseUrl', () => {
  it('falls back to the current origin when no route is configured', () => {
    expect(buildBaseUrl(undefined, 'https://app.example.com')).toBe(
      'https://app.example.com/v1'
    )
    expect(buildBaseUrl('  ', 'https://app.example.com')).toBe(
      'https://app.example.com/v1'
    )
  })

  it('ends with exactly one /v1 whatever form the configured route takes', () => {
    for (const source of [
      'https://api.example.com',
      'https://api.example.com/',
      'https://api.example.com/v1',
      'https://api.example.com/v1/',
      'https://api.example.com/v1/chat/completions',
    ]) {
      expect(buildBaseUrl(source, 'https://ignored.example.com')).toBe(
        'https://api.example.com/v1'
      )
    }
  })
})

describe('buildQuickStartSamples', () => {
  const samples = buildQuickStartSamples({
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'sk-abcd...wxyz',
    model: 'gpt-4o-mini',
  })

  it('offers Python then cURL, each carrying the base URL, key and model', () => {
    expect(samples.map((sample) => sample.label)).toEqual(['Python', 'cURL'])
    for (const sample of samples) {
      expect(sample.code).toContain('https://api.example.com/v1')
      expect(sample.code).toContain('sk-abcd...wxyz')
      expect(sample.code).toContain('gpt-4o-mini')
    }
  })

  it('posts the cURL request to the chat completions path of the base URL', () => {
    expect(
      samples[1].code.startsWith(
        'curl https://api.example.com/v1/chat/completions'
      )
    ).toBe(true)
  })
})

describe('formatDisplayKey', () => {
  it('uses a placeholder when the user has no key yet', () => {
    expect(formatDisplayKey(undefined)).toBe('sk-xxxx')
  })

  it('shortens a long key to its recognizable ends and never returns the full key', () => {
    const key = 'sk-abcd1234567890wxyz'

    const shown = formatDisplayKey(key)

    expect(shown).toBe('sk-abcd...wxyz')
    expect(shown).not.toBe(key)
  })

  it('leaves a key that is already short as is', () => {
    expect(formatDisplayKey('sk-abcd...wxyz')).toBe('sk-abcd...wxyz')
  })
})
