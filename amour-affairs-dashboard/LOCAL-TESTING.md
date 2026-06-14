# Running the dashboard locally (the low-RAM way)

**Do not use `npm run dev` for routine testing.** `next dev` runs Turbopack
with file watchers and hot-reload and holds **hundreds of MB of RAM** open the
whole time. That is what was clogging your machine — and it does *not* reflect
how the dashboard runs in production.

In production the dashboard is a **static export** (`next.config.ts` →
`output: "export"`). The host (StackCP) serves plain HTML/CSS/JS through Apache.
**There is no Node process on the server.** So for local testing you should do
the same thing: build once, then serve the static files.

## Recommended: build + serve (mirrors production)

```bash
npm run preview
```

This runs `next build` once (Node starts, does the build, then **exits**) and
serves the exported `out/` folder at <http://localhost:8081> using a tiny
built-in static server (`scripts/serve-static.mjs`, ~25 MB, no dependencies).

Already built and just want to serve again without rebuilding:

```bash
npm run serve
```

## When you DO need `npm run dev`

Only when you're actively editing dashboard React code and want hot-reload.
When you're done, **stop it** (Ctrl+C) — don't leave it running in the
background. For click-through testing of an existing build, use `npm run serve`.

## The full local stack (zero Node servers)

The website and the PHP API are served by PHP, and the dashboard by the static
server above. Nothing runs Node persistently:

| Piece            | Command                                                                 | Port |
|------------------|-------------------------------------------------------------------------|------|
| Website + `/api` | `php -d upload_max_filesize=20M -d post_max_size=24M -S localhost:8080 scripts/serve-router.php` (from repo root) | 8080 |
| Dashboard        | `npm run serve` (from `amour-affairs-dashboard/`)                        | 8081 |
| Database         | MariaDB                                                                  | 3306 |

The PHP `-d upload_max_filesize=20M -d post_max_size=24M` flags matter: without
them `php -S` defaults to a 2 MB cap and photo/cover uploads fail with
"File exceeds server upload limit". In production the same limits come from
`api/.user.ini` (honoured by the host's FastCGI PHP).
