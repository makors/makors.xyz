// Shared signage parts: NYCTA-style route bullet and square-cut arrows.

// Wide letters are set smaller so they do not crowd the circle. The MTA does the
// same optical correction on its own bullets.
const WIDE_LETTERS = new Set(['M', 'W'])

export function Bullet({ letter, color, ink, size = 48 }: { letter: string; color: string; ink: string; size?: number }) {
  const scale = WIDE_LETTERS.has(letter) ? 0.53 : 0.58
  return (
    <span
      aria-hidden
      className="bullet flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, background: color, color: ink, fontSize: size * scale, lineHeight: 1 }}
    >
      {letter}
    </span>
  )
}

export function ArrowRight({ className = '' }: { className?: string }) {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden className={`arrow-r shrink-0 ${className}`}>
      <path d="M2 10H24M17 3L24 10L17 17" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  )
}

export function ArrowLeft({ className = '' }: { className?: string }) {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden className={`arrow-l shrink-0 ${className}`}>
      <path d="M26 10H4M11 3L4 10L11 17" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  )
}

// Leaving the site. Internal routes get the straight arrow above.
export function ArrowUpRight({ className = '' }: { className?: string }) {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20" fill="none" aria-hidden className={`arrow-ur shrink-0 ${className}`}>
      <path d="M4 17L17 4M8 4H17V13" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  )
}
