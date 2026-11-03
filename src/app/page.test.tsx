// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import Page from './page'

vi.mock('../components/VideoHero', () => ({ default: () => null }))
vi.mock('../components/Slider', () => ({ default: () => null }))
vi.mock('../components/GoogleReviewsWidget', () => ({ default: () => null }))
vi.mock('../components/BookNowButton', () => ({ default: () => null }))
vi.mock('./services/prices', () => ({ default: () => null }))
vi.mock('../lib/getBlogPosts', () => ({ getPosts: () => [] }))
vi.mock('../components/Map', () => ({
  default: () => <div data-testid="map" />,
}))
vi.mock('../components/BlogWidget', () => ({
  BlogWidget: () => <div data-testid="blog" />,
}))
vi.mock('../components/BookingEmbedded', () => ({
  default: () => <div data-testid="booking" />,
}))
vi.mock('../components/Mailchimp', () => ({
  default: () => <div data-testid="newsletter" />,
}))

afterEach(cleanup)

it('keeps a compact voucher link between the map and blog, followed by booking and newsletter', () => {
  render(<Page />)

  const map = screen.getByTestId('map')
  const vouchers = map.nextElementSibling
  expect(vouchers?.tagName).toBe('SECTION')
  expect(vouchers?.querySelector('h2')?.textContent).toBe('Gift Vouchers')
  expect(vouchers?.querySelector('p')).toBeNull()
  expect(
    screen
      .getByRole('link', { name: 'Buy a Gift Voucher' })
      .getAttribute('href'),
  ).toBe('/gift-vouchers')
  expect(vouchers?.nextElementSibling).toBe(screen.getByTestId('blog'))
  expect(screen.getByTestId('blog').nextElementSibling).toBe(
    screen.getByTestId('booking'),
  )
  expect(screen.getByTestId('booking').nextElementSibling).toBe(
    screen.getByTestId('newsletter'),
  )
})
