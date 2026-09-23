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
 * Call examples for the landing page hero, in the prototype's tab order.
 *
 * The base URL comes from the live deployment so a visitor can paste a
 * snippet and hit this gateway before signing up.
 */

export type HeroSample = {
  label: string
  code: string
}

export function buildHeroSamples(baseUrl: string): HeroSample[] {
  const v1 = `${baseUrl}/v1`

  return [
    {
      label: 'Python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="${v1}",
    api_key="sk-xxxx",  # 一把密钥调用所有模型
)

resp = client.chat.completions.create(
    model="deepseek-v3",        # 切模型只改这一行
    messages=[{"role": "user", "content": "你好，智航通"}],
)
print(resp.choices[0].message.content)`,
    },
    {
      label: 'Node.js',
      code: `import OpenAI from "openai"

const client = new OpenAI({
  baseURL: "${v1}",
  apiKey: "sk-xxxx",   // one key for every model
})

const resp = await client.chat.completions.create({
  model: "gpt-4o",         // switch model = change one field
  messages: [{ role: "user", content: "Hello Zetone" }],
})
console.log(resp.choices[0].message.content)`,
    },
    {
      label: 'cURL',
      code: `curl ${v1}/chat/completions \\
  -H "Authorization: Bearer sk-xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3.5-sonnet",
    "messages": [{"role": "user", "content": "Hi"}]
  }'`,
    },
  ]
}
