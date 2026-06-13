import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Accessibility gate (WCAG 2.2 AA). Three complementary checks:
 *   1. axe-core scans of the public pages for detectable WCAG violations.
 *   2. Keyboard operability + a visible focus indicator on the auth form.
 *   3. `prefers-reduced-motion` is honored (animations collapsed to ~0).
 *
 * The static half of the gate is `eslint-plugin-jsx-a11y` (runs in `lint`).
 * Authenticated pages (dashboard/admin) rely on that static pass plus future
 * session-backed E2E; these scans cover the unauthenticated surface.
 */

// The WCAG tag set axe can evaluate automatically. Scoping to these tags keeps
// best-practice-only rules (e.g. "region") from failing the gate.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const PUBLIC_ROUTES = ['/', '/login', '/register'] as const

test.describe('accessibility — axe-core (WCAG 2.2 AA)', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} has no detectable WCAG violations`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      const { violations } = await new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .analyze()

      // Surface a readable summary when the gate trips.
      expect(
        violations,
        violations
          .map((v) => `${v.id} (${v.impact ?? 'n/a'}): ${v.help}`)
          .join('\n')
      ).toEqual([])
    })
  }
})

test.describe('accessibility — keyboard & visible focus', () => {
  test('login form is operable by keyboard with a visible focus ring', async ({
    page,
  }) => {
    await page.goto('/login')

    const probeFocus = () =>
      page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return null
        const style = getComputedStyle(el)
        return {
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          // The shared components render the focus-visible ring as a box-shadow.
          hasFocusRing:
            style.outlineStyle !== 'none' || style.boxShadow !== 'none',
        }
      })

    const reached: NonNullable<Awaited<ReturnType<typeof probeFocus>>>[] = []
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const info = await probeFocus()
      if (info) reached.push(info)
    }

    const email = reached.find((c) => c.type === 'email')
    const password = reached.find((c) => c.type === 'password')
    const submit = reached.find((c) => c.tag === 'button')

    // Every interactive control is reachable via Tab (WCAG 2.1.1)...
    expect(email, 'email field reachable by keyboard').toBeTruthy()
    expect(password, 'password field reachable by keyboard').toBeTruthy()
    expect(submit, 'submit button reachable by keyboard').toBeTruthy()
    // ...and exposes a visible focus indicator (WCAG 2.4.7).
    for (const control of [email, password, submit]) {
      expect(control?.hasFocusRing).toBe(true)
    }
  })
})

test.describe('accessibility — prefers-reduced-motion', () => {
  test('animations are neutralized when reduced motion is requested', async ({
    page,
  }) => {
    // Emulate the preference imperatively (reliable across browsers), then load.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    // Sanity-check the emulation actually took, so a failure below points at
    // the CSS reset rather than the test harness.
    const matches = await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
    expect(matches, 'reduced-motion media feature is emulated').toBe(true)

    // Probe with a synthetic animated element so the assertion does not depend
    // on a specific page using animation. Drive it from a stylesheet using the
    // `animation-duration` longhand (not the inline `animation` shorthand, which
    // WebKit reports inconsistently) so the global `!important` reset overrides
    // it identically across engines.
    const duration = await page.evaluate(() => {
      const style = document.createElement('style')
      style.textContent =
        '@keyframes rm-probe{to{opacity:0}}' +
        '.rm-probe{animation-name:rm-probe;animation-duration:2s;animation-iteration-count:infinite}'
      document.head.appendChild(style)
      const el = document.createElement('div')
      el.className = 'rm-probe'
      document.body.appendChild(el)
      const value = getComputedStyle(el).animationDuration
      el.remove()
      style.remove()
      return value
    })

    const ms = duration.endsWith('ms')
      ? Number.parseFloat(duration)
      : Number.parseFloat(duration) * 1000
    expect(ms).toBeLessThan(50)
  })
})
