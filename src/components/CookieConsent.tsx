'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'
import {
  OptionalTrackingController,
  type ConsentChoice,
} from '../lib/optionalTracking'

type OptionalTrackingContextValue = {
  consent: ConsentChoice
  trackBookingCompleted: () => void
}

const OptionalTrackingContext = createContext<OptionalTrackingContextValue>({
  consent: null,
  trackBookingCompleted: () => {},
})

export function useOptionalTracking() {
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

  const trackBookingCompleted = useCallback(
    () => controller.current?.trackBookingCompleted(),
    [],
  )

  const showChoices = consent === null || settingsOpen

  return (
    <OptionalTrackingContext.Provider
      value={{
        consent,
        trackBookingCompleted,
      }}
    >
      {children}
      {consentLoaded &&
        (showChoices ? (
          <aside
            aria-labelledby="cookie-consent-heading"
            className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 bg-white px-4 py-2 text-left text-gray-900 shadow-2xl sm:px-6"
            role="region"
          >
            <div className="mx-auto max-w-6xl">
              <h2 id="cookie-consent-heading" className="sr-only">
                Cookie choices
              </h2>
              <p className="my-0 max-w-3xl text-sm leading-relaxed">
                I use cookies &amp; similar tech to understand site use &amp;
                help with marketing. See my{' '}
                <a className="underline" href="/privacypolicy">
                  Privacy Policy
                </a>
                .
              </p>
              <div className="relative mt-1 flex min-h-10 justify-center">
                <div className="flex gap-2">
                  <button
                    className="min-h-10 rounded-lg border border-gray-400 px-4 py-1.5 text-sm font-semibold hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    onClick={() => chooseConsent('rejected')}
                    type="button"
                  >
                    Reject
                  </button>
                  <button
                    className="min-h-10 rounded-lg bg-[#1f4c3c] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#17392d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    onClick={() => chooseConsent('accepted')}
                    type="button"
                  >
                    Accept
                  </button>
                </div>
                {consent !== null && (
                  <button
                    className="absolute right-0 top-1/2 -translate-y-1/2 rounded px-3 py-2 text-sm underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
