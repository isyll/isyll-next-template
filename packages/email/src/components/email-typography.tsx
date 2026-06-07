import { emailTokens } from '../tokens'

interface EmailHeadingProps {
  children: React.ReactNode
  level?: 1 | 2 | 3
}

export function EmailHeading({ children, level = 1 }: EmailHeadingProps) {
  const sizeMap: Record<number, string> = { 1: '28px', 2: '22px', 3: '18px' }
  const fontSize = sizeMap[level] ?? '28px'
  // Template literal cast needed for JSX element type.
  const tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
  const Tag = tag as keyof React.JSX.IntrinsicElements
  return (
    <Tag
      style={{
        fontSize,
        fontWeight: '700',
        color: emailTokens.colors.foreground,
        lineHeight: '1.3',
        margin: '0 0 16px',
        fontFamily: emailTokens.typography.fontFamily,
      }}
    >
      {children}
    </Tag>
  )
}

interface EmailTextProps {
  children: React.ReactNode
  muted?: boolean
  small?: boolean
}

export function EmailText({
  children,
  muted = false,
  small = false,
}: EmailTextProps) {
  return (
    <p
      style={{
        fontSize: small ? '13px' : '15px',
        lineHeight: '1.6',
        color: muted
          ? emailTokens.colors.mutedForeground
          : emailTokens.colors.foreground,
        margin: '0 0 16px',
        fontFamily: emailTokens.typography.fontFamily,
      }}
    >
      {children}
    </p>
  )
}
