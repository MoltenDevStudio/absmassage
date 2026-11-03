export const CONSENT_COOKIE = 'optional_tracking_consent'
// Reuse the legacy key; only explicit choices are persisted.
export const CONSENT_STORAGE_KEY = CONSENT_COOKIE
const nzVisitors = new WeakSet<Window>()
const SYNC_CHANNEL = 'optional-tracking-consent'
const SITE_DOMAIN = 'andrewboltonsportsmassage.com'
const PIXEL_ID = '2126552771609777'
const GTM_ID = 'GTM-PSTX555'

export type ConsentChoice = 'accepted' | 'rejected' | null
type PixelCommand =
  | ['consent', 'grant' | 'revoke']
  | ['init', string]
  | ['set', 'autoConfig', false, string]
  | ['track', 'PageView']
type PixelFunction = ((...args: PixelCommand) => void) & {
  callMethod?: (...args: PixelCommand) => void
  queue: IArguments[]
  push: PixelFunction
  loaded: boolean
  version: string
}

declare global {
  interface Window {
    fbq?: PixelFunction
    _fbq?: PixelFunction
    dataLayer?: Array<Record<string, unknown> | IArguments>
  }
}

function readConsent(browser: Window): ConsentChoice {
  let stored: string | null = null
  try {
    stored = browser.localStorage.getItem(CONSENT_STORAGE_KEY)
  } catch {
    // The legacy functional cookie also works when localStorage is blocked.
  }
  const legacy = browser.document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
    ?.split('=')[1]
  // An explicit opt-out always wins, including during migration or tab updates.
  if (stored === 'rejected' || legacy === 'rejected') return 'rejected'
  if (stored !== null && stored !== 'accepted') return 'rejected'
  if (stored === 'accepted' || legacy === 'accepted') return 'accepted'
  return null
}

// Only a trusted server/edge response may return NZ; static exports return null.
// Do not infer country from language, timezone, or a visitor-supplied query.
export async function detectNzVisitor(browser: Window): Promise<boolean> {
  const abort = new AbortController()
  const timeout = browser.setTimeout(() => abort.abort(), 3000)
  try {
    const response = await browser.fetch('/api/tracking-region', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: abort.signal,
    })
    if (!response.ok) return false
    const region = await response.json()
    return region.country === 'NZ'
  } catch {
    return false
  } finally {
    browser.clearTimeout(timeout)
  }
}

// Booking attribution and late events recheck the durable choice too.
export function hasOptionalTrackingConsent(
  browser: Window | undefined = typeof window === 'undefined'
    ? undefined
    : window,
) {
  if (!browser) return false
  const choice = readConsent(browser)
  return choice === 'accepted' || (choice === null && nzVisitors.has(browser))
}

function clearTrackingCookies(browser: Window) {
  const hostname = browser.location.hostname
  const domains = new Set([hostname])
  if (hostname === SITE_DOMAIN || hostname.endsWith(`.${SITE_DOMAIN}`)) {
    domains.add(SITE_DOMAIN)
  }
  const names = new Set(['_fbp', '_fbc'])
  for (const cookie of browser.document.cookie.split('; ')) {
    const name = cookie.split('=')[0]
    // Only clear present GA/Ads measurement cookies, never unrelated cookies.
    // The repository contains a GTM ID, but no exported container/tag inventory.
    if (/^(_ga(?:_[A-Za-z0-9]+)?|_gcl_(?:aw|au))$/.test(name)) names.add(name)
  }
  for (const name of names) {
    const expiry = `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`
    browser.document.cookie = expiry
    for (const domain of domains) {
      browser.document.cookie = `${expiry}; Domain=${domain}`
    }
  }
}

export class OptionalTrackingController {
  private choice: ConsentChoice = null
  private enabled: boolean | undefined
  private regionRequested = false
  private running = false
  private pathname = ''
  private channel: BroadcastChannel | null = null
  private googleStarted = false
  private googleReady = false
  private pendingBookingCompleted = false
  private metaScript: HTMLScriptElement | null = null
  private metaReady = false
  private metaInitialized = false
  private metaGranted = false
  private lastTrackedPathname: string | null = null

