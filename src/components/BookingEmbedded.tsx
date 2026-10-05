'use client'
import { useState, useEffect } from 'react'
import '../styles/Booking.scss'
import React from 'react'
import { useOptionalTracking } from './CookieConsent'

function BookingEmbedded() {
  const { trackBookingCompleted } = useOptionalTracking()
  const [height, setHeight] = useState('1000px')

  useEffect(() => {
    const handleIFrameMessage = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return
      if (e.data.includes('cliniko-bookings-resize')) {
        const newHeight = Number(e.data.split(':')[1])
        setHeight(`${newHeight}px`)
      }
      if (e.data.search('cliniko-bookings-page:confirmed') > -1) {
        trackBookingCompleted()
      }
      if (e.data.includes('cliniko-bookings-page')) {
        const clinikoBookings = document.getElementById('cliniko-94087596')
        clinikoBookings!.scrollIntoView()
      }
    }
    window.addEventListener('message', handleIFrameMessage)
    return () => {
      window.removeEventListener('message', handleIFrameMessage)
    }
  }, [trackBookingCompleted])

  return (
    <div className="booking-container">
      <div className="booking-embed">
        <h3 className="booking-heading">
          <em>Book Online</em>
        </h3>
        <iframe
          id="cliniko-94087596"
          title="cliniko-booking"
          src={`https://andrew-bolton-massage-and-yoga.cliniko.com/bookings?embedded=true`}
          width="100%"
          height={height}
          scrolling="auto"
          style={{ pointerEvents: 'auto' }}
          loading="lazy"
        />
      </div>
    </div>
  )
}

export default BookingEmbedded
