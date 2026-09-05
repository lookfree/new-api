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
/**
 * Copy-pasteable call samples for the docs page.
 *
 * Built from the live base URL rather than a hardcoded host, so a reader can
 * copy a snippet straight out of the page and have it hit this deployment.
 */

import type { BundledLanguage } from 'shiki/bundle/web'

export type DocsSample = {
  label: string
  language: BundledLanguage
  code: string
}

/** Model id used throughout the samples when the catalog is still empty. */
export const FALLBACK_SAMPLE_MODEL = 'gpt-4o-mini'

export function buildCallSamples(
  baseUrl: string,
  modelName: string
): DocsSample[] {
  const model = modelName || FALLBACK_SAMPLE_MODEL
  const v1 = `${baseUrl}/v1`

  return [
    {
      label: 'cURL',
      language: 'bash',
      code: `curl ${v1}/chat/completions \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`,
    },
    {
      label: 'Python',
      language: 'python',
      code: `from openai import OpenAI

client = OpenAI(
    api_key="$API_KEY",
    base_url="${v1}",
)

resp = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Hello"}],
)
print(resp.choices[0].message.content)`,
    },
    {
      label: 'Node.js',
      language: 'javascript',
      code: `import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.API_KEY,
  baseURL: '${v1}',
})

const resp = await client.chat.completions.create({
  model: '${model}',
  messages: [{ role: 'user', content: 'Hello' }],
})
console.log(resp.choices[0].message.content)`,
    },
  ]
}

export function buildModelListSample(baseUrl: string): DocsSample[] {
  return [
    {
      label: 'cURL',
      language: 'bash',
      code: `curl ${baseUrl}/v1/models \\
  -H "Authorization: Bearer $API_KEY"`,
    },
  ]
}