  constructor(
    private browser: Window & typeof globalThis,
    private onChoice: (choice: ConsentChoice, enabled: boolean) => void,
    private reload: () => void = () => browser.location.reload(),
    private detectNz: (browser: Window) => Promise<boolean> = detectNzVisitor,
  ) {
    // A new controller/document must resolve its own regional default.
    nzVisitors.delete(browser)
  }

  start() {
    this.running = true
    this.pathname = this.browser.location.pathname
    try {
      if (this.browser.BroadcastChannel) {
        this.channel = new this.browser.BroadcastChannel(SYNC_CHANNEL)
        this.channel.onmessage = this.onMessage
      }
    } catch {
      // Storage events and focus reconciliation also support older browsers.
    }
    this.browser.addEventListener('storage', this.onStorage)
    this.browser.addEventListener('focus', this.synchronize)
    this.browser.addEventListener('pageshow', this.synchronize)
    this.browser.document.addEventListener('visibilitychange', this.synchronize)
    this.synchronize()
    if (!this.regionRequested && this.choice === null) {
      this.regionRequested = true
      void this.detectNz(this.browser)
        .then((isNz) => {
          if (isNz) nzVisitors.add(this.browser)
          this.synchronize()
        })
        .catch(() => {
          /* Unknown locations stay disabled. */
        })
    }
  }

  stop() {
    this.running = false
    this.channel?.close()
    this.channel = null
    this.browser.removeEventListener('storage', this.onStorage)
    this.browser.removeEventListener('focus', this.synchronize)
    this.browser.removeEventListener('pageshow', this.synchronize)
    this.browser.document.removeEventListener(
      'visibilitychange',
      this.synchronize,
    )
  }

  choose(choice: Exclude<ConsentChoice, null>) {
    const secure = this.browser.location.protocol === 'https:' ? '; Secure' : ''
    this.browser.document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
    try {
      this.browser.localStorage.setItem(CONSENT_STORAGE_KEY, choice)
    } catch {
      // Keep the existing cookie as a fallback for unavailable localStorage.
    }
    if (this.channel) this.channel.postMessage('changed')
    else {
      try {
        this.browser.localStorage.setItem(
          SYNC_CHANNEL,
          `${Date.now()}:${Math.random()}`,
        )
      } catch {
        // The cookie is durable even when cross-tab storage is unavailable.
      }
    }
    this.apply(choice)
  }

  navigate(pathname: string) {
    this.pathname = pathname
    this.synchronize()
    if (this.allowed()) this.captureGclid()
    this.trackMetaPageView()
  }

  trackBookingCompleted() {
    if (!this.allowed()) return
    if (!this.googleReady) {
      this.pendingBookingCompleted = true
      return
    }
    this.pushBookingCompleted()
  }

  private onMessage = (event: MessageEvent) => {
    if (event.data === 'changed') this.synchronize()
  }

  private onStorage = (event: StorageEvent) => {
    if (
      event.key === SYNC_CHANNEL ||
      event.key === CONSENT_STORAGE_KEY ||
      event.key === null
    )
      this.synchronize()
  }

  private synchronize = () => {
    if (this.running) this.apply(readConsent(this.browser))
  }

  private allowed() {
    return (
      this.running &&
      this.enabled === true &&
      hasOptionalTrackingConsent(this.browser)
    )
  }

  private apply(choice: ConsentChoice) {
    const enabled = hasOptionalTrackingConsent(this.browser)
    if (this.choice === choice && this.enabled === enabled) return
    const wasEnabled = this.enabled
    this.choice = choice
    this.enabled = enabled
    if (enabled) {
      this.captureGclid()
      this.loadGoogle()
      this.loadMeta()
      this.trackMetaPageView()
    } else {
      this.pendingBookingCompleted = false
      this.googleReady = false
      if (this.metaReady) this.browser.fbq?.('consent', 'revoke')
      this.metaGranted = false
      this.lastTrackedPathname = null
      if (choice === 'rejected' || wasEnabled) {
        clearTrackingCookies(this.browser)
        try {
          this.browser.sessionStorage.removeItem('gclid')
        } catch {
          /* Storage may be disabled. */
        }
        this.cleanGclidUrl()
      }
      if (this.googleStarted) {
        this.googleConsent('update', 'denied')
        // Consent Mode alone can still send cookieless pings. A fresh document
        // removes already-loaded GTM listeners/timers and never loads it again
        // while the persisted choice is rejected (including in other tabs).
        this.onChoice(choice, enabled)
        this.reload()
        return
      }
    }
    this.onChoice(choice, enabled)
  }

