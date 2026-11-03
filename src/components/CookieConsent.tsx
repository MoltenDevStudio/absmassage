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
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import {
  OptionalTrackingController,
  hasOptionalTrackingConsent,
  type ConsentChoice,
} from '../lib/optionalTracking'

type OptionalTrackingContextValue = {
  consent: ConsentChoice
  trackingEnabled: boolean
  openCookieSettings: () => void
  trackBookingCompleted: () => void
}

const OptionalTrackingContext = createContext<OptionalTrackingContextValue>({
  consent: null,
  trackingEnabled: false,
  openCookieSettings: () => {},
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
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const controller = useRef<OptionalTrackingController | null>(null)

  useEffect(() => {
    controller.current ??= new OptionalTrackingController(
      window,
      (choice, enabled) => {
        setConsent(choice)
        setTrackingEnabled(enabled)
      },
    )
    const tracking = controller.current
    tracking.start()
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

  return (
    <OptionalTrackingContext.Provider
      value={{
        consent,
        trackingEnabled,
        openCookieSettings: () => setSettingsOpen(true),
        trackBookingCompleted,
      }}
    >
      {children}
      {trackingEnabled && (
        <>
          <Analytics
            beforeSend={(event) =>
              hasOptionalTrackingConsent() ? event : null
            }
          />
          <SpeedInsights
            beforeSend={(event) =>
              hasOptionalTrackingConsent() ? event : null
            }
          />
        </>
      )}
      {settingsOpen && (
        <aside
          aria-labelledby="cookie-consent-heading"
          className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 bg-white px-4 py-2 text-left text-gray-900 shadow-2xl sm:px-6"
          role="region"
        >
          <div className="mx-auto max-w-6xl">
            <h2 id="cookie-consent-heading" className="sr-only">
              Cookie settings
            </h2>
            <p className="my-0 max-w-3xl text-sm leading-relaxed">
              Analytics and advertising tracking is currently{' '}
              {trackingEnabled ? 'enabled' : 'disabled'}. You can disable or
              enable both below. See my{' '}
              <a className="underline" href="/privacypolicy">
                Privacy Policy
              </a>
              .
            </p>
            <div className="mt-1 flex min-h-10 flex-wrap items-center justify-center gap-2">
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  className="min-h-10 rounded-lg border border-gray-400 px-4 py-1.5 text-sm font-semibold hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  onClick={() => chooseConsent('rejected')}
                  type="button"
                >
                  Disable tracking
                </button>
                <button
                  className="min-h-10 rounded-lg bg-[#1f4c3c] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#17392d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  onClick={() => chooseConsent('accepted')}
                  type="button"
                >
                  Enable tracking
                </button>
              </div>
              <button
                className="rounded px-3 py-2 text-sm underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={() => setSettingsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </aside>
      )}
    </OptionalTrackingContext.Provider>
  )
}
