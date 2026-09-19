import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { fetchPhotos, srcSet, type Photo } from '../photos'
import { ArrowLeft, Bullet } from '../sign'
import { LINES } from '../lines'

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const SHARED_SPRING = { type: 'spring', duration: 0.45, bounce: 0 } as const
const STAGGER_MS = 30
const STAGGER_CAP_MS = 240
const GRID_DELAY_MS = 80 // just behind the sign
const P = LINES.find((l) => l.letter === 'P')!

const matches = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches
const columnCount = () => (matches('(min-width: 1024px)') ? 3 : matches('(min-width: 640px)') ? 2 : 1)

// Distribute photos into the shortest column so rows read left to right and
// the stagger follows reading order instead of column order.
function useColumnCount() {
  const [count, setCount] = useState(columnCount)
  useEffect(() => {
    const mqs = [window.matchMedia('(min-width: 1024px)'), window.matchMedia('(min-width: 640px)')]
    const onChange = () => setCount(columnCount())
    mqs.forEach((m) => m.addEventListener('change', onChange))
    return () => mqs.forEach((m) => m.removeEventListener('change', onChange))
  }, [])
  return count
}

function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight })
  const [v, setV] = useState(read)
  useEffect(() => {
    const onResize = () => setV(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return v
}

// Explicit box for the open photo so the FLIP has a definite target.
function fitBox(photo: Photo, vw: number, vh: number) {
  const padX = vw < 640 ? 32 : 80
  const padY = vw < 640 ? 64 : 80
  const scale = Math.min((vw - padX) / photo.width, (vh - padY) / photo.height)
  return { width: Math.round(photo.width * scale), height: Math.round(photo.height * scale) }
}

function layout(items: Photo[], columns: number) {
  const cols: { items: { photo: Photo; index: number }[]; height: number }[] = Array.from(
    { length: columns },
    () => ({ items: [], height: 0 }),
  )
  items.forEach((photo, index) => {
    const target = cols.reduce((a, b) => (b.height < a.height ? b : a))
    target.items.push({ photo, index })
    target.height += photo.height / photo.width
  })
  return cols
}

export default function Photos() {
  // The list lives on the CDN, so a new upload appears here without a deploy.
  const [photos, setPhotos] = useState<Photo[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const controller = new AbortController()
    fetchPhotos(controller.signal)
      .then((list) => {
        setPhotos(list)
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setStatus('error')
      })
    return () => controller.abort()
  }, [])

  const columns = useColumnCount()
  const grid = useMemo(() => layout(photos, columns), [photos, columns])
  const viewport = useViewport()
  const [open, setOpen] = useState<number | null>(null)
  // The tile stays hidden while its enlarged copy is in flight, then reappears once the copy lands.
  const [hidden, setHidden] = useState<number | null>(null)
  const [origin, setOrigin] = useState<DOMRect | null>(null)
  const frames = useRef<(HTMLDivElement | null)[]>([])
  const reduce = useReducedMotion()

  const openTile = (index: number) => {
    setOrigin(frames.current[index]?.getBoundingClientRect() ?? null)
    setHidden(index)
    setOpen(index)
  }

  const close = useCallback(() => {
    setOpen((i) => {
      if (i !== null) setOrigin(frames.current[i]?.getBoundingClientRect() ?? null)
      return null
    })
  }, [])

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onScroll = () => close()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open, close])

  const openPhoto = open === null ? null : photos[open]
  const box = openPhoto ? fitBox(openPhoto, viewport.w, viewport.h) : null
  // FLIP: where the enlarged copy starts from (and returns to), relative to its centered resting box.
  const fromTransform =
    box && origin && !reduce
      ? `translate(${origin.x + origin.width / 2 - viewport.w / 2}px, ${origin.y + origin.height / 2 - viewport.h / 2}px) scale(${origin.width / box.width})`
      : 'translate(0px, 0px) scale(1)'

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col px-5 pt-8 pb-24 sm:px-10 sm:pt-14">
      {/* Platform sign: route bullet, station name, and the camera line as its second message */}
      <div className="flex flex-col gap-1.5">
        <header className="sign sign-in flex flex-col gap-3 px-6 pt-5 pb-6 sm:gap-4 sm:px-8 sm:pt-6 sm:pb-7" style={{ ['--i' as string]: 0 }}>
          <h1 className="flex items-center gap-4 sm:gap-5">
            <span className="text-[36px] leading-10 font-medium tracking-[-0.01em] sm:text-[44px] sm:leading-12">Photos</span>
            <Bullet letter={P.letter} color={P.color} ink={P.ink} size={36} />
          </h1>
          <p className="text-[18px] leading-6 sm:text-[22px] sm:leading-7">
            I take photos on my{' '}
            <a href="https://www.usa.canon.com/shop/p/eos-r50" target="_blank" rel="noopener noreferrer" className="camera-link">
              Canon EOS R50
            </a>
            . Sometimes they look good.
          </p>
        </header>
        <Link
          to="/"
          className="sign sign-in text-link route flex items-center gap-3.5 px-6 py-4 text-[20px] leading-7 font-medium sm:px-8 sm:text-[22px]"
          style={{ ['--i' as string]: 0 }}
        >
          <ArrowLeft />
          Bryce Conrad
        </Link>
      </div>

      {status !== 'loading' && photos.length === 0 && (
        <p
          className="sign sign-in mt-10 px-6 py-5 text-[18px] leading-6 sm:px-8 sm:text-[20px]"
          style={{ ['--i' as string]: 3 }}
        >
          {status === 'error' ? 'The photos are not loading right now.' : 'No photos up yet.'}
        </p>
      )}

      <section
        aria-label="Photo grid"
        className={photos.length === 0 ? 'hidden' : 'mt-10 flex items-start gap-3'}
        aria-busy={status === 'loading'}
      >
        {grid.map((col, c) => (
          <div key={c} className="flex min-w-0 flex-1 flex-col gap-3">
            {col.items.map(({ photo, index }) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => openTile(index)}
                aria-label={`Open ${photo.caption ?? photo.alt}`}
                className="tile group relative block w-full cursor-zoom-in text-left"
                style={{
                  ['--d' as string]: `${GRID_DELAY_MS + Math.min(index * STAGGER_MS, STAGGER_CAP_MS)}ms`,
                  aspectRatio: `${photo.width} / ${photo.height}`,
                }}
              >
                <div
                  ref={(el) => {
                    frames.current[index] = el
                  }}
                  style={{ visibility: hidden === index ? 'hidden' : 'visible' }}
                  className="tile-frame relative h-full w-full overflow-hidden bg-[#1a1a1a]"
                >
                  <img
                    src={photo.src}
                    srcSet={srcSet(photo)}
                    sizes="(min-width: 1024px) 384px, (min-width: 640px) 48vw, 92vw"
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    loading={index < 6 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="tile-img block h-full w-full object-cover"
                  />
                  {photo.caption && (
                    <span className="tile-sign pointer-events-none absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-3 border-t-[3px] border-white bg-black px-3.5 pt-2.5 pb-3 text-[15px] leading-5 text-white">
                      <span className="font-medium">{photo.caption}</span>
                      {photo.date && <span className="tabular-nums">{photo.date}</span>}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ))}
      </section>

      {createPortal(
        <AnimatePresence onExitComplete={() => setHidden(null)}>
          {openPhoto && box && (
            <div
              key="lightbox"
              role="dialog"
              aria-modal="true"
              aria-label={openPhoto.caption ?? openPhoto.alt}
              className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center"
              onClick={close}
            >
              {/* Backdrop fades on its own so the travelling image stays fully opaque */}
              <motion.div
                aria-hidden
                className="absolute inset-0 bg-black/94"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.32, ease: 'easeInOut' } }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
              />
              <motion.div
                className="relative overflow-hidden bg-[#1a1a1a] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)]"
                style={{ width: box.width, height: box.height }}
                initial={{ transform: fromTransform }}
                animate={{ transform: 'translate(0px, 0px) scale(1)' }}
                exit={{ transform: fromTransform }}
                transition={SHARED_SPRING}
              >
                <img
                  src={openPhoto.src}
                  srcSet={srcSet(openPhoto)}
                  sizes="92vw"
                  alt={openPhoto.alt}
                  width={openPhoto.width}
                  height={openPhoto.height}
                  className="block h-full w-full object-cover select-none"
                  draggable={false}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </main>
  )
}
