export const CONSENT_COOKIE = 'optional_tracking_consent'
const SYNC_CHANNEL = 'optional-tracking-consent'
const SITE_DOMAIN = 'andrewboltonsportsmassage.com'
const PIXEL_ID = '2126552771609777'
const GTM_ID = 'GTM-PSTX555'

export type ConsentChoice = 'accepted' | 'rejected' | null
type PixelCommand =
  | ['consent', 'grant' | 'revoke']
  | ['init', string]
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
  const value = browser.document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
    ?.split('=')[1]
  return value === 'accepted' || value === 'rejected' ? value : null
}

// Use this boundary for booking events/links too, including while a tab update
// is still in transit. Components do not maintain separate consent decisions.
export function hasOptionalTrackingConsent() {
  return typeof window !== 'undefined' && readConsent(window) === 'accepted'
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
  private running = false
  private pathname = ''
  private channel: BroadcastChannel | null = null
  private googleStarted = false
  private metaScript: HTMLScriptElement | null = null
  private metaReady = false
  private metaInitialized = false
  private metaGranted = false
  private lastTrackedPathname: string | null = null

  constructor(
    private browser: Window & typeof globalThis,
    private onChoice: (choice: ConsentChoice) => void,
    private reload: () => void = () => browser.location.reload(),
  ) {}

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
    this.onChoice(this.choice)
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

  private onMessage = (event: MessageEvent) => {
    if (event.data === 'changed') this.synchronize()
  }

  private onStorage = (event: StorageEvent) => {
    if (event.key === SYNC_CHANNEL) this.synchronize()
  }

  private synchronize = () => {
    if (this.running) this.apply(readConsent(this.browser))
  }

  private allowed() {
    return (
      this.running &&
      this.choice === 'accepted' &&
      readConsent(this.browser) === 'accepted'
    )
  }

  private apply(choice: ConsentChoice) {
    if (this.choice === choice) return
    this.choice = choice
    if (choice === 'accepted') {
      this.captureGclid()
      this.loadGoogle()
      this.loadMeta()
      this.trackMetaPageView()
    } else {
      if (this.metaReady) this.browser.fbq?.('consent', 'revoke')
      this.metaGranted = false
      this.lastTrackedPathname = null
      clearTrackingCookies(this.browser)
      try {
        this.browser.sessionStorage.removeItem('gclid')
      } catch {
        /* Storage may be disabled. */
      }
      this.cleanGclidUrl()
      if (this.googleStarted) {
        this.googleConsent('update', 'denied')
        // Consent Mode alone can still send cookieless pings. A fresh document
        // removes already-loaded GTM listeners/timers and never loads it again
        // while the persisted choice is rejected (including in other tabs).
        this.onChoice(choice)
        this.reload()
        return
      }
    }
    this.onChoice(choice)
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
      },
      { once: true },
    )
    this.browser.document.head.appendChild(script)
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
    // Retain the landing query while accepted so delayed Google tags can read
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
