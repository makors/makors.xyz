// Procedural ASCII black hole - accretion disk, photon ring, jets, and lensed stars.
// Params are tuned offline; this module is the single source of the render math.
//
// The disk is a tilted ellipse: inclination `flat` = sin(i) (1 = face-on, ~0.25 = edge-on)
// and `pa` is the position angle of the projected ellipse on screen. The event horizon
// and photon ring stay circular (a sphere projects to a circle at any inclination).
// `warp` is a soft aggregate of active ripples. Each ripple is an expanding ring
// that can overlap with other user-triggered ripples.

export type Ripple = {
  radius: number
  width: number
  strength: number
}

export type BlackHoleParams = {
  cols: number
  rows: number
  flat: number // sin(inclination); vertical squash of the disk (1 = face-on, ~0.25 = edge-on)
  pa: number // position angle of the disk ellipse on screen (rad)
  rh: number // event-horizon (void) radius, unit
  rin: number // disk inner radius
  rout: number // disk outer radius
  doppler: number // brightness asymmetry one side vs the other
  arms: number // spiral arm count
  spiral: number // how tightly arms wind
  spin: number // rotation speed
  ring: number // photon-ring brightness
  glow: number // diffuse outer glow
  lens: number // lensed background-star strength
  jet: number // polar jet strength
  aspect: number // char cell height / width
  ramp: string // glyph ramp, dark -> bright
  warp: number // 0..1 aggregate ripple intensity
  ripples: readonly Ripple[] // expanding user-triggered ripple rings
  shockAmp: number // shockwave peak brightness
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function gauss(x: number, width: number): number {
  return Math.exp(-(x * x) / (width * width))
}

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return s - Math.floor(s)
}

