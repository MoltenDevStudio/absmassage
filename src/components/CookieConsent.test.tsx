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

it('shows settings only from the footer, allows closing without a choice, and remembers rejection', () => {
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
  fireEvent.click(screen.getByRole('button', { name: 'Disable tracking' }))
  expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('rejected')
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
  fireEvent.click(screen.getByRole('button', { name: 'Enable tracking' }))
  expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('accepted')
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
  fireEvent.click(screen.getByRole('button', { name: 'Enable tracking' }))
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
