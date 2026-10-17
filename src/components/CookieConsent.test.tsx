// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import CookieConsent from './CookieConsent'
import BookNowButton from './BookNowButton'
import BookingEmbedded from './BookingEmbedded'
import Footer from './Nav/Footer'
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

it('remembers rejection and reopens cookie choices only from the footer', () => {
  const page = (
    <CookieConsent>
      Page content
      <Footer />
    </CookieConsent>
  )
  const first = render(page)
  expect(
    screen.getByRole('heading', { name: 'Cookie choices' }).className,
  ).toContain('sr-only')
  expect(document.querySelector('aside p')?.textContent).toBe(
    'I use cookies & similar tech to understand site use & help with marketing. See my Privacy Policy.',
  )
  expect(
    screen
      .getAllByRole('link', { name: 'Privacy Policy' })[0]
      .getAttribute('href'),
  ).toBe('/privacypolicy')
  const rejectButton = screen.getByRole('button', { name: 'Reject' })
  const acceptButton = screen.getByRole('button', { name: 'Accept' })
  expect(rejectButton.parentElement).toBe(acceptButton.parentElement)
  expect(rejectButton.parentElement?.className).toContain('flex gap-2')
  expect(rejectButton.parentElement?.parentElement?.className).toContain(
    'justify-center',
  )
  expect(rejectButton.className).toContain('min-h-10')
  expect(rejectButton.className).toContain('py-1.5')
  expect(rejectButton.className).toContain('rounded-lg')
  expect(acceptButton.className).toContain('min-h-10')
  expect(acceptButton.className).toContain('py-1.5')
  expect(acceptButton.className).toContain('rounded-lg')
  expect(document.querySelector('script')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
  expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull()
  const settings = screen.getAllByRole('button', { name: 'Cookie settings' })
  expect(settings).toHaveLength(1)
  expect(settings[0].closest('.footer')).not.toBeNull()
  first.unmount()
  render(page)
  expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }))
  expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Close' }).className).toContain(
    'right-0',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(
    screen.getByRole('button', { name: 'Cookie settings' }).closest('.footer'),
  ).toBeTruthy()
  expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull()
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
  fireEvent.click(screen.getByRole('button', { name: 'Accept' }))
  expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull()
  expect(screen.queryByRole('button', { name: /cookie settings/i })).toBeNull()
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
