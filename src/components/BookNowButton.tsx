'use client'

import { useEffect, useState } from 'react'
import { useOptionalTrackingConsent } from './CookieConsent'
import { hasOptionalTrackingConsent } from '../lib/optionalTracking'

const BOOKING_URL =
  'https://andrew-bolton-massage-and-yoga.cliniko.com/bookings'

function bookingLink() {
  if (!hasOptionalTrackingConsent()) return BOOKING_URL
  try {
    const gclid = sessionStorage.getItem('gclid')
    const url = new URL(BOOKING_URL)
    if (gclid) url.searchParams.set('gclid', gclid)
    return url.toString()
  } catch {
    return BOOKING_URL
  }
}

interface Props {
  className: string
  text?: string
}

export default function BookNowButton({ className, text }: Props) {
  const consent = useOptionalTrackingConsent()
  const [link, setLink] = useState(BOOKING_URL)

  useEffect(() => {
    setLink(bookingLink())
  }, [consent])

  return (
    <a
      href={link}
      onClick={(event) => {
        event.currentTarget.href = bookingLink()
      }}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {text ? text : 'Book Now'}
    </a>
  )
}
