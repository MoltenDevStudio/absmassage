export const CONSENT_COOKIE = 'optional_tracking_consent'
// Reuse the legacy key; only explicit choices are persisted.
export const CONSENT_STORAGE_KEY = CONSENT_COOKIE
const visitorRegions = new WeakMap<Window, RegionInfo>()
// Document scope survives controller remounts and client navigation, but never
// carries an in-memory acceptance into a new document.
const volatileDecisions = new WeakMap<
  Document,
  { choice: Exclude<ConsentChoice, null>; snapshot: string }
>()
const persistenceChecks = new WeakMap<Document, boolean>()

export type RegionInfo = {
  country: string | null
  region: 'NZ' | 'EEA' | 'UK' | 'CH' | 'OTHER' | 'UNKNOWN'
}
export type ConsentRecord = RegionInfo & {
  version: 1
  choices: { analytics: boolean; advertising: boolean }
  timestamp: string
}
const EEA_COUNTRIES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'IS',
  'LI',
  'NO',
])

export function regionForCountry(value: unknown): RegionInfo {
  const country =
    typeof value === 'string' &&
    /^[A-Z]{2}$/.test(value) &&
    value !== 'XX' &&
    value !== 'ZZ'
      ? value
      : null
  const region =
    country === 'NZ'
      ? 'NZ'
      : country === 'GB'
        ? 'UK'
        : country === 'CH'
          ? 'CH'
          : country && EEA_COUNTRIES.has(country)
            ? 'EEA'
            : country
              ? 'OTHER'
              : 'UNKNOWN'
  return { country, region }
}
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

// The original infrastructure offered one combined analytics/advertising choice.
// Keep legacy affirmative choices without inventing a historic consent timestamp.
function parseChoice(value: string | null): ConsentChoice {
  if (value === 'accepted' || value === 'rejected') return value
  if (value === null) return null
  try {
    const record = JSON.parse(value) as ConsentRecord
    const timestamp = Date.parse(record.timestamp)
    const expectedRegion = regionForCountry(record.country)
    if (
      record.version !== 1 ||
      typeof record.timestamp !== 'string' ||
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString() !== record.timestamp ||
      timestamp > Date.now() + 60000 ||
      record.country !== expectedRegion.country ||
      record.region !== expectedRegion.region ||
      typeof record.choices?.analytics !== 'boolean' ||
      typeof record.choices?.advertising !== 'boolean' ||
      record.choices.analytics !== record.choices.advertising
    )
      return null
    return record.choices.analytics ? 'accepted' : 'rejected'
  } catch {
    return null
  }
}

function readConsent(browser: Window) {
  let reliable = true
  let stored: string | null = null
  try {
    stored = browser.localStorage.getItem(CONSENT_STORAGE_KEY)
  } catch {
    // An unreadable store could contain an opt-out. Never treat it as empty.
    reliable = false
  }
  let cookie: string | null = null
  try {
    const encoded = browser.document.cookie
      .split('; ')
      .find((value) => value.startsWith(`${CONSENT_COOKIE}=`))
      ?.split('=')[1]
    cookie = encoded === undefined ? null : decodeURIComponent(encoded)
  } catch {
    reliable = false
  }
  const localChoice = parseChoice(stored)
  const cookieChoice = parseChoice(cookie)
  const present = !reliable || stored !== null || cookie !== null
  // An explicit rejection wins. Invalid records never revive an accepted default
  // or bypass a new prompt through another store's stale acceptance.
  const choice: ConsentChoice =
    localChoice === 'rejected' || cookieChoice === 'rejected'
      ? 'rejected'
      : !reliable ||
          (stored !== null && localChoice === null) ||
          (cookie !== null && cookieChoice === null)
        ? null
        : localChoice || cookieChoice
  return {
    choice,
    present,
    reliable,
    snapshot: JSON.stringify([reliable, stored, cookie]),
  }
}

function effectiveConsent(browser: Window) {
  const saved = readConsent(browser)
  const memory = volatileDecisions.get(browser.document)
  if (memory) {
    // A newly observed opt-out also overrides a volatile acceptance. A
    // rejection stays in memory until a deliberate choice replaces it;
    // recovering a stale acceptance after a failed read must not revive tags.
    if (saved.choice === 'rejected' && saved.snapshot !== memory.snapshot) {
      volatileDecisions.set(browser.document, {
        choice: 'rejected',
        snapshot: saved.snapshot,
      })
      return { choice: 'rejected' as const, present: true }
    }
    return { choice: memory.choice, present: true }
  }
  return saved
}