function angularDistance(a: number, b: number): number {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

// Brightness field at (c, r) and time t, in 0..1. Shared by the live renderer and
// the reveal/scramble animation so both agree on which cells are "lit".
export function brightnessAt(p: BlackHoleParams, c: number, r: number, t: number): number {
  const cx = (p.cols - 1) / 2
  const cy = (p.rows - 1) / 2
  const S = p.cols * 0.5

  // screen coords in unit space
  const sx = (c - cx) / S
  const sy = ((r - cy) * p.aspect) / S
  const sr = Math.hypot(sx, sy)

  // un-rotate by the disk's position angle to land in the disk frame
  const cosP = Math.cos(p.pa)
  const sinP = Math.sin(p.pa)
  const x = sx * cosP + sy * sinP
  const y = -sx * sinP + sy * cosP

  // stretch the projected ellipse back to a circle in the disk plane
  const sinI = p.flat
  const yDisk = y / sinI
  const dr = Math.hypot(x, yDisk)
  const phi = Math.atan2(yDisk, x)

  let b = 0

  // Sparse lensed background stars. Keep these low-contrast so the disk has hierarchy.
  const starScaleX = 35
  const starScaleY = 28
  const starX = Math.floor((sx + 1.4) * starScaleX)
  const starY = Math.floor((sy + 0.85) * starScaleY)
  const starSeed = hash2(starX, starY)
  if (starSeed > 0.987) {
    const twinkle = 0.65 + 0.35 * Math.sin(t * 2.2 + starSeed * 80)
    const cellX = (sx + 1.4) * starScaleX - starX - 0.5
    const cellY = (sy + 0.85) * starScaleY - starY - 0.5
    const point = gauss(Math.hypot(cellX, cellY), 0.28)
    const lensBand = gauss(sr - (p.rh + 0.18 + 0.025 * Math.sin(phi * 3 - t)), 0.08)
    b += p.lens * point * twinkle * (0.12 + lensBand * 1.4)
  }

  if (dr > p.rin && dr < p.rout) {
    const radial = 1 - (dr - p.rin) / (p.rout - p.rin)
    const beam = 1 + p.doppler * (0.75 * Math.cos(phi) + 0.25 * Math.cos(phi * 2 - 0.7))
    const armPhase = p.arms * phi + p.spiral * dr * 7.2 - t * p.spin
    const arms = 0.42 + 0.58 * Math.pow(0.5 + 0.5 * Math.sin(armPhase), 1.7)
    const filament = 0.78 + 0.22 * Math.sin(19 * dr - 3.2 * phi + t * 2.1)
    const hotSpot = 0.35 * gauss(angularDistance(phi, t * 0.65 + 0.65), 0.34) * gauss(dr - 0.53, 0.19)
    let d = radial * radial * beam * arms * filament + hotSpot
    const occ = smoothstep(p.rh * (1 + p.warp * 0.22), p.rh + 0.08, sr)
    d *= 0.35 + 0.65 * occ
    b = Math.max(b, d)
  }

  // Secondary lensed image of the far disk, stretched around the horizon.
  const causticR = p.rh + 0.11 + 0.028 * Math.sin(phi * 4 + t * 1.4)
  const caustic = gauss(sr - causticR, 0.024) * (0.35 + 0.65 * Math.max(0, Math.sin(phi - 0.35)))
  b = Math.max(b, caustic * (0.25 + 0.45 * p.warp))

  const ringR = p.rh + 0.03
  const rd = Math.abs(sr - ringR)
  const ringBoost = 1 + p.warp * 0.9
  const ringGrain = 0.82 + 0.18 * Math.sin(phi * 18 - t * 5)
  b = Math.max(b, p.ring * ringBoost * ringGrain * gauss(rd, 0.04))

  // Polar jets aligned to the disk frame. The braided modulation keeps them readable
  // as ASCII instead of a generic cone.
  const jetAlong = Math.abs(y)
  const jetWidth = 0.018 + jetAlong * 0.13
  if (jetAlong > p.rh * 0.8 && jetAlong < 0.95) {
    const core = gauss(x, jetWidth)
    const fade = 1 - smoothstep(0.35, 0.95, jetAlong)
    const braid = 0.7 + 0.3 * Math.sin(jetAlong * 31 - t * 5 + Math.sign(y) * x * 90)
    const pulse = 0.65 + 0.35 * Math.sin(jetAlong * 12 - t * 3.3)
    b = Math.max(b, p.jet * core * fade * braid * pulse * (0.65 + p.warp * 0.65))
  }

  b += p.glow * Math.exp(-(sr * sr) / 0.9) * (0.14 + 0.1 * Math.sin(phi * 2 + t))

  if (p.ripples.length) {
    for (const ripple of p.ripples) {
      const sd = Math.abs(sr - ripple.radius)
      const ring = p.shockAmp * ripple.strength * gauss(sd, ripple.width)
      const afterglow = 0.035 * ripple.strength * Math.sin((sr - ripple.radius) * 42 - t * 5)
      b = Math.max(b, ring)
      b += afterglow * Math.exp(-(sd * sd) / 0.1) * Math.exp(-(sr * sr) / 0.65)
    }
  }

  if (sr < p.rh * (1 + p.warp * 0.3)) b = 0

  return Math.min(1, b)
}

export function glyphFor(
  p: BlackHoleParams,
  b: number,
  c = 0,
  r = 0,
  t = 0,
): string {
  if (b <= 0.028) return ' '
  const dither = (hash2(c, r) - 0.5) * 0.07 + Math.sin(t + c * 0.17 + r * 0.11) * 0.008
  const shaped = Math.pow(clamp01(b + dither), 0.82)
  const idx = Math.min(p.ramp.length - 1, Math.max(0, Math.floor(shaped * (p.ramp.length - 1))))
  return p.ramp[idx]!
}

export const PARAMS: BlackHoleParams = {
  cols: 122,
  rows: 58,
  flat: 0.5,
  pa: 0.25,
  rh: 0.22,
  rin: 0.25,
  rout: 0.98,
  doppler: 0.72,
  arms: 3,
  spiral: 1.95,
  spin: 1.45,
  ring: 0.98,
  glow: 0.055,
  lens: 0.18,
  jet: 0.24,
  aspect: 2.05,
  ramp: ' .`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  warp: 0,
  ripples: [],
  shockAmp: 0.82,
}
