import { describe, expect, it } from 'vitest'

import {
  isScrolledToBottom,
  pickActiveSection,
  type SectionOffset,
} from '../lib/active-section'

const READING_LINE = 120

function sections(
  ...tops: number[]
): SectionOffset<'a' | 'b' | 'c'>[] {
  const ids = ['a', 'b', 'c'] as const
  return tops.map((top, index) => ({ id: ids[index], top }))
}

describe('pickActiveSection', () => {
  it('keeps the first section active before any heading reaches the line', () => {
    const active = pickActiveSection(sections(400, 900, 1400), {
      readingLine: READING_LINE,
    })

    expect(active).toBe('a')
  })

  it('activates a section once its heading crosses the line', () => {
    const active = pickActiveSection(sections(-200, 100, 700), {
      readingLine: READING_LINE,
    })

    expect(active).toBe('b')
  })

  it('picks the last heading that has passed the line, not the first', () => {
    const active = pickActiveSection(sections(-900, -400, 20), {
      readingLine: READING_LINE,
    })

    expect(active).toBe('c')
  })

  it('treats a heading exactly on the line as passed', () => {
    const active = pickActiveSection(sections(-500, READING_LINE, 800), {
      readingLine: READING_LINE,
    })

    expect(active).toBe('b')
  })

  it('activates the last section once the page is scrolled to the bottom', () => {
    const active = pickActiveSection(sections(-900, -600, 400), {
      readingLine: READING_LINE,
      atBottom: true,
    })

    expect(active).toBe('c')
  })

  it('returns undefined when there are no sections', () => {
    expect(
      pickActiveSection([], { readingLine: READING_LINE })
    ).toBeUndefined()
  })

  it('returns the only section when just one is present', () => {
    expect(
      pickActiveSection([{ id: 'a' as const, top: 900 }], {
        readingLine: READING_LINE,
      })
    ).toBe('a')
  })
})

describe('isScrolledToBottom', () => {
  it('is true when the viewport bottom reaches the document end', () => {
    expect(isScrolledToBottom(1000, 800, 1800)).toBe(true)
  })

  it('is true within the rounding tolerance', () => {
    expect(isScrolledToBottom(999, 800, 1800)).toBe(true)
  })

  it('is false while there is still room to scroll', () => {
    expect(isScrolledToBottom(500, 800, 1800)).toBe(false)
  })

  it('is true when the document is shorter than the viewport', () => {
    expect(isScrolledToBottom(0, 800, 600)).toBe(true)
  })
})
