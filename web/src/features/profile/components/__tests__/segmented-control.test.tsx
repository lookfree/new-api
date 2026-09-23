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
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SegmentedControl } from '../segmented-control'

const OPTIONS = [
  { value: 'zhCN', label: '中文' },
  { value: 'en', label: 'English' },
]

function Harness(props: { initial: string; disabled?: boolean }) {
  const [value, setValue] = useState(props.initial)
  return (
    <SegmentedControl
      label='Interface Language'
      value={value}
      options={OPTIONS}
      onChange={setValue}
      disabled={props.disabled}
    />
  )
}

describe('SegmentedControl', () => {
  it('exposes one radio group whose active option is the only one checked', () => {
    render(<Harness initial='zhCN' />)

    expect(
      screen.getByRole('radiogroup', { name: 'Interface Language' })
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '中文' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked()
  })

  it('reports the clicked option', async () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        label='Appearance'
        value='zhCN'
        options={OPTIONS}
        onChange={onChange}
      />
    )

    await userEvent.click(screen.getByRole('radio', { name: 'English' }))

    expect(onChange).toHaveBeenCalledWith('en')
  })

  it('makes only the active option a tab stop', () => {
    render(<Harness initial='en' />)

    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute(
      'tabindex',
      '0'
    )
    expect(screen.getByRole('radio', { name: '中文' })).toHaveAttribute(
      'tabindex',
      '-1'
    )
  })

  it('moves selection and focus with the arrow keys, wrapping at the ends', async () => {
    render(<Harness initial='zhCN' />)

    screen.getByRole('radio', { name: '中文' }).focus()
    await userEvent.keyboard('{ArrowRight}')

    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'English' })).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')

    expect(screen.getByRole('radio', { name: '中文' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '中文' })).toHaveFocus()
  })

  it('ignores clicks and arrow keys while disabled, yet stays focusable', async () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        label='Interface Language'
        value='zhCN'
        options={OPTIONS}
        onChange={onChange}
        disabled
      />
    )
    const active = screen.getByRole('radio', { name: '中文' })

    await userEvent.click(screen.getByRole('radio', { name: 'English' }))
    active.focus()
    await userEvent.keyboard('{ArrowRight}')

    expect(onChange).not.toHaveBeenCalled()
    expect(active).toHaveAttribute('aria-disabled', 'true')
    expect(active).toBeEnabled()
    expect(active).toHaveFocus()
  })
})
