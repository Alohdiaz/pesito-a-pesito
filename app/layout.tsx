import '@/app/globals.css'

import { Toaster } from '@/components/ui/sonner'
import { ClerkProvider } from '@clerk/nextjs'
import { Lato } from 'next/font/google'
import { Metadata } from 'next'
import { esMX } from '@clerk/localizations'
import { Providers } from '@/components/providers'

const lato = Lato({
  weight: ['100', '300', '400', '700', '900'],
  subsets: ['latin']
})

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: {
    default: 'Asistente Financiero',
    template: '%s - Asistente Financiero'
  },
  description:
    'Asistente financiero impulsado por inteligencia artificial con datos bursátiles en tiempo real, gráficos interactivos, noticias de mercado y herramientas útiles para análisis financiero.',
  icons: {
    icon: '/favicon.ico'
  },
  openGraph: {
    images: [`${process.env.NEXT_PUBLIC_SITE_URL}/og.png`],
    siteName: 'Peso a Peso',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    title: 'Peso a Peso'
  }
}

export const viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: 'white' }]
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ClerkProvider localization={esMX}>
      <html lang="es" suppressHydrationWarning>
        <body className={lato.className}>
          <Providers>
            <Toaster position="top-center" />
            <div className="flex flex-col min-h-screen">
              <main className="flex flex-col flex-1 bg-background">{children}</main>
            </div>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
