import '@/app/globals.css'

import { Toaster } from '@/components/ui/sonner'
import { ClerkProvider } from '@clerk/nextjs'
import { Lato } from 'next/font/google'
import { esMX } from '@clerk/localizations'
import { Providers } from '@/components/providers' 

const lato = Lato({
  weight: ['100', '300', '400', '700', '900'],
  subsets: ['latin']
})

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
