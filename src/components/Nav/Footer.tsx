'use client'
import Link from 'next/link'
import absmlogo from '../../../images/logos/andrew-bolton-sports-massage-logo.webp'
import { FaEnvelope, FaPhone, FaLocationDot } from 'react-icons/fa6'
import React, { useEffect, useState } from 'react'
import BookNowButton from '../BookNowButton'
import { useOptionalTracking } from '../CookieConsent'

function Footer() {
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const { openCookieSettings } = useOptionalTracking()

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setIsSmallScreen(window.innerWidth < 820)
      }
    }

    handleResize()

    window.addEventListener('resize', handleResize)
  }, [])

  const ATTRIBUTION = `
  Icon by fontAwesome from https://fontawesome.com/ & React Icons, licensed under CC BY 4.0 License - https://creativecommons.org/licenses/by/4.0/.
`

  return (
    <div className={`footer`}>
      <div className="row">
        {!isSmallScreen && (
          <div className="twenty-percent flex">
            <Link href={'/'} className="hover-link">
              <img
                className="footer-logo ml-3 mt-2 self-start"
                src={absmlogo.src}
                alt="Andrew Bolton Sports Massage"
              />
            </Link>
          </div>
        )}
        <div
          className={`footer-link-container ${!isSmallScreen && 'forty-percent flex-col'}  `}
        >
          <Link href={'/'} className={`footer-link hover-link inline-block `}>
            Home
          </Link>

          <Link
            href={'/services'}
            className={`footer-link hover-link  inline-block  `}
          >
            Services
          </Link>
          <Link
            href={'/about'}
            className={`footer-link hover-link  inline-block  `}
          >
            About
          </Link>
          <Link
            href={'/faq'}
            className={`footer-link hover-link  inline-block  `}
          >
            FAQ
          </Link>
          <Link
            href={'/contact'}
            className={`footer-link hover-link  inline-block  `}
          >
            Contact
          </Link>
          <Link
            href={'/refundcancellations'}
            className={`footer-link hover-link  inline-block  `}
          >
            Refunds & Cancellations
          </Link>
          <Link
            href={'/privacypolicy'}
            className={`footer-link hover-link  inline-block  `}
          >
            Privacy Policy
          </Link>
          <button
            type="button"
            className="footer-link hover-link inline-block text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={openCookieSettings}
          >
            Cookie settings
          </button>
          <BookNowButton className="footer-link hover-link  book-now-footer max-w-3xs inline-block" />
        </div>
        {!isSmallScreen && (
          <div className=" forty-percent flex flex-col flex-wrap content-center">
            <p className="hover-link">
              <a
                href="mailto:andrew@andrewboltonsportsmassage.com "
                target="_blank"
                rel="noreferrer"
              >
                <FaEnvelope /> andrew@andrewboltonsportsmassage.com
              </a>
            </p>

            <p className="hover-link">
              <FaPhone />{' '}
              <a href="tel:02041780923" target="_blank" rel="noreferrer">
                {' '}
                0204 178 0923
              </a>
            </p>
            <p className="hover-link">
              <FaLocationDot />
              <a
                href="https://www.google.com/maps/search/?api=1&query=21%20Laing%20Crescent%2C%20Heathcote%20Valley%2C%20Christchurch%208022%2C%20New%20Zealand"
                target="_blank"
                rel="noreferrer"
              >
                21 Laing Crescent,
                <br />
                Heathcote Valley 8022,
                <br />
                Christchurch NZ
              </a>
            </p>
            <div style={{ display: 'none' }}>{ATTRIBUTION}</div>
          </div>
        )}
      </div>
    </div>
  )
}
export default Footer
