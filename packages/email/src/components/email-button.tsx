import { Link } from 'react-email'

import { emailTokens } from '../tokens'

interface EmailButtonProps {
  href: string
  children: string
  variant?: 'primary' | 'secondary'
}

/**
 * Reusable CTA button for email templates.
 * Uses a table-based layout for compatibility with Outlook and legacy clients.
 */
export function EmailButton({
  href,
  children,
  variant = 'primary',
}: EmailButtonProps) {
  const isPrimary = variant === 'primary'
  return (
    <table
      width='100%'
      cellPadding='0'
      cellSpacing='0'
      style={{ margin: '24px 0' }}
    >
      <tbody>
        <tr>
          <td align='center'>
            <Link
              href={href}
              style={{
                display: 'inline-block',
                backgroundColor: isPrimary
                  ? emailTokens.colors.brand
                  : emailTokens.colors.secondary,
                color: isPrimary
                  ? emailTokens.colors.brandForeground
                  : emailTokens.colors.secondaryForeground,
                textDecoration: 'none',
                padding: '12px 32px',
                borderRadius: emailTokens.radii.md,
                fontSize: '14px',
                fontWeight: '600',
                lineHeight: '1.5',
                fontFamily: emailTokens.typography.fontFamily,
              }}
            >
              {children}
            </Link>
          </td>
        </tr>
      </tbody>
    </table>
  )
}
