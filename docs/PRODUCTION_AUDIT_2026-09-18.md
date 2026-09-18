# Neuro Runner: production audit and polish

Baseline: 291b7c0f527cd0901810b2db87e5909ad5376ab8. Scope: this shell, not CAT TERRITORY or its DNS/deployment.

## Goal and invariants
A responsive, readable and reliable cyberpunk shell: boot -> local profile -> desktop -> ARCADE -> CAT TERRITORY in the same tab. Preserve settings, OMNI narrative, file-browser views and stored preferences. Keep the current visual identity. No real authentication or remote AI is implied by local simulation.

## Acceptance and stop conditions
- Exactly one arcade game; requested HTTPS destination unchanged.
- Desktop, narrow portrait and short landscape must be operable; no orientation lock or horizontal overflow.
- Keyboard/native text entry, accessible controls and modal focus/escape/return work. Reduced motion and low-power settings respected.
- Production CSS bundled locally, no runtime Tailwind compiler, unused import map, or blocking third-party dependency for normal-browser launch.
- Dependencies: inspect full npm audit, fix supported upgrades, do not force incompatible major versions blindly.
- Preserve saved data; invalid storage and unsupported APIs must not crash app.
- No idle work when hidden; measure load/idle and bundle, do not fabricate real-device FPS/battery/Core Web Vitals.
- Require unit tests, types, production build, browser scenarios, automated accessibility checks and reviewed diff. New checks must catch original defects first where feasible.
- Leave unverified device/Telegram behavior explicitly documented; do not label partial coverage a complete certification.

## Work tickets
1. Baseline: dependency audit, reachable-module inventory, browser/viewport/axe/performance probes.
2. Loading/security: compile styles, safe SDK initialization, headers, dependency repair.
3. UX/accessibility: landscape, login inputs, dialogs/focus, touch targets, readable hierarchy.
4. Runtime/state: lifecycle/timers/storage/external navigation; remove provably unused game remnants.
5. Verification: regression tests, browser and accessibility sweeps, before/after measurements, code review and handoff.

Changes stay in an audit branch until checked. Existing production remains at baseline during investigation.
