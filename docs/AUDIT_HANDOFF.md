# Neuro Runner — audit handoff (2026-09-18)

## Scope and production state
Production/main stays at 291b7c0f527cd0901810b2db87e5909ad5376ab8. The existing CAT TERRITORY destination and its own deployment are unchanged.

The audit branch is a staging workspace, not a release branch: candidate preparation applies assertion-checked migrations to a temporary CI checkout and generates the actual package lock. Do not merge this branch directly. The complete prepared source and exact lock are packaged in the CI candidate artifact. The final package also includes a patch against the baseline for an explicit, reviewable source import. No automatic CI writes, git pushes, or deployments are permitted.

## Verified implementation
- Native local-profile input and validation; responsive portrait/landscape; readable text and controls.
- Native dialogs with explicit focus wrap, Escape, safe cancellation and focus restoration.
- Grid/list/tree and one same-tab CAT TERRITORY link; absolute tree folder paths.
- Correct post-unlock modal state and logout reset; blocked/corrupt/legacy storage handling.
- Lazy local audio, independent ambience/effects, suspended background runtime and cleaned timers.
- Locally compiled Tailwind CSS and self-hosted fonts. Telegram SDK only for Telegram launch parameters.
- Preserved four-visit OMNI story, clearly identified as fiction, cancellable at every phase.
- Removed unused engine/keyboard/orientation modules; preserved historical user data.
- Added static security headers and explicit immutable asset-cache override.

## Completed verification
Candidate run 35290808524 (source staging ref f619f9f742550d46272cb6ebdcc3520409ce78da): types, lint, 34 unit tests, production build, npm audit, and Chromium/WebKit scenario gates all passed. Four newly added state-regression tests failed against the original implementation before fixes.

Browser coverage: 8 scenario groups per engine; 16 total. Viewports 320x568, 390x844, 844x390, 1280x800; login/error/Enter, all file views, dialog focus and close, settings, archive wrong/correct key, navigation after unlock, same-tab game link, logout, blocked/corrupt/legacy storage, full OMNI cycle. The tested screens returned zero selected WCAG A/AA axe violations and zero uncaught JavaScript errors. This is not a full accessibility certification. External game responses were mocked; only the shell's exact navigation target was tested.

Dependencies: npm audit returned zero known vulnerabilities after patching Vitest and Wrangler dependencies. This is a point-in-time package advisory check, not a proof of complete security.

Performance baseline: main JavaScript 326754 bytes / gzip 100676. Earlier optimized candidate: 271205 / gzip 85908 (about 17% less raw main JS), separate lazy OMNI and local CSS/fonts. Local-runner portrait FCP was 816 ms before and 164 ms after in one sample. These are uncontrolled lab samples, not real-user Core Web Vitals, FPS, battery or network guarantees; old idle samples include terminal animation. Exact final measurements are in baseline.json in the candidate evidence.

## Remaining boundaries
- Import the packaged exact source/lock or apply the packaged baseline patch into a clean branch, review it, and run direct-checkout CI before merging. Current staging branch is not the final source snapshot.
- Physical iPhone/Android and actual Telegram WebView/safe-area/haptic/audio behavior are not certified.
- No production deployment or live post-deploy smoke test has been performed for this audit.
- Local Cloudflare header and browser verification is a separate final gate, recorded in the final artifact; do not infer a pass until that job is green.

## Safe continuation
Use the final source archive or final.patch from the named CI artifact, not partially transformed staging source. Preserve the production baseline until direct-checkout checks pass. Never reset or delete user local storage to mask a migration failure. Do not alter CAT TERRITORY or its DNS.
