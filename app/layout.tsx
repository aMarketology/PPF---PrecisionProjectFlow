import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { organizationSchema, servicesSchema, reviewSchema } from '@/lib/schema'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Precision Product Flow | Expert Product Flow Solutions',
  description: 'Professional product flow optimization and management services. Streamline your operations with our expert team.',
  keywords: 'product flow, supply chain optimization, operations management, logistics',
  metadataBase: new URL('https://precisionproductflow.com'),
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    url: 'https://precisionproductflow.com',
    title: 'Precision Product Flow | Expert Flow Solutions',
    description: 'Professional product flow optimization and management services.',
    siteName: 'Precision Product Flow',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Precision Product Flow',
    description: 'Professional product flow optimization and management services',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(servicesSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(reviewSchema),
          }}
        />
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="your-google-verification" />
        {/* Additional Meta Tags */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${plusJakartaSans.variable} font-jakarta antialiased`}>
        {children}
      </body>
    </html>
  )
}