function canRememberRejection(browser: Window) {
  const cached = persistenceChecks.get(browser.document)
  if (cached !== undefined) return cached
  // If both stores silently discard writes, a reload would forget an opt-out.
  // Require a verified functional storage round trip before using an NZ default.
  const key = `${CONSENT_STORAGE_KEY}_check`
  const value = `${Date.now()}-${Math.random()}`
  let writable = false
  try {
    browser.localStorage.setItem(key, value)
    writable = browser.localStorage.getItem(key) === value
    browser.localStorage.removeItem(key)
  } catch {
    // Try the functional cookie when localStorage writes are unavailable.
  }
  if (!writable) {
    try {
      browser.document.cookie = `${key}=${value}; Path=/; SameSite=Lax`
      writable = browser.document.cookie
        .split('; ')
        .some((cookie) => cookie === `${key}=${value}`)
      browser.document.cookie = `${key}=; Max-Age=0; Path=/; SameSite=Lax`
    } catch {
      // Explicit choices still work in memory for this document.
    }
  }
  persistenceChecks.set(browser.document, writable)
  return writable
}

// Only a trusted server/edge response may return NZ; static exports return null.
// Do not infer country from language, timezone, or a visitor-supplied query.
export async function detectVisitorRegion(
  browser: Window,
): Promise<RegionInfo> {
  const abort = new AbortController()
  const timeout = browser.setTimeout(() => abort.abort(), 3000)
  try {
    const response = await browser.fetch('/api/tracking-region', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: abort.signal,
    })
    if (!response.ok) return regionForCountry(null)
    const region = await response.json()
    return regionForCountry(region?.country)
  } catch {
    return regionForCountry(null)
  } finally {
    browser.clearTimeout(timeout)
  }
}

// Every integration uses the same effective decision, including memory fallback.
export function hasOptionalTrackingConsent(
  browser: Window | undefined = typeof window === 'undefined'
    ? undefined
    : window,
) {
  if (!browser) return false
  const { choice, present } = effectiveConsent(browser)
  return (
    choice === 'accepted' ||
    (!present &&
      visitorRegions.get(browser)?.region === 'NZ' &&
      canRememberRejection(browser))
  )
}

function clearTrackingCookies(browser: Window) {
  const hostname = browser.location.hostname
  const domains = new Set([hostname])
  if (hostname === SITE_DOMAIN || hostname.endsWith(`.${SITE_DOMAIN}`)) {
    domains.add(SITE_DOMAIN)
  }
  const names = new Set(['_fbp', '_fbc'])
  let cookies = ''
  try {
    cookies = browser.document.cookie
  } catch {
    // Cookie cleanup must never prevent consent revocation.
  }
  for (const cookie of cookies.split('; ')) {
    const name = cookie.split('=')[0]
    // Only clear present GA/Ads measurement cookies, never unrelated cookies.
    // The repository contains a GTM ID, but no exported container/tag inventory.
    if (/^(_ga(?:_[A-Za-z0-9]+)?|_gcl_(?:aw|au))$/.test(name)) names.add(name)
  }
  for (const name of names) {
    const expiry = `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`
    try {
      browser.document.cookie = expiry
    } catch {
      // Cookies may be blocked independently of localStorage.
    }
    for (const domain of domains) {
      try {
        browser.document.cookie = `${expiry}; Domain=${domain}`
      } catch {
        // Continue revocation even if a cookie write is rejected.
      }
    }
  }
}

export class OptionalTrackingController {
  private choice: ConsentChoice = null
  private enabled: boolean | undefined
  private regionRequested = false
  private regionResolved = false
  private region = regionForCountry(null)
  private requiresConsent: boolean | undefined
  private running = false
  private pathname = ''
  private channel: BroadcastChannel | null = null
  private googleStarted = false
  private reloadRequested = false
  private googleReady = false
  private pendingBookingCompleted = false
  private metaScript: HTMLScriptElement | null = null
  private metaReady = false
  private metaInitialized = false
  private metaGranted = false
  private lastTrackedPathname: string | null = null

