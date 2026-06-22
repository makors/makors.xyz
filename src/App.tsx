import './App.css'
import '@fontsource-variable/geist'
import { useEffect, useRef } from 'react'
import { PARAMS, type Ripple, brightnessAt, glyphFor } from './blackhole'

const SCRAMBLE = '.,:;-~=+*o#%@'

const STILL_T = 2.4
const DRIFT_SPEED = 0.00075
const ROTATE_SPEED = 0.00009
const REVEAL_MS = 1200
const RIPPLE_MS = 1850
const RIPPLE_START = 0.28
const RIPPLE_END = 1.28
const MAX_RIPPLES = 7

// Autonomous black-hole field: the disk breathes and rotates on its own while click,
// Enter, or Space adds an expanding ripple ring through the ASCII.
function useBlackHole(
  ref: React.RefObject<HTMLPreElement | null>,
  triggerWarp: React.MutableRefObject<() => void>,
) {
  useEffect(() => {
    const params = { ...PARAMS }
    const { cols, rows } = params
    const N = cols * rows

    // reveal timing, measured from the true center of the grid outward
    const cx = (cols - 1) / 2
    const cy = (rows - 1) / 2
    const maxD = Math.hypot(cx, cy * params.aspect) || 1
    const revealAt = new Float32Array(N)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const d = Math.hypot(c - cx, (r - cy) * params.aspect) / maxD
        const at = d * REVEAL_MS + Math.random() * 180
        revealAt[r * cols + c] = at
      }
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const rippleStarts: number[] = []

    const trigger = () => {
      if (reduce) return
      const now = performance.now()
      rippleStarts.push(now)
      if (rippleStarts.length > MAX_RIPPLES) rippleStarts.splice(0, rippleStarts.length - MAX_RIPPLES)
      if (!raf) raf = requestAnimationFrame(render)
    }
    triggerWarp.current = trigger

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        if (!e.repeat) trigger()
      }
    }
    window.addEventListener('keydown', onKey)

    let start = 0
    let raf = 0
    const render = (now: number) => {
      if (!start) start = now
      const elapsed = now - start
      while (rippleStarts.length && now - rippleStarts[0]! > RIPPLE_MS) rippleStarts.shift()

      let rippleLift = 0
      const ripples: Ripple[] = rippleStarts.map((rippleStart) => {
        const progress = Math.max(0, Math.min(1, (now - rippleStart) / RIPPLE_MS))
        const easeOut = 1 - (1 - progress) ** 2.35
        const fade = (1 - progress) ** 0.72
        const crest = Math.sin(progress * Math.PI) ** 0.45
        const strength = fade * crest
        rippleLift = Math.max(rippleLift, strength)

        return {
          radius: RIPPLE_START + (RIPPLE_END - RIPPLE_START) * easeOut,
          width: 0.035 + progress * 0.045,
          strength,
        }
      })

      const t = STILL_T + elapsed * DRIFT_SPEED + rippleLift * 0.55

      params.pa = PARAMS.pa + elapsed * ROTATE_SPEED + rippleLift * 0.025
      params.warp = rippleLift * 0.34
      params.ripples = ripples

      let frame = ''
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c
          const b = brightnessAt(params, c, r, t)
          const target = glyphFor(params, b, c, r, t)

          if (!reduce && elapsed < revealAt[i]!) {
            // still resolving: scramble lit-ish cells, keep the void/background dark
            frame += b > 0.04 ? SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0] : ' '
          } else {
            frame += b > 0.001 ? target : ' '
          }
        }
        frame += '\n'
      }

      if (ref.current) ref.current.textContent = frame
      if (reduce) {
        raf = 0
        return
      }
      raf = requestAnimationFrame(render)
    }

    raf = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [ref, triggerWarp])
}

function App() {
  const artRef = useRef<HTMLPreElement>(null)
  const warpRef = useRef<() => void>(() => {})

  useBlackHole(artRef, warpRef)

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#020202] px-4 py-8 text-white sm:px-6">
      <pre
        ref={artRef}
        aria-label="Interactive ASCII black hole animation"
        onClick={() => warpRef.current()}
        tabIndex={0}
        className="ascii-stage cursor-pointer select-none leading-[0.92] text-[clamp(4.5px,1.4vw,7.6px)] outline-none [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]"
      />

      <h1 className="mt-8 text-[15px] font-semibold tracking-[-0.01em] text-white/95">
        makors
      </h1>

      <p className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[12px] tracking-[0.01em] text-white/40">
        <a href="mailto:makors@discern.computer" className="transition-colors hover:text-white">
          email
        </a>
        <span aria-hidden className="text-white/15">|</span>
        <a
          href="https://github.com/makors"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-white"
        >
          github
        </a>
        <span aria-hidden className="text-white/15">|</span>
        <a
          href="https://readme.sh"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-white"
        >
          writing
        </a>
      </p>
    </main>
  )
}

export default App
