import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/settings/',
          '/messages/',
          '/orders/',
          '/checkout/',
        ],
      },
    ],
    sitemap: 'https://www.precisionprojectflow.com/sitemap.xml',
  }
}
