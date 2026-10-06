# Manread

An editorial index of manga, manhwa and manhua: discover, search and track titles, then read them **where they legally live**.

Manread never scrapes or mirrors third-party sites. Titles can be read in two ways:

- **In the app**, for chapters Manread is allowed to distribute: creator uploads, licensed content, or works released for free redistribution. Each one is imported with its license and rights holder, which readers see.
- **On official platforms** for everything else, through AniList's moderated list of official streaming links, validated server-side.

## Quick start

```bash
pnpm install
pnpm dev            # live catalog (AniList)
pnpm dev:offline    # fictional offline dataset, no network needed
```

| Script               | What it does                                                     |
| -------------------- | ---------------------------------------------------------------- |
| `pnpm build`         | Production build (`.output/`)                                    |
| `pnpm preview`       | Serve the production build                                       |
| `pnpm typecheck`     | `vue-tsc` across app, server and shared code                     |
| `pnpm test`          | Unit + component tests (Vitest)                                  |
| `pnpm test:e2e`      | Build, then Playwright on desktop and mobile with offline data   |
| `pnpm content:import`| Import a legally distributable chapter into the in-app reader    |
| `pnpm content:demo`  | Regenerate the original CC0 demo chapters used offline and in e2e |

Configuration lives in `.env` (see `.env.example`). All variables are runtime `NUXT_*` overrides, so one build serves every environment.

## Architecture

```
shared/domain        Pure TypeScript: models, invariants, query parsing. No framework, no I/O.
server/application   Use cases + ports (CatalogProvider, AvailabilityProvider, Cache, Logger, Metrics).
server/infrastructure Adapters: AniList, fixture dataset, memory cache, resilience, observability, security.
server/api, routes   Thin HTTP boundary: validation → use case → error mapping + cache headers.
app/                 Presentation: pages, components, composables, browser storage adapter.
```

Dependencies point inward: `app` and `server/infrastructure` depend on `shared/domain` and `server/application`, never the reverse. The composition root is `server/utils/container.ts`.

### Providers

`CatalogProvider` covers metadata, search and discovery. `AvailabilityProvider` answers "where can I read it?". AniList implements both through one gateway, so a manga page costs **one** upstream request. The `fixture` provider implements the same ports with a fictional dataset, which runs the e2e suite and offline development.

