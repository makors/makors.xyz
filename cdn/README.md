# makors-cdn

Publishes the photos on makors.xyz. Upload an image at `cdn.makors.xyz`, type a
caption, and it is live — no commit, no deploy.

## Routes

| Path | Access | Purpose |
| --- | --- | --- |
| `/` | redirect | Sends the visitor to `/admin`. |
| `/admin` | protected | Upload page and photo list. |
| `/api/upload` | protected | `POST` the encoded bytes; adds a manifest entry. |
| `/api/photos/<key>` | protected | `PATCH` the caption, `DELETE` the photo. |
| `/photos.json` | **public** | The list the site reads on every visit. |
| `/f/<key>` | **public** | Serves one image, cached immutably. |

`/photos.json` and `/f/` must stay public: the site is a different origin and
reads both. Only `/admin` and `/api` sit behind Cloudflare Access.

## Where the list lives

`index.json` in the same bucket as the images. It is the source of truth for
makors.xyz/photos, which fetches it at runtime.

Writes are read-modify-write. One person uploads at a time from one page, and
that page uploads files in sequence, so concurrent writers are not a practical
concern. If this ever grows more than one author, move the list to D1.

`/photos.json` carries an ETag and `no-cache`, so a visitor revalidates on every
load and a new upload shows up at once, at the cost of one cheap `304`.

`/f/` only serves keys matching `^[a-z0-9]{8}\.(webp|avif|jpg|png|gif)$`, which
is why `index.json` is not reachable through it.

## Protection

Two layers:

1. Cloudflare Access blocks unauthenticated traffic at the edge.
2. `src/access.ts` verifies the `Cf-Access-Jwt-Assertion` JWT (signature, `iss`,
   `aud`, `exp`) inside the Worker, so a request that arrives by some other path
   is still refused.

If `ACCESS_TEAM_DOMAIN` or `ACCESS_AUD` is empty, every protected route answers
`503`. It fails closed on purpose. `workers_dev` is pinned off, because Access
is zone-scoped and cannot protect a `workers.dev` URL.

## Compression

All of it happens in the browser (`src/ui.html`): `createImageBitmap` decodes, a
canvas resizes to the chosen long edge, and `convertToBlob` writes WebP. A 30MB
4K photo leaves the browser at a few hundred KB, so nothing large crosses the
network and no transformation is billed.

Files pass through untouched when re-encoding would not help: animated GIFs,
formats the browser cannot decode (HEIC on most browsers), and images that grow
when re-encoded. SVG is refused, because `/f/` is the same origin as `/admin`.

## Commands

```sh
bun install
bun run dev        # local, with a simulated R2 bucket
bun run typecheck
bun run deploy
bun run tail       # live logs
```
