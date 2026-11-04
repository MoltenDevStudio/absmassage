// @vitest-environment jsdom
import React from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import CookieConsent from './CookieConsent'
import BookNowButton from './BookNowButton'
import BookingEmbedded from './BookingEmbedded'
import Footer from './Nav/Footer'
import { hasOptionalTrackingConsent } from '../lib/optionalTracking'

const integrations = vi.hoisted(() => ({
  analytics: undefined as undefined | ((event: unknown) => unknown),
  speed: undefined as undefined | ((event: unknown) => unknown),
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('@vercel/analytics/react', () => ({
  Analytics: ({ beforeSend }: { beforeSend: (event: unknown) => unknown }) => {
    integrations.analytics = beforeSend
    return <div data-testid="analytics" />
  },
}))
vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: ({
    beforeSend,
  }: {
    beforeSend: (event: unknown) => unknown
  }) => {
    integrations.speed = beforeSend
    return <div data-testid="speed" />
  },
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('withdraws all integrations and booking attribution when storage stops working', async () => {
  // A failed save must not attempt a document reload.
  const reloadError = vi.spyOn(console, 'error').mockImplementation(() => {})
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('BroadcastChannel', undefined)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country: 'NZ' }),
    }),
  )
  window.history.replaceState(null, '', '/?gclid=ad-click')
  const page = (
    <CookieConsent>
      <BookNowButton className="booking" />
      <BookingEmbedded />
      <Footer />
    </CookieConsent>
  )
  const mounted = render(page)
  await screen.findByTestId('analytics')
  const event = { url: '/' }
  expect(integrations.analytics!(event)).toBe(event)
  expect(integrations.speed!(event)).toBe(event)
  const link = screen.getAllByRole('link', {
    name: 'Book Now',
  })[0] as HTMLAnchorElement
  await waitFor(() => expect(link.href).toContain('gclid=ad-click'))
  const gtm = document.querySelector('script[src*="gtm.js"]')!
  const meta = document.querySelector('script[src*="fbevents.js"]')!
  const pixel = vi.fn()
  window.fbq!.callMethod = pixel
  meta.dispatchEvent(new Event('load'))
  gtm.dispatchEvent(new Event('load'))
  const blockedStorage = vi
    .spyOn(window, 'localStorage', 'get')
    .mockImplementation(() => {
      throw new Error('storage blocked')
    })
  vi.spyOn(document, 'cookie', 'get').mockReturnValue('')
  vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {})
  fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }))
  fireEvent.click(screen.getByRole('button', { name: 'Reject all' }))

  expect(hasOptionalTrackingConsent()).toBe(false)
  expect(integrations.analytics!(event)).toBeNull()
  expect(integrations.speed!(event)).toBeNull()
  expect(screen.queryByTestId('analytics')).toBeNull()
  expect(screen.queryByTestId('speed')).toBeNull()
  expect(link.href).not.toContain('gclid')
  expect(sessionStorage.getItem('gclid')).toBeNull()
  expect(pixel).toHaveBeenLastCalledWith('consent', 'revoke')
  window.dispatchEvent(
    new MessageEvent('message', {
      data: 'cliniko-bookings-page:confirmed',
    }),
  )
  expect(
    window.dataLayer!.filter(
      (entry) =>
        !('length' in entry) && entry.event === 'clinikoBookingCompleted',
    ),
  ).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }))
  expect(document.querySelector('aside p')?.textContent).toContain(
    'currently disabled',
  )
  expect(reloadError).not.toHaveBeenCalled()
  expect(screen.getByRole('status').textContent).toContain('could not be saved')

  mounted.unmount()
  render(page)
  expect(hasOptionalTrackingConsent()).toBe(false)
  blockedStorage.mockRestore()
  fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }))
  fireEvent.click(screen.getByRole('button', { name: 'Accept all' }))
  expect(hasOptionalTrackingConsent()).toBe(true)
  expect(integrations.analytics!(event)).toBe(event)
  expect(integrations.speed!(event)).toBe(event)
  const googleCommands = window.dataLayer!.filter((entry) => 'length' in entry)
  expect(Array.from(googleCommands.at(-1) as IArguments)).toEqual([
    'consent',
    'update',
    {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    },
  ])
  window.dispatchEvent(
    new MessageEvent('message', { data: 'cliniko-bookings-page:confirmed' }),
  )
  expect(
    window.dataLayer!.filter(
      (entry) =>
        !('length' in entry) && entry.event === 'clinikoBookingCompleted',
    ),
  ).toHaveLength(1)
  expect(
    window.dataLayer!.filter(
      (entry) => !('length' in entry) && entry.event === 'gtm.js',
    ),
  ).toHaveLength(1)
  expect(document.querySelectorAll('script[src*="gtm.js"]')).toHaveLength(1)
  expect(document.querySelectorAll('script[src*="fbevents.js"]')).toHaveLength(
    1,
  )
  expect(pixel.mock.calls.filter((call) => call[0] === 'init')).toHaveLength(1)
  expect(pixel.mock.calls.filter((call) => call[0] === 'track')).toHaveLength(2)
  expect(reloadError).not.toHaveBeenCalled()
})
