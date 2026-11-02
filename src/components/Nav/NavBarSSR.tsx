'use client'

import absmlogo from '../../../images/logos/andrew-bolton-massage-therapy-logo.png'
import NavLinks from './NavLinks'
import { useEffect, useRef, useState } from 'react'
import { FaBars } from 'react-icons/fa6'
import Link from 'next/link'

function NavBarSSR() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [screenSize, setScreenSize] = useState<number>()
  const [navHeight, setNavHeight] = useState(65)
  const [isSmallScreen, setIsSmallScreen] = useState(true)
  const logoRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setScreenSize(window.innerWidth)
      setIsSmallScreen(window.innerWidth < 820)

      const logo = logoRef.current
      if (logo?.complete) {
        setNavHeight(logo.offsetHeight)
      } else if (logo) {
        logo.onload = () => setNavHeight(logo.offsetHeight)
      }

      const handleResize = () => {
        setScreenSize(window.innerWidth)
        if (logo) setNavHeight(logo.offsetHeight)
      }

      window.addEventListener('resize', handleResize)
      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  // update css when navHeight changes
  useEffect(() => {
    if (navHeight) {
      document.documentElement.style.setProperty(
        '--nav-height',
        `${navHeight}px`,
      )
    }
  }, [navHeight])

  useEffect(() => {
    if (screenSize) {
      setIsSmallScreen(screenSize < 820)
    }
  }, [screenSize, setIsSmallScreen])

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleOpenMenuClick = () => {
    if (isMenuOpen === true) {
      setIsMenuOpen(false)
    }
  }

  const ATTRIBUTION = `
  Icon by fontAwesome from https://fontawesome.com/ & React Icons, licensed under CC BY 4.0 License - https://creativecommons.org/licenses/by/4.0/.
`

  return (
    <div
      className={`nav-bar ${isMenuOpen && isSmallScreen ? 'open' : ''}`}
      style={{
        maxHeight: `${!isMenuOpen && isSmallScreen ? navHeight : 420}px`,
      }}
    >
      <Link
        href={'/'}
        className="header-logo nav-link"
        onClick={handleOpenMenuClick}
      >
        <img
          ref={logoRef}
          src={absmlogo.src}
          alt="Andrew Bolton Massage Therapy logo"
        />
      </Link>

      {isSmallScreen && (
        <div
          className="menu-btn-container"
          style={{
            height: `${!isMenuOpen && isSmallScreen && navHeight}px`,
            fontSize: `${!isMenuOpen && isSmallScreen && navHeight * 0.66}px`,
            right: `${!isMenuOpen && isSmallScreen && navHeight * 0.5}px`,
          }}
        >
          <button className="menu-btn" onClick={handleMenuToggle}>
            <FaBars />
            <div style={{ display: 'none' }}>{ATTRIBUTION}</div>
          </button>
        </div>
      )}
      <div
        className={`menu-container ${isMenuOpen && isSmallScreen ? 'open' : ''}`}
      >
        {!isSmallScreen ? (
          <NavLinks handleOpenMenuClick={handleOpenMenuClick} />
        ) : (
          <div>
            <div
              className={`accordian ${isMenuOpen ? 'open' : ''}`}
              style={{
                marginRight: `${!isMenuOpen && isSmallScreen && navHeight * 0.5}px`,
              }}
            >
              <NavLinks handleOpenMenuClick={handleOpenMenuClick} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NavBarSSR
