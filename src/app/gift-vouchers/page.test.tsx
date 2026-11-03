// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import GiftVouchersPage, { metadata } from './page'

afterEach(cleanup)

it('shows a practical introduction immediately before the existing checkout', () => {
  render(<GiftVouchersPage />)

  expect(screen.getAllByRole('heading')).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
    'Gift Vouchers',
  )
  const intro = screen.getByText(
    'Choose a gift voucher value below. Vouchers can be emailed or printed at home.',
  )
  expect(intro.nextElementSibling?.getAttribute('aria-label')).toBe(
    'Buy a gift voucher',
  )
  expect(
    document.querySelector('.gift-up-target')?.getAttribute('data-site-id'),
  ).toBe('07f1d109-e359-4c76-8c8c-607cdf2bcad7')
  expect(
    screen
      .getByRole('link', { name: /Contact me about gift vouchers/ })
      .getAttribute('href'),
  ).toBe('mailto:andrew@andrewboltonsportsmassage.com')
})

it('uses the same factual description for SEO and Open Graph', () => {
  expect(metadata.description).toBe(
    'Massage gift vouchers in Christchurch. Choose a voucher value, with email delivery or printing at home.',
  )
  expect(metadata.openGraph?.description).toBe(metadata.description)
})
