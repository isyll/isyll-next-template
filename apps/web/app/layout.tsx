import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import '@workspace/ui/globals.css'
import { cn } from '@workspace/ui/lib/utils'

import { Providers } from '@/components/providers'

const fontSans = Inter({ subsets: ['latin'], variable: '--font-sans' })
const fontMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return {
    title: { default: t('title'), template: `%s · ${t('title')}` },
    description: t('description'),
  }
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(fontSans.variable, fontMono.variable)}
    >
      <body className='font-sans antialiased'>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
