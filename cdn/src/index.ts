import { verifyAccessJwt } from "./access";
import {
    cleanText,
    publicView,
    readManifest,
    writeManifest,
    type PhotoEntry,
} from "./manifest";
import ui from "./ui.html";

export interface Env {
    BUCKET: R2Bucket;
    ACCESS_TEAM_DOMAIN: string;
    ACCESS_AUD: string;
    PUBLIC_BASE: string;
}

/** SVG is deliberately absent: it can carry script, and these files are served same-origin as /admin. */
const EXTENSION_BY_TYPE: Record<string, string> = {
    "image/webp": "webp",
    "image/avif": "avif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
};

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
/** Only generated image keys are reachable through /f/, so the manifest is not. */
const FILE_KEY = /^[a-z0-9]{8}\.(webp|avif|jpg|png|gif)$/;
const CAPTION_LIMIT = 140;

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        if (path.startsWith("/f/")) return serveFile(request, env, decodeURIComponent(path.slice(3)));
        if (path === "/photos.json") return photosFeed(request, env);

        // Bare root bounces to /admin so the Access login flow is what the
        // visitor meets, rather than a flat 403 from the guard below.
        if (path === "/") return Response.redirect(`${url.origin}/admin`, 302);

        if (path === "/admin") {
            const denied = await guard(request, env);
            if (denied) return denied;
            return new Response(ui, {
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-store",
                    "X-Content-Type-Options": "nosniff",
                    "Referrer-Policy": "no-referrer",
                },
            });
        }

        if (path.startsWith("/api/")) {
            const denied = await guard(request, env);
            if (denied) return denied;

            if (path === "/api/upload" && request.method === "POST") return upload(request, env);

            if (path.startsWith("/api/photos/")) {
                const key = decodeURIComponent(path.slice("/api/photos/".length));
                if (!FILE_KEY.test(key)) return json(404, { error: "Unknown photo" });
                if (request.method === "PATCH") return editPhoto(request, env, key);
                if (request.method === "DELETE") return removePhoto(env, key);
            }

            return json(405, { error: "Method not allowed" });
        }

        return text(404, "Not found");
    },
} satisfies ExportedHandler<Env>;

/** Returns a response when the caller must be turned away, or null to continue. */
async function guard(request: Request, env: Env): Promise<Response | null> {
    if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
        return text(503, "Access is not configured yet. Set ACCESS_TEAM_DOMAIN and ACCESS_AUD, then redeploy.");
    }
    const identity = await verifyAccessJwt(request, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD);
    if (!identity) return text(403, "Forbidden");
    return null;
}

/** The public photo list the site reads on every visit. */
async function photosFeed(request: Request, env: Env): Promise<Response> {
    const { photos, etag } = await readManifest(env.BUCKET);

    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        // Revalidate every time. The body is small, and a new upload should show
        // up on the site immediately rather than after a cache window.
        "Cache-Control": "public, no-cache",
        "ETag": etag,
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
    });

    if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
    return new Response(JSON.stringify({ photos: photos.map(publicView) }), { headers });
}