  constructor(
    private browser: Window & typeof globalThis,
    private onChoice: (
      choice: ConsentChoice,
      enabled: boolean,
      requiresConsent: boolean,
    ) => void,
    private reload: () => void = () => browser.location.reload(),
    private detectRegion: (
      browser: Window,
    ) => Promise<RegionInfo> = detectVisitorRegion,
  ) {
    // A new controller/document must resolve its own regional default.
    visitorRegions.delete(browser)
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
    if (!this.regionRequested) {
      this.regionRequested = true
      void this.detectRegion(this.browser)
        .then(this.resolveRegion)
        .catch(() => this.resolveRegion(regionForCountry(null)))
    }
  }

  private resolveRegion = (region: RegionInfo) => {
    this.region = region
    this.regionResolved = true
    visitorRegions.set(this.browser, region)
    this.synchronize()
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
    const record: ConsentRecord = {
      version: 1,
      ...this.region,
      choices: {
        analytics: choice === 'accepted',
        advertising: choice === 'accepted',
      },
      timestamp: new Date().toISOString(),
    }
    const value = JSON.stringify(record)
    const secure = this.browser.location.protocol === 'https:' ? '; Secure' : ''
    try {
      this.browser.document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
    } catch {
      // Some browsers throw; others silently ignore blocked cookie writes.
    }
    try {
      this.browser.localStorage.setItem(CONSENT_STORAGE_KEY, value)
    } catch {
      // Keep the existing cookie as a fallback for unavailable localStorage.
    }
    const saved = readConsent(this.browser)
    const persisted = saved.reliable && saved.choice === choice
    if (persisted) {
      volatileDecisions.delete(this.browser.document)
    } else {
      volatileDecisions.set(this.browser.document, {
        choice,
        snapshot: saved.snapshot,
      })
    }
    // Revoke locally before notifying other tabs, even if notification fails.
    this.synchronize()
    try {
      this.channel?.postMessage({ type: 'changed', choice })
    } catch {
      // A closed/unavailable channel cannot undo the current decision.
    }
    if (!this.channel) {
      try {
        this.browser.localStorage.setItem(
          SYNC_CHANNEL,
          `${Date.now()}:${Math.random()}`,
        )
      } catch {
        // The current document still retains the explicit choice in memory.
      }
    }
    return persisted
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
    if (event.data?.type === 'changed' && event.data.choice === 'rejected') {
      volatileDecisions.set(this.browser.document, {
        choice: 'rejected',
        snapshot: readConsent(this.browser).snapshot,
      })
    }
    if (event.data?.type === 'changed' && event.data.choice === 'accepted') {
      const saved = readConsent(this.browser)
      if (saved.reliable && saved.choice === 'accepted')
        volatileDecisions.delete(this.browser.document)
    }
    if (event.data === 'changed' || event.data?.type === 'changed')
      this.synchronize()
  }

  private onStorage = (event: StorageEvent) => {
    if (
      event.key === SYNC_CHANNEL ||
      event.key === CONSENT_STORAGE_KEY ||
      event.key === null
    ) {
      const saved = readConsent(this.browser)
      const memory = volatileDecisions.get(this.browser.document)
      if (
        event.key === CONSENT_STORAGE_KEY &&
        parseChoice(event.newValue) === 'accepted' &&
        saved.reliable &&
        saved.choice === 'accepted' &&
        saved.snapshot !== memory?.snapshot
      )
        volatileDecisions.delete(this.browser.document)
      this.synchronize()
    }
  }

  private synchronize = () => {
    if (!this.running) return
    this.apply(effectiveConsent(this.browser).choice)
    // Replacing the document discards volatileDecisions. Only do so after
    // verifying a durable rejection, or stale acceptance could revive tracking.
    // Recheck even if apply did not change state, so a successful retry reloads.
    if (this.googleStarted && !this.enabled && !this.reloadRequested) {
      const saved = readConsent(this.browser)
      if (saved.reliable && saved.choice === 'rejected') {
        this.reloadRequested = true
        this.reload()
      }
    }
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
    const requiresConsent = this.regionResolved && choice === null && !enabled
    if (
      this.choice === choice &&
      this.enabled === enabled &&
      this.requiresConsent === requiresConsent
    )
      return
    this.requiresConsent = requiresConsent
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
        // Loaded tags may still send cookieless pings. synchronize reloads to
        // remove them only when a saved rejection makes replacement safe.
      }
    }
    this.onChoice(choice, enabled, requiresConsent)
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
