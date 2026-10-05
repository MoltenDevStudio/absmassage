// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import CookieConsent from './CookieConsent'
import BookNowButton from './BookNowButton'
import BookingEmbedded from './BookingEmbedded'
import { CONSENT_COOKIE } from '../lib/optionalTracking'

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
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('renders the requested choices and remembers rejection with a settings control', () => {
  const first = render(<CookieConsent>Page content</CookieConsent>)
  expect(screen.getByRole('heading', { name: 'Cookie choices' })).toBeTruthy()
  expect(
    screen.getByText(/We use optional cookies and similar technologies/),
  ).toBeTruthy()
  expect(document.querySelector('script')).toBeNull()
  fireEvent.click(
    screen.getByRole('button', { name: 'Reject optional cookies' }),
  )
  expect(screen.queryByRole('heading', { name: 'Cookie choices' })).toBeNull()
  expect(
    screen.getByRole('button', { name: 'Change cookie settings' }),
  ).toBeTruthy()
  first.unmount()
  render(<CookieConsent>Page content</CookieConsent>)
  expect(screen.queryByRole('heading', { name: 'Cookie choices' })).toBeNull()
  fireEvent.click(
    screen.getByRole('button', { name: 'Change cookie settings' }),
  )
  expect(
    screen.getByRole('button', { name: 'Accept optional cookies' }),
  ).toBeTruthy()
  expect(document.querySelector('script')).toBeNull()
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
      </CookieConsent>
    </React.StrictMode>,
  )
  const link = screen.getByRole('link', {
    name: 'Book Now',
  }) as HTMLAnchorElement
  expect(link.href).not.toContain('gclid')
  window.dispatchEvent(
    new MessageEvent('message', { data: 'cliniko-bookings-page:confirmed' }),
  )
  expect(window.dataLayer).toBeUndefined()
  fireEvent.click(
    screen.getByRole('button', { name: 'Accept optional cookies' }),
  )
  expect(link.href).toContain('gclid=saved-ad-click')
  expect(document.querySelectorAll('script[src*="gtm.js"]')).toHaveLength(1)
  expect(document.querySelectorAll('script[src*="fbevents.js"]')).toHaveLength(
    1,
  )
  window.dispatchEvent(
    new MessageEvent('message', { data: 'cliniko-bookings-page:confirmed' }),
  )
  expect(
    window.dataLayer!.filter(
      (event) => 'event' in event && event.event === 'clinikoBookingCompleted',
    ),
  ).toHaveLength(1)
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
  ).toHaveLength(1)
  fireEvent.click(link)
  expect(link.href).not.toContain('gclid')
})
