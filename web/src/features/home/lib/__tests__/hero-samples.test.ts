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

import { buildHeroSamples } from '../hero-samples'

describe('buildHeroSamples', () => {
  it('orders the samples Python, Node.js, cURL as the prototype does', () => {
    const labels = buildHeroSamples('https://api.example.com').map(
      (sample) => sample.label
    )
    expect(labels).toEqual(['Python', 'Node.js', 'cURL'])
  })

  it('points every sample at the deployment v1 endpoint', () => {
    for (const sample of buildHeroSamples('https://api.example.com')) {
      expect(sample.code).toContain('https://api.example.com/v1')
    }
  })
})
