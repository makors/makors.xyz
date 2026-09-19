// Photos are published from https://cdn.makors.xyz, not from this repo. The page
// reads the list at runtime, so posting a photo takes an upload rather than a
// commit and a deploy.

export type Photo = {
  src: string
  alt: string
  width: number
  height: number
  caption?: string
  date?: string
}

export const PHOTOS_ENDPOINT = 'https://cdn.makors.xyz/photos.json'

// The uploader records real dimensions for anything the browser can decode. This
// fallback only covers a file it could not measure, where an approximate box
// still beats a collapsed one.
const FALLBACK_WIDTH = 1600
const FALLBACK_HEIGHT = 1200

const size = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback

export async function fetchPhotos(signal?: AbortSignal): Promise<Photo[]> {
  const response = await fetch(PHOTOS_ENDPOINT, { signal })
  if (!response.ok) throw new Error(`Photo list returned ${response.status}`)

  const data = (await response.json()) as { photos?: unknown }
  if (!Array.isArray(data.photos)) return []

  return data.photos
    .filter((photo): photo is Record<string, unknown> => typeof photo?.src === 'string')
    .map((photo) => ({
      src: photo.src as string,
      alt: typeof photo.alt === 'string' ? photo.alt : '',
      width: size(photo.width, FALLBACK_WIDTH),
      height: size(photo.height, FALLBACK_HEIGHT),
      caption: typeof photo.caption === 'string' ? photo.caption : undefined,
      date: typeof photo.date === 'string' ? photo.date : undefined,
    }))
}
