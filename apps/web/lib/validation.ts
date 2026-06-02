import 'server-only'

import { getTranslations } from 'next-intl/server'
import * as z from 'zod'

/**
 * Localized field schemas for server-side validation. Use inside a
 * next-safe-action async `inputSchema` factory so every Zod error is rendered
 * through next-intl — adding a locale is just translating the `Validation`
 * keys, with no code change.
 *
 *   schema: async () => {
 *     const v = await getValidators()
 *     return z.object({ email: v.email(), name: v.requiredString() })
 *   }
 */
export async function getValidators() {
  const t = await getTranslations('Validation')
  return {
    requiredString: () =>
      z
        .string()
        .trim()
        .min(1, { error: t('required') }),
    email: () => z.email({ error: t('email') }),
    password: (min = 12) =>
      z.string().min(min, { error: t('passwordMin', { min }) }),
    max: (schema: z.ZodString, length: number) =>
      schema.max(length, { error: t('max', { max: length }) }),
  }
}