  private googleConsent(
    command: 'default' | 'update',
    value: 'granted' | 'denied',
  ) {
    const layer = this.browser.dataLayer || (this.browser.dataLayer = [])
    const gtag = function () {
      layer.push(arguments)
    } as (...args: unknown[]) => void
    const consent = {
      analytics_storage: value,
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
    }
    // Google consumes arguments objects, as in its standard gtag snippet.
    gtag('consent', command, consent)
  }

  private loadGoogle() {
    if (this.googleStarted || !this.allowed()) return
    this.googleStarted = true
    // Keep GTM denied while its code is downloading. If consent is withdrawn
    // before load, it must not process its initial event under a stale grant.
    this.googleConsent('default', 'denied')
    const script = this.browser.document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`
    script.addEventListener(
      'load',
      () => {
        this.synchronize()
        if (!this.allowed()) {
          this.googleConsent('update', 'denied')
          return
        }
        this.googleConsent('update', 'granted')
        this.browser.dataLayer!.push({
          'gtm.start': Date.now(),
          event: 'gtm.js',
        })
        this.googleReady = true
        if (this.pendingBookingCompleted) {
          this.pendingBookingCompleted = false
          this.pushBookingCompleted()
        }
      },
      { once: true },
    )
    this.browser.document.head.appendChild(script)
  }

  private pushBookingCompleted() {
    if (!this.allowed()) return
    this.browser.dataLayer!.push({ event: 'clinikoBookingCompleted' })
  }

  private loadMeta() {
    if (this.metaScript || !this.allowed()) return
    if (!this.browser.fbq) {
      const pixel = function (...args: PixelCommand) {
        if (pixel.callMethod) pixel.callMethod(...args)
        else pixel.queue.push(arguments)
      } as PixelFunction
      pixel.queue = []
      pixel.push = pixel
      pixel.loaded = true
      pixel.version = '2.0'
      this.browser.fbq = this.browser._fbq = pixel
    }
    const script = this.browser.document.createElement('script')
    this.metaScript = script
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    script.addEventListener(
      'load',
      () => {
        this.metaReady = true
        this.synchronize()
        if (this.allowed()) this.trackMetaPageView()
        else {
          this.browser.fbq?.('consent', 'revoke')
          clearTrackingCookies(this.browser)
        }
      },
      { once: true },
    )
    // No init or PageView is queued while the script is loading.
    this.browser.document.head.appendChild(script)
  }

  private trackMetaPageView() {
    if (!this.metaReady || !this.allowed()) return
    if (!this.metaGranted) {
      this.browser.fbq?.('consent', 'grant')
      this.metaGranted = true
    }
    if (!this.metaInitialized) {
      // Disable automatic event/metadata collection; never pass matching data.
      this.browser.fbq?.('set', 'autoConfig', false, PIXEL_ID)
      this.browser.fbq?.('init', PIXEL_ID)
      this.metaInitialized = true
    }
    if (this.lastTrackedPathname !== this.pathname) {
      this.browser.fbq?.('track', 'PageView')
      this.lastTrackedPathname = this.pathname
    }
  }

  private captureGclid() {
    if (!this.allowed()) return
    const value = new URL(this.browser.location.href).searchParams.get('gclid')
    if (!value) return
    try {
      this.browser.sessionStorage.setItem('gclid', value)
    } catch {
      /* Attribution is optional when storage is unavailable. */
    }
    // Retain the landing query while enabled so delayed Google tags can read
    // it too. Rejection removes it and the session copy before reloading.
  }

  private cleanGclidUrl() {
    const url = new URL(this.browser.location.href)
    if (!url.searchParams.has('gclid')) return
    url.searchParams.delete('gclid')
    this.browser.history.replaceState(
      this.browser.history.state,
      '',
      url.toString(),
    )
  }
}
