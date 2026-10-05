'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  OptionalTrackingController,
  type ConsentChoice,
} from '../lib/optionalTracking'

const OptionalTrackingContext = createContext<ConsentChoice>(null)

export function useOptionalTrackingConsent() {
  return useContext(OptionalTrackingContext)
}

export default function CookieConsent({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [consent, setConsent] = useState<ConsentChoice>(null)
  const [consentLoaded, setConsentLoaded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const controller = useRef<OptionalTrackingController | null>(null)

  useEffect(() => {
    controller.current ??= new OptionalTrackingController(window, setConsent)
    const tracking = controller.current
    tracking.start()
    setConsentLoaded(true)
    return () => tracking.stop()
  }, [])

  useEffect(() => {
    controller.current?.navigate(pathname)
  }, [pathname])

  function chooseConsent(choice: Exclude<ConsentChoice, null>) {
    controller.current?.choose(choice)
    setSettingsOpen(false)
  }

  const showChoices = consent === null || settingsOpen

  return (
    <OptionalTrackingContext.Provider value={consent}>
      {children}
      {consentLoaded &&
        (showChoices ? (
          <aside
            aria-labelledby="cookie-consent-heading"
            className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 bg-white px-4 py-5 text-left text-gray-900 shadow-2xl sm:px-6"
            role="region"
          >
            <div className="mx-auto max-w-6xl">
              <h2 id="cookie-consent-heading" className="m-0 text-lg font-bold">
                Cookie choices
              </h2>
              <p className="my-2 max-w-3xl text-sm leading-relaxed">
                We use optional cookies and similar technologies to understand
                how people use our website and to help measure our marketing.
                You can accept or reject these. See our{' '}
                <a className="underline" href="/privacypolicy">
                  Privacy Policy
                </a>{' '}
                for more information.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded border border-gray-400 px-4 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  onClick={() => chooseConsent('rejected')}
                  type="button"
                >
                  Reject optional cookies
                </button>
                <button
                  className="rounded bg-[#1f4c3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17392d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  onClick={() => chooseConsent('accepted')}
                  type="button"
                >
                  Accept optional cookies
                </button>
                {consent !== null && (
                  <button
                    className="rounded px-3 py-2 text-sm underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    onClick={() => setSettingsOpen(false)}
                    type="button"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </aside>
        ) : (
          <button
            aria-label="Change cookie settings"
            className="fixed bottom-3 left-3 z-[99] rounded-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-md hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => setSettingsOpen(true)}
            type="button"
          >
            Cookie settings
          </button>
        ))}
    </OptionalTrackingContext.Provider>
  )
}
