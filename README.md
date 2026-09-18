# Neuro Runner

A mobile-friendly cyberpunk desktop shell. ARCADE contains one game: CAT TERRITORY, opened in the current tab at https://meow.neurospace.tech. The game is hosted independently; its code, progress and DNS are not changed by this shell.

## Local use

Use Node.js 22 and the included package lock.

```sh
npm ci
npm run dev
```

Use any non-sensitive runner ID. This is a local profile, not an authenticated account. The archive locks and OMNI story are fiction, not security controls or a remote AI.

## Verification and production

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm audit
npm run preview
```

Styles and fonts are bundled locally. Normal browser startup has no CDN dependency. The Telegram SDK is requested only for Telegram launch parameters; real-device integration still requires testing in Telegram.

Cloudflare serves the generated `dist` directory using `wrangler.jsonc`. The `_headers` file supplies CSP, MIME protection and cache rules. `npx wrangler dev --local` tests the Worker locally without publishing it.

`ci.yml` checks direct source checkout, types, lint, unit tests, build, dependencies, local Worker headers, and Chromium/WebKit user journeys. Browser tests mock the external game response to verify same-tab navigation without touching game data.

## Audit handoff

The September 18 audit staging branch is not a release snapshot. Use the complete packaged source and lockfile, or the accompanying patch against baseline `291b7c0f527cd0901810b2db87e5909ad5376ab8`. See `docs/AUDIT_HANDOFF.md` for checked scenarios, measurement limits and publication status. No production deployment is performed by the audit scripts.
