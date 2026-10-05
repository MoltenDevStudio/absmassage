import '../styles/main.scss'
import '../styles/NavBar.scss'
// import NavBarSSR from '../components/Nav/NavBar'
import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { GoogleTagManager } from '@next/third-parties/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Raleway } from 'next/font/google'
import GclidTracker from '../components/GclidTracker.tsx'
import MetaPixelConsent from '../components/MetaPixelConsent.tsx'

export const metadata: Metadata = {
  metadataBase: new URL('https://andrewboltonsportsmassage.com'),
  title: 'Sports Massage Christchurch | Deep Tissue Therapy | Andrew Bolton',
  description:
    "Sports & Deep Tissue Massage for serious pain relief. I'm an experienced therapist helping athletes & active people recover faster. Book now - from $80",
  robots: 'index, follow',
}

const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'HealthAndBeautyBusiness'],
  '@id': 'https://andrewboltonsportsmassage.com/#business',
  name: 'Andrew Bolton Sports Massage',
  url: 'https://andrewboltonsportsmassage.com',
  image: 'https://andrewboltonsportsmassage.com/icon.png',
  description:
    'Sports, deep tissue and relaxing massage in Heathcote Valley, Christchurch, helping active people relieve pain, release tension and recover well.',
  telephone: '+642041780923',
  email: 'andrew@andrewboltonsportsmassage.com',
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '21 Laing Crescent',
    addressLocality: 'Christchurch',
    addressRegion: 'Canterbury',
    postalCode: '8022',
    addressCountry: 'NZ',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Thursday'],
      opens: '09:00',
      closes: '19:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Tuesday', 'Wednesday', 'Friday'],
      opens: '09:00',
      closes: '17:00',
    },
  ],
  areaServed: [
    {
      '@type': 'City',
      name: 'Christchurch',
    },
    {
      '@type': 'Place',
      name: 'Heathcote Valley',
    },
  ],
  makesOffer: [
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Sports massage',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Deep tissue massage',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Relaxing massage',
      },
    },
  ],
}

const NavBarSSR = dynamic(() => import('../components/Nav/NavBarSSR.tsx'), {
  ssr: true,
})

const Footer = dynamic(() => import('../components/Nav/Footer.tsx'), {
  ssr: true,
})

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'], // choose weights you use
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={raleway.className}>
      <GoogleTagManager gtmId="GTM-PSTX555" />

      <body>
        <MetaPixelConsent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessJsonLd),
          }}
        />
        <GclidTracker />
        <NavBarSSR />

        <div id="root">{children}</div>
        <Analytics />
        <SpeedInsights />
        <Footer />
      </body>
    </html>
  )
}
