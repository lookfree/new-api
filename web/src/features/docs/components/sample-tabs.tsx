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
 * Language-tabbed code samples, matching the tabbed call examples on the
 * model detail page so both surfaces read the same way.
 */

import { useState } from 'react'

import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { DocsSample } from '../lib/samples'

export function SampleTabs(props: { samples: DocsSample[] }) {
  const [active, setActive] = useState(props.samples[0]?.label ?? '')
  const current =
    props.samples.find((sample) => sample.label === active) ?? props.samples[0]

  if (!current) return null

  return (
    <div className='space-y-3'>
      {props.samples.length > 1 && (
        <Tabs value={current.label} onValueChange={setActive}>
          <TabsList>
            {props.samples.map((sample) => (
              <TabsTrigger key={sample.label} value={sample.label}>
                {sample.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      <CodeBlock code={current.code} language={current.language}>
        <CodeBlockCopyButton />
      </CodeBlock>
    </div>
  )
}
