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
 * Pick the table-of-contents entry to highlight from section positions.
 *
 * Kept as a pure function over already-measured offsets so the rule is
 * testable without a layout engine, and so the component only has to feed it
 * `getBoundingClientRect().top` values.
 */

export type SectionOffset<Id extends string = string> = {
  id: Id
  /** Distance from the top of the viewport, as reported by the DOM. */
  top: number
}

/**
 * The last section whose heading has passed the reading line wins, so the
 * highlight advances as a heading reaches the top of the viewport rather than
 * when the previous section has fully scrolled away.
 *
 * Two boundaries need care. Before the first heading crosses the line, the
 * first section stays active instead of leaving nothing highlighted. At the
 * very bottom of the page the last section wins even if its heading never
 * reaches the line, which happens when the final section is shorter than the
 * viewport and the page cannot scroll any further.
 */
export function pickActiveSection<Id extends string>(
  sections: readonly SectionOffset<Id>[],
  options: { readingLine: number; atBottom?: boolean }
): Id | undefined {
  if (sections.length === 0) return undefined
  if (options.atBottom) return sections[sections.length - 1].id

  let active = sections[0].id
  for (const section of sections) {
    if (section.top <= options.readingLine) {
      active = section.id
    }
  }
  return active
}

/** True when the window cannot scroll any further down. */
export function isScrolledToBottom(
  scrollY: number,
  viewportHeight: number,
  documentHeight: number,
  tolerance = 2
): boolean {
  return scrollY + viewportHeight >= documentHeight - tolerance
}
