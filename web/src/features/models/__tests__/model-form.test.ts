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
  transformFormDataToModelPayload,
  transformModelToFormDefaults,
} from '../lib/model-form'
import type { Model } from '../types'

const baseModel: Model = {
  id: 7,
  model_name: 'glm-4-plus',
  status: 1,
  sync_official: 1,
  created_time: 0,
  updated_time: 0,
  name_rule: 0,
}

describe('model form context length', () => {
  it('shows a saved context window in the form', () => {
    const defaults = transformModelToFormDefaults({
      ...baseModel,
      context_length: 128000,
    })

    expect(defaults.context_length).toBe(128000)
  })

  it('leaves the field empty when the context window is unknown', () => {
    expect(transformModelToFormDefaults(baseModel).context_length).toBe(
      undefined
    )
    expect(
      transformModelToFormDefaults({ ...baseModel, context_length: 0 })
        .context_length
    ).toBe(undefined)
  })

  it('sends the entered value, and 0 (unknown) when the field is cleared', () => {
    const form = transformModelToFormDefaults({
      ...baseModel,
      context_length: 200000,
    })

    expect(transformFormDataToModelPayload(form).context_length).toBe(200000)
    expect(
      transformFormDataToModelPayload({ ...form, context_length: undefined })
        .context_length
    ).toBe(0)
  })
})
