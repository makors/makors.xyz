import { verifyAccessJwt } from "./access";
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

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        if (path.startsWith("/f/")) return serveFile(request, env, decodeURIComponent(path.slice(3)));

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

        if (path === "/api/upload") {
            if (request.method !== "POST") return text(405, "Method not allowed");
            const denied = await guard(request, env);
            if (denied) return denied;
            return upload(request, env);
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

    // The browser knows the encoded dimensions; the site's photo manifest needs
    // them to reserve grid space, so they travel with the upload.
    const width = positiveInteger(request.headers.get("X-Image-Width"));
    const height = positiveInteger(request.headers.get("X-Image-Height"));

    const key = `${randomId(8)}.${extension}`;
    await env.BUCKET.put(key, body, {
        httpMetadata: {
            contentType,
            cacheControl: "public, max-age=31536000, immutable",
        },
        customMetadata: {
            originalName: sanitizeName(request.headers.get("X-Original-Name")),
            uploadedAt: new Date().toISOString(),
            ...(width && height ? { width: String(width), height: String(height) } : {}),
        },
    });

    const base = env.PUBLIC_BASE.replace(/\/$/, "");
    return json(200, { key, url: `${base}/f/${key}`, size: body.byteLength, width, height });
}

async function serveFile(request: Request, env: Env, key: string): Promise<Response> {
    if (!key || key.includes("/")) return text(404, "Not found");

    const object = await env.BUCKET.get(key, {
        range: request.headers,
        onlyIf: request.headers,
    });
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
        // A conditional request matched, or the caller sent HEAD-like preconditions.
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

function sanitizeName(name: string | null): string {
    if (!name) return "";
    return name.replace(/[^\w.\- ]/g, "").slice(0, 120);
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
