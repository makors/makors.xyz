// Shared signage parts: NYCTA-style route bullet and square-cut arrows.

export function Bullet({ letter, color, ink, size = 48 }: { letter: string; color: string; ink: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="bullet flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, background: color, color: ink, fontSize: size * 0.58, lineHeight: 1 }}
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
