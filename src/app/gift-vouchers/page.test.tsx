// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import GiftVouchersPage, { metadata } from './page'

afterEach(cleanup)

it('shows the requested introduction, checkout, description, and FAQs', () => {
  render(<GiftVouchersPage />)

  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
    'Gift Vouchers',
  )
  const intro = screen.getByText(
    'Buy a massage gift voucher below, then send it by email or print it at home.',
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

  expect(
    screen.getByRole('heading', {
      level: 2,
      name: 'Massage gift vouchers in Christchurch',
    }),
  ).toBeTruthy()
  expect(
    screen.getByRole('heading', {
      level: 2,
      name: 'Frequently asked questions',
    }),
  ).toBeTruthy()
  expect(
    screen.getByText(
      'Gift vouchers are valid for three years from the date of purchase.',
    ),
  ).toBeTruthy()
  expect(
    screen.getByText('Yes. Vouchers can be emailed or printed at home.'),
  ).toBeTruthy()
})

it('uses the same factual description for SEO and Open Graph', () => {
  expect(metadata.description).toBe(
    'Massage gift vouchers in Christchurch. Choose a voucher value, with email delivery or printing at home.',
  )
  expect(metadata.openGraph?.description).toBe(metadata.description)
})
