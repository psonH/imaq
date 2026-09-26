// Household water-quality rules. Thresholds are settings, not facts baked into UI:
// confirm them with the Inukjuak water plant / Nunavik public health before use.

export type WaterStatus = 'safe' | 'check' | 'unsafe'

export type QualityCheck = {
  t: number
  chlorine: number | null // free chlorine, mg/L, from a test strip; null = no strip
  clear: boolean
  smellOk: boolean
}

export type Reason =
  | 'advisory'
  | 'noChlorine'
  | 'lowChlorine'
  | 'highChlorine'
  | 'cloudy'
  | 'smell'
  | 'noStrip'
  | 'checkDue'
  | 'neverChecked'
  | 'tankClean'
  | 'good'

export const CHLORINE = {
  // Free chlorine left in the water keeps protecting it in the truck and tank.
  min: 0.2, // mg/L — common minimum residual guideline; confirm locally
  max: 4, // mg/L — upper limit used by many drinking-water regulators
}

export const CHECK_DUE_DAYS = 3
export const TANK_CLEAN_DAYS = 365

// Reference pad colours printed on a typical DPD free-chlorine strip bottle.
// These are physical reference colours (like a brand mark), not theme tokens,
// so they stay fixed in light and dark mode.
export const STRIP_SWATCHES: { mgL: number; colour: string }[] = [
  { mgL: 0, colour: '#ffffff' },
  { mgL: 0.2, colour: '#fbe3ee' },
  { mgL: 0.5, colour: '#f6c4dc' },
  { mgL: 1, colour: '#ee9cc5' },
  { mgL: 2, colour: '#e070ab' },
  { mgL: 4, colour: '#c8458f' },
  { mgL: 10, colour: '#9a2370' },
]

const RANK: Record<WaterStatus, number> = { safe: 0, check: 1, unsafe: 2 }

export function evaluate(
  last: QualityCheck | undefined,
  opts: { advisory: boolean; now: number; lastTankClean: number | null },
): { status: WaterStatus; reasons: Reason[] } {
  const found: { s: WaterStatus; r: Reason }[] = []

  if (opts.advisory) found.push({ s: 'unsafe', r: 'advisory' })

  if (!last) {
    found.push({ s: 'check', r: 'neverChecked' })
  } else {
    if (last.chlorine === null) found.push({ s: 'check', r: 'noStrip' })
    else if (last.chlorine === 0) found.push({ s: 'unsafe', r: 'noChlorine' })
    else if (last.chlorine < CHLORINE.min) found.push({ s: 'check', r: 'lowChlorine' })
    else if (last.chlorine > CHLORINE.max) found.push({ s: 'check', r: 'highChlorine' })
    if (!last.clear) found.push({ s: 'unsafe', r: 'cloudy' })
    if (!last.smellOk) found.push({ s: 'check', r: 'smell' })
    if (opts.now - last.t > CHECK_DUE_DAYS * 86_400_000) found.push({ s: 'check', r: 'checkDue' })
  }

  if (opts.lastTankClean !== null && opts.now - opts.lastTankClean > TANK_CLEAN_DAYS * 86_400_000) {
    found.push({ s: 'check', r: 'tankClean' })
  }

  if (!found.length) return { status: 'safe', reasons: ['good'] }
  const status = found.reduce<WaterStatus>((acc, f) => (RANK[f.s] > RANK[acc] ? f.s : acc), 'safe')
  // Most serious reasons first.
  const reasons = [...found].sort((a, b) => RANK[b.s] - RANK[a.s]).map((f) => f.r)
  return { status, reasons }
}

/** A few past checks so history and trends aren't empty on first open. */
export function seedChecks(now: number): QualityCheck[] {
  const d = 86_400_000
  return [
    { t: now - 27 * d, chlorine: 0.5, clear: true, smellOk: true },
    { t: now - 20 * d, chlorine: 1, clear: true, smellOk: true },
    { t: now - 16 * d, chlorine: 0.2, clear: true, smellOk: true },
    { t: now - 9 * d, chlorine: 0.5, clear: true, smellOk: true },
    { t: now - 1.6 * d, chlorine: 1, clear: true, smellOk: true },
  ]
}