async function upload(request: Request, env: Env): Promise<Response> {
    const contentType = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
    const extension = EXTENSION_BY_TYPE[contentType];
    if (!extension) return json(415, { error: `Unsupported type: ${contentType || "none"}` });

    const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
    if (declaredLength > MAX_UPLOAD_BYTES) {
        return json(413, { error: `File is over the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit.` });
    }

    const body = await request.arrayBuffer();
    if (body.byteLength === 0) return json(400, { error: "Empty body" });
    if (body.byteLength > MAX_UPLOAD_BYTES) {
        return json(413, { error: `File is over the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit.` });
    }

    // The browser knows the encoded dimensions; the photo grid needs them to
    // reserve space so it does not shift as images arrive.
    const width = positiveInteger(request.headers.get("X-Image-Width"));
    const height = positiveInteger(request.headers.get("X-Image-Height"));

    const key = `${randomId(8)}.${extension}`;
    const uploadedAt = new Date();

    // A smaller rendition of a photo already uploaded. It joins that photo's
    // srcset instead of becoming a separate entry on the page.
    const variantOf = request.headers.get("X-Variant-Of");
    if (variantOf) {
        if (!FILE_KEY.test(variantOf)) return json(404, { error: "Unknown photo" });
        if (!width) return json(400, { error: "A variant needs X-Image-Width" });

        const { photos } = await readManifest(env.BUCKET);
        const parent = photos.find((photo) => photo.key === variantOf);
        if (!parent) return json(404, { error: "Unknown photo" });

        await env.BUCKET.put(key, body, {
            httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
            customMetadata: { variantOf, uploadedAt: uploadedAt.toISOString() },
        });

        const src = `${env.PUBLIC_BASE.replace(/\/$/, "")}/f/${key}`;
        parent.sources = [...(parent.sources ?? []).filter((s) => s.width !== width), { key, src, width }];
        await writeManifest(env.BUCKET, photos);

        return json(200, { key, src, width, variantOf });
    }

    await env.BUCKET.put(key, body, {
        httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: {
            originalName: cleanText(request.headers.get("X-Original-Name"), 120),
            uploadedAt: uploadedAt.toISOString(),
        },
    });

    const entry: PhotoEntry = {
        key,
        src: `${env.PUBLIC_BASE.replace(/\/$/, "")}/f/${key}`,
        alt: "",
        caption: "",
        date: String(uploadedAt.getUTCFullYear()),
        width,
        height,
        uploadedAt: uploadedAt.toISOString(),
    };

    const { photos } = await readManifest(env.BUCKET);
    await writeManifest(env.BUCKET, [entry, ...photos.filter((photo) => photo.key !== key)]);

    return json(200, { ...entry, size: body.byteLength });
}

async function editPhoto(request: Request, env: Env, key: string): Promise<Response> {
    let patch: { caption?: unknown; alt?: unknown; date?: unknown };
    try {
        patch = await request.json();
    } catch {
        return json(400, { error: "Expected JSON" });
    }

    const { photos } = await readManifest(env.BUCKET);
    const index = photos.findIndex((photo) => photo.key === key);
    if (index === -1) return json(404, { error: "Unknown photo" });

    const entry = photos[index];
    if ("caption" in patch) entry.caption = cleanText(patch.caption, CAPTION_LIMIT);
    if ("alt" in patch) entry.alt = cleanText(patch.alt, CAPTION_LIMIT);
    if ("date" in patch) entry.date = cleanText(patch.date, 12);

    await writeManifest(env.BUCKET, photos);
    return json(200, entry);
}

async function removePhoto(env: Env, key: string): Promise<Response> {
    const { photos } = await readManifest(env.BUCKET);
    const entry = photos.find((photo) => photo.key === key);

    await writeManifest(env.BUCKET, photos.filter((photo) => photo.key !== key));

    // Every rendition goes, not just the one the page links to.
    const keys = [key, ...(entry?.sources ?? []).map((source) => source.key)];
    await Promise.all(keys.map((each) => env.BUCKET.delete(each)));

    return json(200, { removed: keys });
}

async function serveFile(request: Request, env: Env, key: string): Promise<Response> {
    if (!FILE_KEY.test(key)) return text(404, "Not found");

    const object = await env.BUCKET.get(key, { range: request.headers, onlyIf: request.headers });
    if (!object) return text(404, "Not found");

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Content-Disposition", "inline");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Access-Control-Allow-Origin", "*");
    // Nothing served from /f/ is allowed to load or run anything of its own.
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");

    if (!("body" in object) || object.body === null) {
        // A conditional request matched, so the caller already has the bytes.
        return new Response(null, { status: 304, headers });
    }

    const status = request.headers.get("Range") && object.range ? 206 : 200;
    return new Response(object.body, { status, headers });
}

function randomId(length: number): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    let out = "";
    for (const byte of bytes) out += ID_ALPHABET[byte % ID_ALPHABET.length];
    return out;
}

function positiveInteger(value: string | null): number | null {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
}

function text(status: number, body: string): Response {
    return new Response(body, {
        status,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
}
