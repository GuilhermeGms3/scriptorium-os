# Phase 9 validation

Validation snapshot: 2026-09-14, Windows x64, Node.js 22, production Node preview on `127.0.0.1:4173`.

## Persistence and mutation integrity

- The browser reported `SQLite persistente em OPFS`.
- `Phase 9 Browser QA Source` survived a reload, a new browser tab and a full stop/start of the Node preview server on the same origin.
- A new `Phase 9 Cache Invalidation QA` import appeared in the Library immediately, without reload. Reimporting the same DOI reported `0 importadas / 1 duplicada` and retained one row.
- The automated workspace test exports through `ResearchWorkspaceService`, wipes studies, notes, questions, links and their FTS rows, imports the JSON through the same service and compares the restored collections with foreign-key checking enabled.

## Delivery measurements

The byte-counting HTTP proxy in `scripts/database/byte-counting-proxy.mjs` records response body bytes actually sent to a cold browser origin.

| Request | Transferred body bytes |
| --- | ---: |
| Bíblia Livre — João shard | 3,194,880 |
| SBLGNT — João shard | 28,549,120 |
| João total | 31,744,000 |
| Phase 8 monoliths total | 358,256,640 |

Opening João therefore avoided 326,512,640 bytes, a 91.14% reduction against opening both monoliths.

Selecting λόγος and opening the global occurrences tab returned 328 occurrences, 30 per page. The browser requested the dedicated `/corpus-packages/sblgnt-1.2/linguistic.sqlite3` part (60,268,544 bytes) and did not request `/corpus-packages/sblgnt-1.2.sqlite3` (253,186,048 bytes).

## SSR and deployment targets

The scripture route is declared `ssr: false`; a direct SSR request returned HTTP 200 with the loading shell and contained no OPFS/WASM marker or corpus error. SQLite remains present in the server module graph because shared repository types are bundled, but neither the WASM runtime nor OPFS is initialized by SSR. The Node server log remained clean.

Two production builds were executed:

- `LOVABLE_SANDBOX=1` produced Nitro `preset: cloudflare-module`, `dist/server/wrangler.json` and the Cloudflare client/server layout, overriding the local user preset as enforced by the Lovable wrapper.
- the ordinary local build produced `.output/nitro.json` with `preset: node-server` and ran through `node .output/server/index.mjs`.

## Commands and results

- `npm test`: 11 files, 106 tests passed, 0 failed.
- `npm run typecheck`: passed.
- focused ESLint over Phase 9 application, workspace, corpus runtime, repositories, routes, components and database scripts: 0 errors, 0 warnings.
- Cloudflare/Lovable production build: passed.
- local Node production build: passed.
- `npm run benchmark:delivery`: João cold paths, concordance query and warm return completed; exact timings are machine-dependent.
- Browser QA: Reader, original-language selection, word inspector, 328-item concordance, Library OPFS, reload/restart persistence, immediate mutation refresh and duplicate import passed with no console errors or warnings.

