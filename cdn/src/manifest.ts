/**
 * The photo list lives as one JSON object in the same bucket as the images.
 * It is the site's source of truth, so publishing is an upload rather than a
 * commit and a redeploy.
 *
 * Writes are read-modify-write. One person uploads at a time from one page, and
 * the page uploads files in sequence, so concurrent writers are not a practical
 * concern here.
 */

export const MANIFEST_KEY = "index.json";

export interface PhotoEntry {
    key: string;
    src: string;
    alt: string;
    caption: string;
    date: string;
    width: number | null;
    height: number | null;
    uploadedAt: string;
}

export interface Manifest {
    photos: PhotoEntry[];
}

export async function readManifest(bucket: R2Bucket): Promise<{ photos: PhotoEntry[]; etag: string }> {
    const object = await bucket.get(MANIFEST_KEY);
    if (!object) return { photos: [], etag: '"empty"' };

    try {
        const parsed = await object.json<Manifest>();
        return { photos: Array.isArray(parsed.photos) ? parsed.photos : [], etag: object.httpEtag };
    } catch {
        return { photos: [], etag: object.httpEtag };
    }
}

export async function writeManifest(bucket: R2Bucket, photos: PhotoEntry[]): Promise<void> {
    await bucket.put(MANIFEST_KEY, JSON.stringify({ photos }, null, 2), {
        httpMetadata: { contentType: "application/json", cacheControl: "no-store" },
    });
}

/** Strips the bookkeeping the site does not need. */
export function publicView(entry: PhotoEntry) {
    return {
        src: entry.src,
        alt: entry.alt || entry.caption,
        width: entry.width,
        height: entry.height,
        caption: entry.caption || undefined,
        date: entry.date || undefined,
    };
}

export function cleanText(value: unknown, limit: number): string {
    if (typeof value !== "string") return "";
    // eslint-disable-next-line no-control-regex
    return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, limit);
}
