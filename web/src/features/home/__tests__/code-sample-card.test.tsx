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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { CodeSampleCard } from '../components/code-sample-card'

const SAMPLES = [
  { label: 'Python', code: 'print("python")' },
  { label: 'cURL', code: 'curl https://example.com' },
]

describe('CodeSampleCard', () => {
  it('shows the first sample and marks its tab selected on load', () => {
    render(<CodeSampleCard samples={SAMPLES} />)

    expect(screen.getByRole('tab', { name: 'Python' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByText('print("python")')).toBeInTheDocument()
  })

  it('switches the code when another language tab is clicked', async () => {
    render(<CodeSampleCard samples={SAMPLES} />)

    await userEvent.click(screen.getByRole('tab', { name: 'cURL' }))

    expect(screen.getByRole('tab', { name: 'cURL' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByText('curl https://example.com')).toBeInTheDocument()
    expect(screen.queryByText('print("python")')).not.toBeInTheDocument()
  })

  it('marks every occurrence of the highlight text and keeps the rest of the code', () => {
    render(
      <CodeSampleCard
        samples={[{ label: 'cURL', code: 'model=zt/max and again zt/max' }]}
        highlight='zt/max'
      />
    )

    const marked = screen.getAllByText('zt/max')
    expect(marked).toHaveLength(2)
    expect(marked[0].tagName).toBe('SPAN')
    expect(screen.getByText(/model=/)).toBeInTheDocument()
  })
})
