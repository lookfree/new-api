import { describe, expect, it } from 'vitest'

import { parseContactChannels } from '../lib/channels'

describe('parseContactChannels', () => {
  it('parses a JSON string of channels', () => {
    const channels = parseContactChannels(
      '[{"kind":"email","label":"Email","value":"support@example.com"}]'
    )

    expect(channels).toEqual([
      { kind: 'email', label: 'Email', value: 'support@example.com', qr: undefined },
    ])
  })

  it('accepts an already-parsed array', () => {
    const channels = parseContactChannels([
      { kind: 'phone', label: 'Phone', value: '400-820-1688' },
    ])

    expect(channels).toHaveLength(1)
    expect(channels[0].kind).toBe('phone')
  })

  it('keeps the QR image when one is given', () => {
    const channels = parseContactChannels([
      { kind: 'wechat', label: 'Support', value: 'zetone', qr: '/qr.png' },
    ])

    expect(channels[0].qr).toBe('/qr.png')
  })

  it('returns an empty list when the option is unset', () => {
    expect(parseContactChannels('')).toEqual([])
    expect(parseContactChannels(undefined)).toEqual([])
    expect(parseContactChannels(null)).toEqual([])
  })

  it('returns an empty list for malformed JSON instead of throwing', () => {
    expect(parseContactChannels('{not json')).toEqual([])
  })

  it('returns an empty list when the payload is not an array', () => {
    expect(parseContactChannels('{"kind":"email"}')).toEqual([])
  })

  it('drops entries missing a label or a value', () => {
    const channels = parseContactChannels([
      { kind: 'email', label: '', value: 'a@b.c' },
      { kind: 'email', label: 'Email', value: '   ' },
      { kind: 'email', label: 'Email', value: 'ok@example.com' },
    ])

    expect(channels.map((c) => c.value)).toEqual(['ok@example.com'])
  })

  it('skips non-object entries', () => {
    const channels = parseContactChannels([null, 'nope', 42, { label: 'E', value: 'v' }])

    expect(channels).toHaveLength(1)
  })

  it('falls back to the email kind for an unknown kind', () => {
    const channels = parseContactChannels([
      { kind: 'carrier-pigeon', label: 'Pigeon', value: 'coo' },
    ])

    expect(channels[0].kind).toBe('email')
  })

  it('trims surrounding whitespace from label and value', () => {
    const channels = parseContactChannels([
      { kind: 'phone', label: '  Phone  ', value: '  123  ' },
    ])

    expect(channels[0]).toMatchObject({ label: 'Phone', value: '123' })
  })
})
