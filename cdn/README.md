# makors-cdn

Image uploader on `cdn.makors.xyz`. The browser resizes and re-encodes to WebP,
the Worker stores the result in R2 and hands back a permanent URL.

## Routes

| Path        | Access      | Purpose                                          |
| ----------- | ----------- | ------------------------------------------------ |
| `/`         | redirect    | Sends the visitor to `/admin`.                   |
| `/admin`    | protected   | The upload page.                                 |
| `/api/upload` | protected | `POST` the encoded bytes, returns `{ key, url }`. |
| `/f/<key>`  | **public**  | Serves the stored image, cached immutably.       |

`/f/` must stay public, otherwise the URLs the tool produces would be useless
anywhere else. Only `/admin` and `/api` sit behind Cloudflare Access.

## Protection

Two layers:

1. Cloudflare Access blocks unauthenticated traffic at the edge.
2. `src/access.ts` verifies the `Cf-Access-Jwt-Assertion` JWT (signature, `iss`,
   `aud`, `exp`) inside the Worker, so a request that arrives by some other path
   is still refused.

If `ACCESS_TEAM_DOMAIN` or `ACCESS_AUD` is empty, every protected route answers
`503`. It fails closed on purpose.

## Compression

All of it happens in the browser (`src/ui.html`): `createImageBitmap` decodes,
a canvas resizes to the chosen long edge, and `convertToBlob` writes WebP. A
30MB 4K photo leaves the browser at a few hundred KB, so nothing large crosses
the network and no transformation is billed.

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
