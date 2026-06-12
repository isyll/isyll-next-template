'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

/**
 * Global error boundary — catches errors in the root layout itself (e.g. a
 * crash in `generateMetadata` or the locale provider). It REPLACES the root
 * layout, so it must include its own `<html>` and `<body>` tags and manage
 * critical CSS inline.
 *
 * HOW TO CUSTOMISE:
 *   • Update the copy and styles to match your brand.
 *   • This page cannot use any Tailwind classes that depend on the root layout
 *     (no ThemeProvider, no fonts). Use inline styles only.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang='fr'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <title>Erreur — App</title>
      </head>
      <body
        style={{
          display: 'flex',
          minHeight: '100svh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          padding: '16px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#ffffff',
          color: '#09090b',
          margin: 0,
        }}
      >
        <div style={{ fontSize: '48px' }} aria-hidden='true'>
          ⚠️
        </div>

        <div style={{ maxWidth: '440px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, margin: '0 0 8px' }}>
            Une erreur critique est survenue
          </h1>
          <p style={{ fontSize: '15px', color: '#71717a', margin: 0 }}>
            Nous n&apos;avons pas pu charger l&apos;application. Veuillez
            actualiser la page ou contacter le support.
          </p>
          {error.digest !== undefined && error.digest.length > 0 ? (
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#a1a1aa',
                marginTop: '8px',
              }}
            >
              Référence : {error.digest}
            </p>
          ) : null}
        </div>

        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#18181b',
            color: '#fafafa',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  )
}
