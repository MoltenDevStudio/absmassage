'use client'

import { useEffect, useRef, useState } from 'react'

type GiftUp = {
  (...args: unknown[]): void
  q?: unknown[][]
}

// Public site ID supplied by Gift Up; no checkout URL or secret is needed.
const GIFT_UP_SITE_ID = '07f1d109-e359-4c76-8c8c-607cdf2bcad7'

export default function GiftUpWidget() {
  const targetRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    const giftUpWindow = window as Window & { giftup?: GiftUp }
    giftUpWindow.giftup =
      giftUpWindow.giftup ||
      function (...args: unknown[]) {
        const giftup = giftUpWindow.giftup!
        ;(giftup.q = giftup.q || []).push(args)
      }

    // Use the supplied bootstrap on each mount, including client navigation.
    const script = document.createElement('script')
    script.src = 'https://cdn.yourgift.cards/dist/gift-up.js'
    script.async = true
    script.onerror = () => setStatus('error')

    const timeout = window.setTimeout(() => setStatus('error'), 15000)
    const observer = new MutationObserver(() => {
      if (target.querySelector('iframe')) {
        window.clearTimeout(timeout)
        setStatus('ready')
      }
    })
    observer.observe(target, { childList: true, subtree: true })
    document.body.appendChild(script)

    return () => {
      window.clearTimeout(timeout)
      observer.disconnect()
      script.onerror = null
      script.remove()
    }
  }, [])

  return (
    <section className="gift-up-widget" aria-label="Buy a gift voucher">
      {status === 'loading' && <p role="status">Loading gift vouchers…</p>}
      <div
        ref={targetRef}
        className="gift-up-target"
        data-site-id={GIFT_UP_SITE_ID}
        data-platform="Other"
      />
      {status === 'error' && (
        <p role="status">
          Gift voucher checkout couldn’t load. Please{' '}
          <a href="/gift-vouchers" className="underline">
            try again
          </a>{' '}
          or contact me for help.
        </p>
      )}
      <noscript>
        <p>Please enable JavaScript to buy a gift voucher online.</p>
      </noscript>
      <p className="gift-vouchers-help">
        Need a hand?{' '}
        <a
          href="mailto:andrew@andrewboltonsportsmassage.com"
          className="underline"
        >
          Contact me about gift vouchers
        </a>
        .
      </p>
    </section>
  )
}
