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

export type QuickStartSample = { label: string; code: string }

/**
 * The OpenAI-compatible base URL for a configured route: the route's origin
 * (or the current origin when none is configured) with exactly one /v1,
 * whether or not the source already ended in /v1 or the full completions path.
 */
export function buildBaseUrl(sourceUrl: string | undefined, origin: string) {
  const root = (sourceUrl?.trim() || origin)
    .replace(/\/+$/, '')
    .replace(/\/v1\/chat\/completions$/, '')
    .replace(/\/v1$/, '')
  return `${root}/v1`
}

/** The prototype's quick-start snippets, filled with real values. */
export function buildQuickStartSamples(args: {
  baseUrl: string
  apiKey: string
  model: string
}): QuickStartSample[] {
  return [
    {
      label: 'Python',
      code: [
        'client = OpenAI(',
        `    base_url="${args.baseUrl}",`,
        `    api_key="${args.apiKey}",`,
        ')',
        'client.chat.completions.create(',
        `    model="${args.model}",`,
        '    messages=[{"role": "user", "content": "Hi"}],',
        ')',
      ].join('\n'),
    },
    {
      label: 'cURL',
      code: [
        `curl ${args.baseUrl}/chat/completions \\`,
        '  -H "Content-Type: application/json" \\',
        `  -H "Authorization: Bearer ${args.apiKey}" \\`,
        `  -d '{"model":"${args.model}","messages":[{"role":"user","content":"Hi"}]}'`,
      ].join('\n'),
    },
  ]
}

/** "sk-abcd...wxyz": enough of a key to recognize it, never the whole thing. */
export function formatDisplayKey(key: string | undefined): string {
  if (!key) return 'sk-xxxx'
  if (key.length <= 14) return key
  return `${key.slice(0, 7)}...${key.slice(-4)}`
}
