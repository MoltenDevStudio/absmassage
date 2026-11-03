// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import GiftUpWidget from './GiftUpWidget'

const scriptSelector =
  'script[src="https://cdn.yourgift.cards/dist/gift-up.js"]'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  delete (window as Window & { giftup?: unknown }).giftup
})

it('replaces the loading message when Gift Up inserts its checkout', async () => {
  render(<GiftUpWidget />)
  expect(screen.getByRole('status').textContent).toContain('Loading')
  document
    .querySelector('.gift-up-target')!
    .appendChild(document.createElement('iframe'))

  await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
  expect(
    screen.getByRole('link', { name: /Contact me/ }).getAttribute('href'),
  ).toBe('mailto:andrew@andrewboltonsportsmassage.com')
})

it('offers a real retry and contact option when the script fails', () => {
  render(<GiftUpWidget />)
  fireEvent.error(document.querySelector(scriptSelector)!)

  expect(screen.getByRole('status').textContent).toContain('couldn’t load')
  expect(
    screen.getByRole('link', { name: 'try again' }).getAttribute('href'),
  ).toBe('/gift-vouchers')
})

it('does not leave checkout loading forever if the vendor does not respond', () => {
  vi.useFakeTimers()
  render(<GiftUpWidget />)
  // Advancing time is an external event, like a slow vendor response.
  fireEvent.load(document.querySelector(scriptSelector)!)
  return vi.advanceTimersByTimeAsync(15000).then(() => {
    expect(screen.getByRole('status').textContent).toContain('couldn’t load')
  })
})

it('cleans up and bootstraps again when visitors return via client navigation', () => {
  const first = render(<GiftUpWidget />)
  const firstScript = document.querySelector(scriptSelector)
  first.unmount()
  expect(document.querySelector(scriptSelector)).toBeNull()

  render(<GiftUpWidget />)
  expect(document.querySelectorAll(scriptSelector)).toHaveLength(1)
  expect(document.querySelector(scriptSelector)).not.toBe(firstScript)
})
