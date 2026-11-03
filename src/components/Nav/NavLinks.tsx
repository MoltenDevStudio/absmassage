import React from 'react'
import Link from 'next/link'
import BookNowButton from '../../components/BookNowButton.tsx'

interface Props {
  handleOpenMenuClick: () => void
}

function NavLinks({ handleOpenMenuClick }: Props) {
  return (
    <>
      <Link
        href={'/services'}
        onClick={handleOpenMenuClick}
        className="nav-link"
      >
        Services
      </Link>
      <Link href={'/about'} onClick={handleOpenMenuClick} className="nav-link">
        About
      </Link>
      <Link href={'/faq'} onClick={handleOpenMenuClick} className="nav-link">
        FAQ
      </Link>
      <Link
        href={'/contact'}
        onClick={handleOpenMenuClick}
        className="nav-link"
      >
        Contact
      </Link>
      <Link href={'/blog'} onClick={handleOpenMenuClick} className="nav-link">
        Blog
      </Link>
      <Link
        href="/gift-vouchers"
        onClick={handleOpenMenuClick}
        className="nav-link"
      >
        Gift Vouchers
      </Link>
      <BookNowButton className="nav-link nav-book-now" />
    </>
  )
}

export default NavLinks
