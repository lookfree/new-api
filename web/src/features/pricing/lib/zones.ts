/**
 * Zetone: domestic / international zoning for the model square.
 *
 * A model's zone is derived from its vendor, not from the model itself, so
 * operations classify each provider once instead of tagging every model. The
 * map lives in the `VendorZones` backend option and reaches the client as the
 * `vendor_zones` field of `GET /api/pricing`.
 *
 * Wire format (vendor ids):
 *   {"domestic": [1, 2], "international": [3, 4]}
 *
 * Everything here is deliberately forgiving: a malformed or empty map yields
 * no zones, which hides the zone tabs and leaves the page exactly as it was.
 * A vendor missing from the map resolves to `other` rather than disappearing.
 */

import type { PricingModel } from '../types'

export const ZONE_ALL = 'all' as const
export const ZONE_DOMESTIC = 'domestic' as const
export const ZONE_INTERNATIONAL = 'international' as const
export const ZONE_OTHER = 'other' as const

/** A zone a model can belong to. */
export type ModelZone =
  | typeof ZONE_DOMESTIC
  | typeof ZONE_INTERNATIONAL
  | typeof ZONE_OTHER

/** The zone tab currently selected, including the catch-all tab. */
export type ZoneFilter = typeof ZONE_ALL | ModelZone

/** Vendor id -> zone, built once per pricing payload. */
export type VendorZoneMap = ReadonlyMap<number, ModelZone>

const EMPTY_ZONE_MAP: VendorZoneMap = new Map()

function collectVendorIds(
  raw: unknown,
  zone: ModelZone,
  into: Map<number, ModelZone>
): void {
  if (!Array.isArray(raw)) return
  for (const entry of raw) {
    const id = typeof entry === 'string' ? Number(entry) : entry
    if (typeof id !== 'number' || !Number.isInteger(id)) continue
    // First assignment wins, so a vendor listed in both zones stays stable
    // rather than flipping with object key order.
    if (!into.has(id)) {
      into.set(id, zone)
    }
  }
}

/**
 * Parse the `vendor_zones` payload into a lookup map.
 *
 * Accepts either the raw JSON string the backend option stores or an
 * already-parsed object, and returns an empty map for anything unusable.
 */
export function parseVendorZones(raw: unknown): VendorZoneMap {
  if (raw === null || raw === undefined || raw === '') return EMPTY_ZONE_MAP

  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return EMPTY_ZONE_MAP
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return EMPTY_ZONE_MAP
  }

  const source = parsed as Record<string, unknown>
  const map = new Map<number, ModelZone>()
  collectVendorIds(source[ZONE_DOMESTIC], ZONE_DOMESTIC, map)
  collectVendorIds(source[ZONE_INTERNATIONAL], ZONE_INTERNATIONAL, map)
  return map
}

/** Resolve one model's zone. Models without a mapped vendor land in `other`. */
export function resolveModelZone(
  model: PricingModel,
  zones: VendorZoneMap
): ModelZone {
  if (!model.vendor_id) return ZONE_OTHER
  return zones.get(model.vendor_id) ?? ZONE_OTHER
}

/** Narrow a model list to one zone. The `all` filter passes everything through. */
export function filterModelsByZone(
  models: readonly PricingModel[],
  zone: ZoneFilter,
  zones: VendorZoneMap
): PricingModel[] {
  if (zone === ZONE_ALL) return [...models]
  return models.filter((model) => resolveModelZone(model, zones) === zone)
}

/** How many models sit in each zone, used for the tab counters. */
export function countModelsByZone(
  models: readonly PricingModel[],
  zones: VendorZoneMap
): Record<ModelZone, number> {
  const counts: Record<ModelZone, number> = {
    [ZONE_DOMESTIC]: 0,
    [ZONE_INTERNATIONAL]: 0,
    [ZONE_OTHER]: 0,
  }
  for (const model of models) {
    counts[resolveModelZone(model, zones)] += 1
  }
  return counts
}

/**
 * Which zone tabs to render, in display order.
 *
 * Returns an empty list when zoning is not configured or when every model
 * falls in the same zone — a single tab tells the reader nothing, so the tab
 * strip is hidden instead.
 */
export function availableZoneTabs(
  models: readonly PricingModel[],
  zones: VendorZoneMap
): ZoneFilter[] {
  if (zones.size === 0) return []
  const counts = countModelsByZone(models, zones)
  const populated = (
    [ZONE_DOMESTIC, ZONE_INTERNATIONAL, ZONE_OTHER] as const
  ).filter((zone) => counts[zone] > 0)
  if (populated.length < 2) return []
  return [ZONE_ALL, ...populated]
}
