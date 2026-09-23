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
import type { HeroSample } from '@/features/home/lib/hero-samples'

/**
 * Call examples for the model dialog, in the prototype's tab order. The base
 * URL is the deployment's own, so a visitor can paste a snippet, add a key and
 * call this exact model.
 */
export function buildModelCallSamples(
  baseUrl: string,
  modelName: string
): HeroSample[] {
  const v1 = `${baseUrl}/v1`

  return [
    {
      label: 'Python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="${v1}",
    api_key="sk-xxxx",
)
resp = client.chat.completions.create(
    model="${modelName}",
    messages=[{"role": "user", "content": "你好"}],
)`,
    },
    {
      label: 'cURL',
      code: `curl ${v1}/chat/completions \\
  -H "Authorization: Bearer sk-xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${modelName}", "messages": [{"role":"user","content":"Hi"}]}'`,
    },
  ]
}
