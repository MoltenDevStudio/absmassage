// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import CookieConsent from './CookieConsent'
import BookNowButton from './BookNowButton'
import BookingEmbedded from './BookingEmbedded'
import Footer from './Nav/Footer'
import { CONSENT_COOKIE, CONSENT_STORAGE_KEY } from '../lib/optionalTracking'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('BroadcastChannel', undefined)
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`
  document.head.innerHTML = ''
  delete window.fbq
  delete window._fbq
  delete window.dataLayer
  sessionStorage.clear()
  localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ country: null }) }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('keeps footer settings available and remembers explicit choices', () => {
  const page = (
    <CookieConsent>
      Page content
      <Footer />
    </CookieConsent>
  )
  const first = render(page)
  expect(screen.queryByRole('region', { name: 'Cookie settings' })).toBeNull()
  expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
  const openSettings = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }))
  openSettings()
  expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
  openSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Reject all' }))
  expect(
    JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!).choices,
  ).toEqual({ analytics: false, advertising: false })
  expect(screen.queryByRole('region', { name: 'Cookie settings' })).toBeNull()
  expect(
    screen.getByRole('button', { name: 'Cookie settings' }).closest('.footer'),
  ).toBeTruthy()
  first.unmount()
  render(page)
  expect(screen.queryByRole('region', { name: 'Cookie settings' })).toBeNull()
  openSettings()
  expect(document.querySelector('aside p')?.textContent).toContain(
    'currently disabled',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Accept all' }))
  expect(
    JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!).choices,
  ).toEqual({ analytics: true, advertising: true })
  expect(document.querySelectorAll('script[src*="gtm.js"]')).toHaveLength(1)
})

it('starts once for a first-time NZ visitor without a banner or saved acceptance, including StrictMode', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ country: 'NZ' }) }),
  )
  render(
    <React.StrictMode>
      <CookieConsent>
        <Footer />
      </CookieConsent>
    </React.StrictMode>,
  )
  await waitFor(() =>
    expect(document.querySelectorAll('script[src*="gtm.js"]')).toHaveLength(1),
  )
  expect(document.querySelectorAll('script[src*="fbevents.js"]')).toHaveLength(
    1,
  )
  expect(screen.queryByRole('region', { name: 'Cookie settings' })).toBeNull()
  expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
  expect(document.cookie).not.toContain(CONSENT_COOKIE)
  fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }))
  expect(document.querySelector('aside p')?.textContent).toContain(
    'currently enabled',
  )
})

it('includes no optional script or tracking image in HTML when JavaScript is disabled', () => {
  const html = renderToString(<CookieConsent>Page content</CookieConsent>)
  expect(html).toContain('Page content')
  expect(html).not.toMatch(
    /fbevents|googletagmanager|facebook.com\/tr|noscript/,
  )
})

it('gates booking attribution and booking conversion events on the same choice', () => {
  sessionStorage.setItem('gclid', 'saved-ad-click')
  render(
    <React.StrictMode>
      <CookieConsent>
        <BookNowButton className="booking" />
        <BookingEmbedded />
        <Footer />
      </CookieConsent>
    </React.StrictMode>,
  )
  const link = screen.getAllByRole('link', {
    name: 'Book Now',
  })[0] as HTMLAnchorElement
  expect(link.href).not.toContain('gclid')
  window.dispatchEvent(
    new MessageEvent('message', { data: 'cliniko-bookings-page:confirmed' }),
  )
  expect(window.dataLayer).toBeUndefined()
  fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }))
  fireEvent.click(screen.getByRole('button', { name: 'Accept all' }))
  expect(screen.queryByRole('region', { name: 'Cookie settings' })).toBeNull()
  expect(screen.getByRole('button', { name: /cookie settings/i })).toBeTruthy()
  expect(link.href).toContain('gclid=saved-ad-click')
  expect(document.querySelectorAll('script[src*="gtm.js"]')).toHaveLength(1)
  expect(document.querySelectorAll('script[src*="fbevents.js"]')).toHaveLength(
    1,
  )
  window.dispatchEvent(
    new MessageEvent('message', { data: 'cliniko-bookings-page:confirmed' }),
  )
  expect(
    window.dataLayer!.some(
      (event) =>
        !('length' in event) && event.event === 'clinikoBookingCompleted',
    ),
  ).toBe(false)
  document
    .querySelector('script[src*="googletagmanager.com/gtm.js"]')!
    .dispatchEvent(new Event('load'))
  expect(
    window.dataLayer!.filter(
      (event) => 'event' in event && event.event === 'clinikoBookingCompleted',
    ),
  ).toHaveLength(1)
  window.dispatchEvent(
    new MessageEvent('message', { data: 'cliniko-bookings-page:confirmed' }),
  )
  expect(
    window.dataLayer!.filter(
      (event) => 'event' in event && event.event === 'clinikoBookingCompleted',
    ),
  ).toHaveLength(2)
  // Even before a synchronization message arrives, a rejected durable choice
  // blocks the conversion event and strips GCLID from a newly clicked link.
  document.cookie = `${CONSENT_COOKIE}=rejected; Path=/`
  window.dispatchEvent(
    new MessageEvent('message', { data: 'cliniko-bookings-page:confirmed' }),
  )
  expect(
    window.dataLayer!.filter(
      (event) => 'event' in event && event.event === 'clinikoBookingCompleted',
    ),
  ).toHaveLength(2)
  fireEvent.click(link)
  expect(link.href).not.toContain('gclid')
})

it.each(['DE', 'NO', 'IS', 'LI', 'GB', 'CH', 'US', null])(
  'shows the existing banner for %s with equal accept/reject controls and no trackers',
  async (country) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ country }) }),
    )
    render(
      <CookieConsent>
        <Footer />
      </CookieConsent>,
    )
    await screen.findByRole('region', { name: 'Cookie settings' })
    const accept = screen.getByRole('button', { name: 'Accept all' })
    const reject = screen.getByRole('button', { name: 'Reject all' })
    expect(accept.className).toBe(reject.className)
    expect(document.querySelectorAll('script')).toHaveLength(0)
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    fireEvent.click(reject)
    expect(screen.queryByRole('region', { name: 'Cookie settings' })).toBeNull()
    expect(document.querySelectorAll('script')).toHaveLength(0)
    const decision = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!)
    expect(decision.country).toBe(country)
    expect(decision.choices).toEqual({ analytics: false, advertising: false })
    expect(Number.isFinite(Date.parse(decision.timestamp))).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Accept all' }))
    expect(document.querySelectorAll('script[src*="gtm.js"]')).toHaveLength(1)
    expect(
      document.querySelectorAll('script[src*="fbevents.js"]'),
    ).toHaveLength(1)
    expect(
      JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!).choices,
    ).toEqual({ analytics: true, advertising: true })
  },
)

it.each(['accepted', 'rejected'] as const)(
  'does not prompt a returning European visitor with legacy %s preferences',
  async (choice) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ country: 'DE' }) }),
    )
    document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/`
    render(
      <CookieConsent>
        <Footer />
      </CookieConsent>,
    )
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    expect(screen.queryByRole('region', { name: 'Cookie settings' })).toBeNull()
    expect(document.querySelectorAll('script[src*="gtm.js"]')).toHaveLength(
      choice === 'accepted' ? 1 : 0,
    )
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
  },
)

it('requires consent after a failed lookup, without loading advertising scripts', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  render(
    <CookieConsent>
      <Footer />
    </CookieConsent>,
  )
  await screen.findByRole('button', { name: 'Accept all' })
  expect(document.querySelectorAll('script')).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: 'Accept all' }))
  expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!)).toMatchObject({
    region: 'UNKNOWN',
    country: null,
    choices: { analytics: true, advertising: true },
  })
})
