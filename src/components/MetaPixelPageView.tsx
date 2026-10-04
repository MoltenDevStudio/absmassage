'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

type MetaPixelWindow = Window & {
  fbq?: (command: 'track', event: 'PageView') => void
}

export default function MetaPixelPageView() {
  const pathname = usePathname()
  const previousPathname = useRef(pathname)

  useEffect(() => {
    // The head script records the initial visit; only track later navigation.
    if (previousPathname.current === pathname) return

    previousPathname.current = pathname
    ;(window as MetaPixelWindow).fbq?.('track', 'PageView')
  }, [pathname])

  return null
}
