/**
 * Verifies the Cloudflare Access JWT that the edge puts on every request to a
 * protected path. Access already blocks unauthenticated traffic in front of the
 * Worker; this second check means a request that reaches the Worker by another
 * route (a direct workers.dev hit, a misconfigured Access app) is still denied.
 */

export interface AccessIdentity {
    email: string;
    sub: string;
}

interface Jwk extends JsonWebKey {
    kid: string;
}

interface CertsResponse {
    keys: Jwk[];
}

const CERTS_TTL_MS = 60 * 60 * 1000;

let certsCache: { teamDomain: string; keys: Map<string, CryptoKey>; fetchedAt: number } | null = null;

function base64UrlToBytes(input: string): Uint8Array {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function decodeJson(segment: string): unknown {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment)));
}

async function loadKeys(teamDomain: string): Promise<Map<string, CryptoKey>> {
    const fresh = certsCache
        && certsCache.teamDomain === teamDomain
        && Date.now() - certsCache.fetchedAt < CERTS_TTL_MS;
    if (fresh) return certsCache!.keys;

    const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
    if (!response.ok) throw new Error(`access certs fetch failed: ${response.status}`);

    const { keys } = await response.json<CertsResponse>();
    const imported = new Map<string, CryptoKey>();
    for (const jwk of keys) {
        imported.set(
            jwk.kid,
            await crypto.subtle.importKey(
                "jwk",
                jwk,
                { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                false,
                ["verify"],
            ),
        );
    }

    certsCache = { teamDomain, keys: imported, fetchedAt: Date.now() };
    return imported;
}

/**
 * Returns the caller's identity, or null when the assertion is missing,
 * malformed, expired, or not signed for this application.
 */
export async function verifyAccessJwt(
    request: Request,
    teamDomain: string,
    aud: string,
): Promise<AccessIdentity | null> {
    const token = request.headers.get("Cf-Access-Jwt-Assertion")
        ?? readCookie(request.headers.get("Cookie"), "CF_Authorization");
    if (!token) return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [rawHeader, rawPayload, rawSignature] = parts;

    let header: { kid?: string; alg?: string };
    let payload: { aud?: string | string[]; iss?: string; exp?: number; nbf?: number; email?: string; sub?: string };
    try {
        header = decodeJson(rawHeader) as typeof header;
        payload = decodeJson(rawPayload) as typeof payload;
    } catch {
        return null;
    }

    if (header.alg !== "RS256" || !header.kid) return null;

    let key: CryptoKey | undefined;
    try {
        key = (await loadKeys(teamDomain)).get(header.kid);
    } catch {
        return null;
    }
    if (!key) return null;

    const valid = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        key,
        base64UrlToBytes(rawSignature),
        new TextEncoder().encode(`${rawHeader}.${rawPayload}`),
    );
    if (!valid) return null;

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;
    if (typeof payload.nbf === "number" && payload.nbf > now + 60) return null;
    if (payload.iss !== `https://${teamDomain}`) return null;

    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(aud)) return null;

    return { email: payload.email ?? "", sub: payload.sub ?? "" };
}

function readCookie(header: string | null, name: string): string | null {
    if (!header) return null;
    for (const pair of header.split(";")) {
        const index = pair.indexOf("=");
        if (index === -1) continue;
        if (pair.slice(0, index).trim() === name) return pair.slice(index + 1).trim();
    }
    return null;
}
