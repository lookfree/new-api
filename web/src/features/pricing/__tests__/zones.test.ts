import { describe, expect, it } from 'vitest'

import {
  availableZoneTabs,
  countModelsByZone,
  filterModelsByZone,
  parseVendorZones,
  resolveModelZone,
  ZONE_ALL,
  ZONE_DOMESTIC,
  ZONE_INTERNATIONAL,
  ZONE_OTHER,
} from '../lib/zones'
import type { PricingModel } from '../types'

function model(name: string, vendorId?: number): PricingModel {
  return { model_name: name, vendor_id: vendorId } as PricingModel
}

describe('parseVendorZones', () => {
  it('maps vendor ids to their zone from a JSON string', () => {
    const zones = parseVendorZones('{"domestic":[1,2],"international":[3]}')

    expect(zones.get(1)).toBe(ZONE_DOMESTIC)
    expect(zones.get(2)).toBe(ZONE_DOMESTIC)
    expect(zones.get(3)).toBe(ZONE_INTERNATIONAL)
    expect(zones.size).toBe(3)
  })

  it('accepts an already-parsed object', () => {
    const zones = parseVendorZones({ international: [7] })

    expect(zones.get(7)).toBe(ZONE_INTERNATIONAL)
  })

  it('returns an empty map when the option is unset', () => {
    expect(parseVendorZones('').size).toBe(0)
    expect(parseVendorZones(undefined).size).toBe(0)
    expect(parseVendorZones(null).size).toBe(0)
  })

  it('returns an empty map for malformed JSON instead of throwing', () => {
    expect(parseVendorZones('{not json').size).toBe(0)
  })

  it('returns an empty map when the payload is not an object', () => {
    expect(parseVendorZones('[1,2,3]').size).toBe(0)
    expect(parseVendorZones('42').size).toBe(0)
  })

  it('coerces numeric strings and drops non-integer entries', () => {
    const zones = parseVendorZones('{"domestic":["4",5.5,"abc",null,6]}')

    expect(zones.get(4)).toBe(ZONE_DOMESTIC)
    expect(zones.get(6)).toBe(ZONE_DOMESTIC)
    expect(zones.size).toBe(2)
  })

  it('keeps the first zone for a vendor listed in both', () => {
    const zones = parseVendorZones('{"domestic":[9],"international":[9]}')

    expect(zones.get(9)).toBe(ZONE_DOMESTIC)
  })

  it('handles a map that configures only one zone', () => {
    const zones = parseVendorZones('{"domestic":[1]}')

    expect(zones.get(1)).toBe(ZONE_DOMESTIC)
    expect(zones.size).toBe(1)
  })
})

describe('resolveModelZone', () => {
  const zones = parseVendorZones('{"domestic":[1],"international":[2]}')

  it('resolves a mapped vendor to its zone', () => {
    expect(resolveModelZone(model('qwen-max', 1), zones)).toBe(ZONE_DOMESTIC)
    expect(resolveModelZone(model('gpt-4o', 2), zones)).toBe(ZONE_INTERNATIONAL)
  })

  it('puts an unmapped vendor in other rather than dropping it', () => {
    expect(resolveModelZone(model('mystery', 99), zones)).toBe(ZONE_OTHER)
  })

  it('puts a model with no vendor in other', () => {
    expect(resolveModelZone(model('bare'), zones)).toBe(ZONE_OTHER)
  })
})

describe('filterModelsByZone', () => {
  const zones = parseVendorZones('{"domestic":[1],"international":[2]}')
  const models = [
    model('qwen-max', 1),
    model('deepseek-v3', 1),
    model('gpt-4o', 2),
    model('unmapped', 99),
  ]

  it('returns every model for the all filter', () => {
    expect(filterModelsByZone(models, ZONE_ALL, zones)).toHaveLength(4)
  })

  it('returns only the models of the selected zone', () => {
    const domestic = filterModelsByZone(models, ZONE_DOMESTIC, zones)

    expect(domestic.map((m) => m.model_name)).toEqual([
      'qwen-max',
      'deepseek-v3',
    ])
  })

  it('collects unmapped models under other', () => {
    const other = filterModelsByZone(models, ZONE_OTHER, zones)

    expect(other.map((m) => m.model_name)).toEqual(['unmapped'])
  })

  it('does not mutate the input list', () => {
    filterModelsByZone(models, ZONE_DOMESTIC, zones)

    expect(models).toHaveLength(4)
  })

  it('returns an empty list when no model matches', () => {
    const onlyDomestic = [model('qwen-max', 1)]

    expect(
      filterModelsByZone(onlyDomestic, ZONE_INTERNATIONAL, zones)
    ).toEqual([])
  })
})

describe('countModelsByZone', () => {
  it('counts each zone including the unmapped bucket', () => {
    const zones = parseVendorZones('{"domestic":[1],"international":[2]}')
    const counts = countModelsByZone(
      [model('a', 1), model('b', 2), model('c', 2), model('d')],
      zones
    )

    expect(counts).toEqual({ domestic: 1, international: 2, other: 1 })
  })

  it('returns all zeroes for an empty model list', () => {
    const counts = countModelsByZone([], parseVendorZones('{"domestic":[1]}'))

    expect(counts).toEqual({ domestic: 0, international: 0, other: 0 })
  })
})

describe('availableZoneTabs', () => {
  const models = [model('a', 1), model('b', 2)]

  it('lists all plus every populated zone in display order', () => {
    const zones = parseVendorZones('{"domestic":[1],"international":[2]}')

    expect(availableZoneTabs(models, zones)).toEqual([
      ZONE_ALL,
      ZONE_DOMESTIC,
      ZONE_INTERNATIONAL,
    ])
  })

  it('hides the tabs entirely when zoning is not configured', () => {
    expect(availableZoneTabs(models, parseVendorZones(''))).toEqual([])
  })

  it('hides the tabs when every model falls in the same zone', () => {
    const zones = parseVendorZones('{"domestic":[1,2]}')

    expect(availableZoneTabs(models, zones)).toEqual([])
  })

  it('includes other when some models have no mapped vendor', () => {
    const zones = parseVendorZones('{"domestic":[1]}')

    expect(availableZoneTabs([model('a', 1), model('b', 77)], zones)).toEqual([
      ZONE_ALL,
      ZONE_DOMESTIC,
      ZONE_OTHER,
    ])
  })

  it('hides the tabs when there are no models at all', () => {
    expect(availableZoneTabs([], parseVendorZones('{"domestic":[1]}'))).toEqual(
      []
    )
  })
})
