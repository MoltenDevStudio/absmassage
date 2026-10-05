'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const CONSENT_COOKIE = 'meta_pixel_consent'
const PIXEL_ID = '2126552771609777'
const SITE_DOMAIN = 'andrewboltonsportsmassage.com'

type ConsentChoice = 'accepted' | 'rejected' | null

type MetaPixelCommand =
  | ['consent', 'grant' | 'revoke']
  | ['init', string]
  | ['track', 'PageView']

type MetaPixelFunction = ((...args: MetaPixelCommand) => void) & {
  callMethod?: (...args: MetaPixelCommand) => void
  queue: IArguments[]
  push: MetaPixelFunction
  loaded: boolean
  version: string
}

declare global {
  interface Window {
    fbq?: MetaPixelFunction
    _fbq?: MetaPixelFunction
  }
}

function readConsent(): ConsentChoice {
  const choice = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
    ?.split('=')[1]

  if (choice === 'accepted' || choice === 'rejected') return choice
  return null
}

function writeConsent(choice: Exclude<ConsentChoice, null>) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
}

function clearMetaCookies() {
  const hostname = window.location.hostname.toLowerCase()
  const cookieDomains = new Set([hostname])

  if (hostname === SITE_DOMAIN || hostname.endsWith(`.${SITE_DOMAIN}`)) {
    cookieDomains.add(SITE_DOMAIN)
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const expiry = `=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax${secure}`

  for (const name of ['_fbp', '_fbc']) {
    for (const domain of cookieDomains) {
      document.cookie = `${name}${expiry}`
      document.cookie = `${name}${expiry}; Domain=${domain}`
    }
  }
}

function ensureMetaPixel(onLoad: () => void) {
  if (window.fbq) return

  const pixel = function (...args: MetaPixelCommand) {
    if (pixel.callMethod) pixel.callMethod(...args)
    else pixel.queue.push(arguments)
  } as MetaPixelFunction

  pixel.queue = []
  pixel.push = pixel
  pixel.loaded = true
  pixel.version = '2.0'
  window.fbq = window._fbq = pixel

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  script.addEventListener('load', onLoad, { once: true })
  document.head.appendChild(script)
}

function queueMetaPixel(...args: MetaPixelCommand) {
  window.fbq?.(...args)
}

export default function MetaPixelConsent() {
  const pathname = usePathname()
  const [consent, setConsent] = useState<ConsentChoice>(null)
  const [consentLoaded, setConsentLoaded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const appliedConsent = useRef<ConsentChoice>(null)
  const pixelInitialized = useRef(false)
  const pixelConsentGranted = useRef(false)
  const lastTrackedPathname = useRef<string | null>(null)

  useEffect(() => {
    setConsent(readConsent())
    setConsentLoaded(true)
  }, [])

  useEffect(() => {
    if (!consentLoaded || appliedConsent.current === consent) return

    appliedConsent.current = consent

    if (consent === 'rejected') {
      if (pixelConsentGranted.current) {
        queueMetaPixel('consent', 'revoke')
        pixelConsentGranted.current = false
      }
      lastTrackedPathname.current = null
      clearMetaCookies()
      return
    }

    if (consent !== 'accepted') return

    if (!pixelConsentGranted.current) {
      ensureMetaPixel(() => {
        if (!pixelConsentGranted.current) clearMetaCookies()
      })
      queueMetaPixel('consent', 'grant')
      pixelConsentGranted.current = true
    }

    if (!pixelInitialized.current) {
      queueMetaPixel('init', PIXEL_ID)
      pixelInitialized.current = true
    }

    if (lastTrackedPathname.current !== pathname) {
      queueMetaPixel('track', 'PageView')
      lastTrackedPathname.current = pathname
    }
  }, [consent, consentLoaded, pathname])

  function chooseConsent(choice: Exclude<ConsentChoice, null>) {
    writeConsent(choice)
    setConsent(choice)
    setSettingsOpen(false)
  }

  if (!consentLoaded) return null

  const showChoices = consent === null || settingsOpen

  return (
    <>
      {showChoices ? (
        <aside
          aria-labelledby="cookie-consent-heading"
          className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 bg-white px-4 py-5 text-left text-gray-900 shadow-2xl sm:px-6"
          role="region"
        >
          <div className="mx-auto max-w-6xl">
            <h2 id="cookie-consent-heading" className="m-0 text-lg font-bold">
              Your privacy choices
            </h2>
            <p className="my-2 max-w-3xl text-sm leading-relaxed">
              Allow the Meta Pixel to measure visits to this site and the
              effectiveness of our ads? If you accept, Meta may receive your IP
              address, browser and device details, and pages you visit. The
              pixel will not load unless you accept. Read our{' '}
              <a className="underline" href="/privacypolicy">
                Privacy Policy
              </a>
              . You can change your choice at any time in Cookie settings.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded border border-gray-400 px-4 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={() => chooseConsent('rejected')}
                type="button"
              >
                Reject advertising cookies
              </button>
              <button
                className="rounded bg-[#1f4c3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17392d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={() => chooseConsent('accepted')}
                type="button"
              >
                Accept advertising cookies
              </button>
              {consent !== null && (
                <button
                  className="rounded px-3 py-2 text-sm underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  onClick={() => setSettingsOpen(false)}
                  type="button"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </aside>
      ) : (
        <button
          aria-label="Change cookie settings"
          className="fixed bottom-3 left-3 z-[99] rounded-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-md hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => setSettingsOpen(true)}
          type="button"
        >
          Cookie settings
        </button>
      )}
    </>
  )
}