To add a platform source (for example a publisher's official API), implement `AvailabilityProvider` and register it in `container.ts`. `getAvailability` already fans out to every provider in parallel, merges and deduplicates results, caches each provider separately, and marks the response `availabilityDegraded` if one fails. A failing source never breaks the page.

AniList payloads are treated as untrusted. Every item is validated with zod, invalid items are dropped and counted rather than failing the whole list, HTML is reduced to plain text server-side, and image and link URLs pass an allow-list policy (https only; no credentials, IP literals or private hosts).

### Resilience (`server/infrastructure/resilience`)

- **Timeout** per request (6 s), **retry** with exponential backoff and jitter for 5xx, 429 and network errors, honouring `Retry-After`.
- **Circuit breaker**: 5 consecutive failures open it for 30 s, then a single half-open probe.
- **Token bucket** keeps this instance under AniList's rate limit (`NUXT_ANILIST_REQUESTS_PER_MINUTE`).
- **Stale-while-revalidate cache** with request coalescing. If the provider is down, users get the last good data instead of an error.

### Caching

| Data                    | Fresh  | Stale (served while revalidating / on failure) |
| ----------------------- | ------ | ---------------------------------------------- |
| Search                  | 5 min  | 30 min                                         |
| Home feed               | 10 min | 2 h                                            |
| Manga details           | 30 min | 6 h                                            |
| Availability (per source)| 6 h   | 1 day                                          |
| Recommendations         | 6 h    | 1 day                                          |
| Creators                | 1 day  | 3 days                                         |
| Genres / platforms      | 1 day  | 7 days                                         |

API responses also carry `Cache-Control` with `s-maxage` + `stale-while-revalidate`, so a CDN can absorb traffic. In the browser, instant-search results are kept in an in-memory LRU, and manga data is prefetched on hover, focus or keyboard highlight.

### State

| State                              | Where                                                   |
| ---------------------------------- | ------------------------------------------------------- |
| Catalog data                       | Server state via `useFetch` / `useAsyncData` (SSR)      |
| Library, view history, searches    | `useState` + versioned, schema-validated `localStorage` |
| Palette open, toasts               | Minimal global `useState`                               |
| Everything else                    | Local to the component                                  |

The library is local-first: no account required, cross-tab sync, optimistic updates with rollback when storage fails, and JSON export/import. Corrupted storage is backed up, never silently discarded. The `BrowserStore` contract (`app/infrastructure/storage`) is the seam for a future server-synced adapter.

## In-app reading

### Adding content

```bash
pnpm content:import \
  --source studio-ana --source-name "Studio Ana" \
  --license "CC BY 4.0" --license-url https://creativecommons.org/licenses/by/4.0/ --rights-holder "Ana Ito" \
  --catalog anilist:123456 --series-title "Her Series" \
  --chapter 1 --chapter-title "Beginnings" --published 2026-09-01 \
  ./scans/chapter-01/
```

The importer:
- converts pages to WebP (max 1600 px wide);
- names each file after its content hash, so pages can be cached as immutable;
- writes pages to `public/content/<source>/<chapter>/` and the manifest to `content/<source>/manifest.json` (atomically).

Commit both and redeploy: manifests are bundled into the server at build time, and pages are served as static files by the CDN.

The license and rights holder are mandatory. A source holds content under a single license, and the importer refuses to mix licenses. `--catalog` links the chapters to a catalog entry (`anilist:<id>`), so the manga page shows a **Read on Manread** section next to **Where to read**.

Only import content you may redistribute: your own work, work you hold a license for, or work explicitly released for free redistribution (check its exact terms).

### How it is built

- `ChapterSource` is a port, like `AvailabilityProvider`. `FileSystemContentStore` is the first adapter; an object-storage or publisher-API adapter can be added beside it. Several sources are merged, and a failing source is isolated.
- Manifests are read through Nitro server assets (`assets:content`), so the same code runs on a Node server and in serverless functions. They are schema-validated, and invalid ones are logged, counted and skipped without affecting other sources.
- Pages are static files under `/content/…` with one-year immutable caching. They never touch a function. The importer only writes WebP, so no SVG or other active content is ever served.
- Content is part of the deployment, which suits a catalog of moderate size. For a large catalog, add a `ManifestReader` backed by object storage (e.g. Vercel Blob) and point page URLs at it; nothing else changes.

### The reader (`/read/:mangaId/:chapterId`)

- **Page by page**:
  - tap zones and swipes that follow the reading direction (right to left for manga);
  - arrow keys, Space / Page Up / Page Down, Home / End;
  - a scrubber that runs in the reading direction;
  - the next two pages are preloaded.
- **Vertical scroll** for manhwa and manhua. Pages are lazy-loaded at their final size, so the layout never shifts.
- **Auto mode** picks the layout and direction from the title's origin. Mode, direction and fit can be overridden, and the choice is kept.
- Fullscreen, controls that hide when idle, `[` / `]` for chapters, per-page loading and retry, and an end-of-chapter screen with the license.
- **Automatic resume**: the exact page is saved per title. Reading a chapter adds the title to the library and advances progress, which never moves backwards.
- **Accessibility**: page announcements for screen readers, every control labelled, axe-clean.

### Reading on official platforms

When the reader returns from an official platform, Manread offers to mark the next chapter as read. On mobile, official https links already open the publisher's app when it is installed (universal links / app links).

## Language

The interface is in French (`lang="fr"`, `og:locale` `fr_FR`, French number, date and relative-time formats). Genres, platform languages, publication and reading statuses, and creator roles are translated (`shared/domain/labels.ts`). Genre pages use French slugs (`/genre/tranche-de-vie`). French offers are listed first in “Où lire”, then English. Synopses and tags come from AniList and stay in English, so page meta descriptions are composed in French from metadata rather than from the synopsis.

## Design system

Dark, editorial, cinematic. The palette is near-black graphite with bone-white text and one accent, a vermilion (`--c-shu`), used sparingly. Type pairs Instrument Serif (display), Geist (text) and Geist Mono (metadata), all self-hosted. Each home section has its own composition rather than another carousel: a ranked index with covers revealed on hover, a staggered film strip, a magazine spread with pull quotes, an asymmetric mosaic and a ledger table. A desktop vertical rail doubles as a scroll meter. Mobile gets a thumb-reach dock, a full-screen search and bottom-sheet filters. Covers morph between pages through the View Transitions API. All motion respects `prefers-reduced-motion`.

Tokens are in `app/assets/css/tokens.css`, primitives in `app/components/ui/`.

## Security

- Nonce-based **CSP** with `strict-dynamic`, `frame-ancestors 'none'`, HSTS, `nosniff`, a strict referrer policy and a locked-down Permissions-Policy (nuxt-security).
- **No secrets in the client**. The provider endpoint and all keys stay server-side, and every upstream call goes server → AniList.
- **SSRF**: the server only calls the configured AniList endpoint (validated at boot). The image optimizer only fetches from `s4.anilist.co`; any other host is refused with 403.
- **XSS**: external HTML is converted to plain text server-side, Vue escapes all output, JSON-LD is serialised with `<`, `>` and `&` escaped, and stored data is re-validated on read.
- **Rate limiting** per client IP on `/api` (in-process SSR calls are exempt). `X-Forwarded-For` is trusted only when `NUXT_TRUST_PROXY=true`.
- **CSRF**: no cookie-authenticated state exists. Mutating endpoints (telemetry) reject cross-site `Origin` / `Sec-Fetch-Site` and cap body sizes.
- Outbound links use `rel="noopener noreferrer external"`. Redirects only go to canonical internal paths, never user-supplied URLs.
- Errors return a generic message plus a request ID. Logs are structured JSON with sensitive keys redacted.

## SEO

SSR for every public page; canonical URLs with 301s for wrong slugs; per-page titles, descriptions, Open Graph and Twitter cards; `ComicSeries`, `Person` and `WebSite` (SearchAction) JSON-LD; `/sitemap.xml` with the top titles and genre landing pages; `/robots.txt`. Filtered searches are `noindex`, while genre landing pages (`/genre/:slug`) are the indexable entry points.

## Analytics & observability

All analytics are free-tier, cookieless (no consent banner needed), and add no third-party requests unless configured.

| What you learn | Tool | Setup |
| --- | --- | --- |
| Visitors, page views, referrers, countries, devices | **Vercel Web Analytics** | Vercel dashboard › project › *Analytics* › Enable. Active automatically on Vercel deployments. |
| Real-user Core Web Vitals per page | **Vercel Speed Insights** | Vercel dashboard › *Speed Insights* › Enable. |
| What people do (product events) | **Umami Cloud** (free tier) | Create a site on cloud.umami.is, set `NUXT_PUBLIC_UMAMI_WEBSITE_ID`, redeploy. Honours Do Not Track. |
| Search visibility, queries, indexing | **Google Search Console** / **Bing Webmaster Tools** | Add the property with the meta-tag method; set `NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION` / `NUXT_PUBLIC_BING_SITE_VERIFICATION`; submit `/sitemap.xml`. |
| Is the site up? | **UptimeRobot** or **Better Stack** (free) | HTTP monitor on `https://<domain>/api/health` (returns `degraded` when the catalog circuit is open). |
| Server logs and errors | **Vercel Logs** | Built in. Structured JSON with request IDs; client errors are reported to the server and logged. |

Product events (`app/composables/useAnalytics.ts`, typed): `search`, `search_no_results`, `library_add`, `favorite`, `reader_open`, `chapter_complete`, `outbound_platform`. Text values are trimmed to 60 characters. Events never include library contents, history or identifiers. On Vercel Pro, the same events also appear as Vercel custom events.

Server side:
- Structured JSON logs carry request IDs (`X-Request-Id`). Every API request is logged with route, status and duration.
- Metrics cover provider requests, retries, failures, circuit transitions, cache hit/stale/miss, rejected items and URLs, rate limiting and client errors.
- `GET /api/metrics` returns a snapshot with `Authorization: Bearer $NUXT_METRICS_TOKEN`. On serverless these counters are per instance; use them for spot checks, and the tools above for trends.

## Testing

| Layer                    | Tool                         | Covers                                                                                       |
| ------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------- |
| Domain                   | Vitest                       | Library invariants, progress, merge/import, search parsing and serialisation, availability grouping |
| Infrastructure           | Vitest                       | Cache (SWR, coalescing, LRU), breaker, token bucket, retry, HTTP client, rate limiter, URL policy, sanitiser, logger |
| Provider integration     | Vitest + fake `fetch`        | AniList mapping, GraphQL errors, schema drift, platform filters, batching                    |
| Application              | Vitest                       | Failure isolation, degraded responses, not-found, hero fallbacks                             |
| Components / composables | Vitest + Nuxt env            | Where-to-read, library control, storage recovery, quota errors, instant search (debounce, cache, errors) |
| Content & reader         | Vitest                       | Manifest validation, path confinement, catalog scoping, source isolation, positions, chapter progress |
| End-to-end               | Playwright (desktop + mobile) | Discovery, ⌘K flow, library lifecycle, filters ↔ URL, search without JavaScript, 404, redirects, SEO tags, headers, API validation, reader (keyboard, taps, swipes, vertical, resume, preferences) |
| Accessibility            | axe-core in Playwright       | WCAG 2.2 A/AA on every page and the open palette                                             |

## Deployment

### Vercel

The project deploys to Vercel with no `vercel.json`: Nitro detects Vercel and emits the Build Output API.

1. Import the repository in Vercel. The framework (Nuxt) and pnpm are detected automatically; the lockfile works with pnpm 10 and later.
2. Environment variables (Production, and Preview if you want):

   | Variable | Value |
   | --- | --- |
   | `NUXT_PUBLIC_SITE_URL` | Your canonical origin, e.g. `https://manread.app`. Optional: defaults to `https://$VERCEL_PROJECT_PRODUCTION_URL`. |
   | `NUXT_METRICS_TOKEN` | Optional. A long random string to enable `/api/metrics`. |
   | `NUXT_ANILIST_REQUESTS_PER_MINUTE` | Optional, defaults to 25. |

3. Deploy. Preview deployments are kept out of search engines by Vercel (`X-Robots-Tag: noindex`).

What changes automatically on Vercel:
- **Images**: covers go through Vercel's image optimizer (`/_vercel/image`, AVIF/WebP, 30-day cache) instead of IPX, so `sharp` is not shipped in the function (~5 MB instead of ~26 MB). Vercel bills image optimization by source image; check your plan.
- **Client IPs**: the rate limiter reads `X-Forwarded-For`, which Vercel sets.
- **Compression**: left to Vercel's edge (the Node-server plugin turns itself off).
- **Runtime**: Node.js 24 (`nitro.vercel.functions.runtime`).

To check a Vercel build locally: `VERCEL=1 NITRO_PRESET=vercel pnpm build`, then inspect `.vercel/output`.

Limits to keep in mind on serverless:
- The cache, rate limiter and metrics live **in memory per instance**. Fluid compute reuses instances, and API responses carry `s-maxage` so Vercel's CDN absorbs repeat traffic. With many concurrent instances, though, each warms its own cache and keeps its own AniList budget. When traffic grows, implement the `Cache` port on Upstash Redis (Vercel Marketplace) so instances share data and rate-limit budget.
- SSR pages are not CDN-cached, because every response carries a unique CSP nonce. Their data comes from the cache, so renders stay fast.
- Functions run in Vercel's default region (Washington, `iad1`), close to AniList. Pages are served from the edge worldwide.

### Any Node host

`pnpm build && node .output/server/index.mjs`. Put a CDN in front: `/_ipx/*`, `/_nuxt/*`, `/content/*` and the cacheable API responses are designed to be edge-cached. Set `NUXT_TRUST_PROXY=true` only behind a proxy that overwrites `X-Forwarded-For`. SSR HTML is Brotli/gzip-compressed by a Nitro plugin; it skips responses that already have a `Content-Encoding`.

## Known limitations

- **The in-app catalog is only as large as the content you are allowed to distribute.** Major publishers (MANGA Plus, VIZ, K MANGA…) offer no embeddable API, so their titles stay on official platforms until a distribution agreement exists.
- **No accounts yet.** The library is per device (with export/import). Server sync is the next step, behind the existing storage seam.
- **AniList terms.** AniList's API is free for non-commercial use. Commercial use requires their permission, which is needed before launching this as a commercial product.
- Chapter release feeds aren't available from AniList, so pages show chapter counts but no per-chapter release dates.
