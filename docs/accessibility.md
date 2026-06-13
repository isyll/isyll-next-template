# Accessibility

This template targets **WCAG 2.2 AA** and enforces it in CI, so accessibility is
a gate rather than an afterthought. The bar: semantic HTML, keyboard-operable
and screen-reader-friendly components, visible focus, sufficient contrast, and
honored motion preferences.

## Overview

Two automated layers run in CI, backed by a manual screen-reader pass for the
critical flows:

```text
                 ┌──────────────────────────────────────────────┐
  every PR/push  │  eslint-plugin-jsx-a11y  (in `lint`)          │  static
                 │  · labelled controls, valid ARIA, alt text…   │
                 └──────────────────────────────────────────────┘
                 ┌──────────────────────────────────────────────┐
  push to        │  axe-core + Playwright   (in the E2E suite)   │  runtime
  development    │  · WCAG 2.2 AA scan of the public pages       │  (real
                 │  · keyboard reachability + visible focus      │  browser)
                 │  · prefers-reduced-motion honored             │
                 └──────────────────────────────────────────────┘
```

## Static: `eslint-plugin-jsx-a11y`

The shared ESLint config (`@workspace/eslint-config`) wires the plugin's
`flatConfigs.recommended` into both the Next.js app config (`next-js`) and the
internal React-library config (`react-internal`), so every `.tsx` is linted for
common a11y mistakes — unlabelled controls, invalid/abused ARIA, missing `alt`,
mouse-only handlers, `<iframe>`s without a title. It runs in the `lint` task, so
it gates every PR.

Design-system primitives that defer association to their call site (the
`<label>` in `packages/ui`) carry a single justified
`eslint-disable-next-line` — keep those rare and commented.

## Runtime: axe-core in Playwright

`apps/web/e2e/a11y.spec.ts` runs in the E2E workflow against a real browser
(chromium/firefox/webkit) and asserts three things:

1. **No WCAG 2.2 AA violations** on the public pages (`/`, `/login`,
   `/register`) via `@axe-core/playwright`, scoped to the
   `wcag2a/2aa/21a/21aa/22aa` tag set. This includes **color contrast**, which
   only a real browser can compute.
2. **Keyboard operability + visible focus** — the auth form is fully reachable
   by `Tab`, and every control exposes a focus indicator (WCAG 2.1.1 / 2.4.7).
3. **`prefers-reduced-motion`** is honored (animations collapse to ~0).

Authenticated pages (dashboard, admin) rely on the static pass plus
session-backed E2E as those flows grow; extend `PUBLIC_ROUTES` / add an
authenticated context to widen the scan.

## Motion

`packages/ui/src/styles/globals.css` carries a global
`@media (prefers-reduced-motion: reduce)` reset that collapses animations,
transitions, and smooth scrolling for users who request it (WCAG 2.3.3). It
covers `tw-animate-css` utilities, `animate-*` spinners, and any `motion/react`
CSS — so new motion is safe by default. The E2E suite verifies it under an
emulated reduced-motion preference.

## Manual pass

Automation catches the mechanical failures, not whether a flow makes sense to a
screen-reader user. Before shipping a change to the auth or dashboard flows, do
a quick pass with VoiceOver (macOS) or NVDA (Windows): tab order is logical,
landmarks and headings describe the page, form errors are announced, and nothing
is keyboard-trapped.
