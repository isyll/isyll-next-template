/**
 * Email design tokens — mirrors the CSS custom properties in
 * `packages/ui/src/styles/globals.css` but as static values (email clients
 * do not support CSS variables or Tailwind JIT at runtime).
 *
 * TO REBRAND: update both this file and the `--brand-*` block in globals.css.
 * Run `pnpm email:preview` to verify the changes look right in email clients.
 */
export const emailTokens = {
  colors: {
    background: '#ffffff',
    foreground: '#09090b',
    primary: '#18181b',
    primaryForeground: '#fafafa',
    secondary: '#f4f4f5',
    secondaryForeground: '#18181b',
    muted: '#f4f4f5',
    mutedForeground: '#71717a',
    border: '#e4e4e7',
    /** Brand accent — update when rebranding. */
    brand: '#6366f1',
    brandForeground: '#ffffff',
    success: '#16a34a',
    warning: '#ca8a04',
    destructive: '#dc2626',
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    /** Base body size in px — use as a number where needed. */
    basePx: 16,
  },
  spacing: {
    container: '600px',
    padding: '32px',
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
} as const

export type EmailTokens = typeof emailTokens
