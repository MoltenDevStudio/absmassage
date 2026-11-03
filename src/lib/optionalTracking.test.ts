import { afterEach, describe, expect, it, vi } from 'vitest'
import { CookieJar, JSDOM } from 'jsdom'
import {
  CONSENT_COOKIE,
  CONSENT_STORAGE_KEY,
  detectNzVisitor,
  hasOptionalTrackingConsent,
  OptionalTrackingController,
} from './optionalTracking'

type Fixture = {
  dom: JSDOM
  browser: Window & typeof globalThis
  changed: ReturnType<typeof vi.fn>
  reload: ReturnType<typeof vi.fn>
  controller: OptionalTrackingController
}
const fixtures: Fixture[] = []
const channels = new Set<FakeChannel>()

class FakeChannel {
  onmessage: ((event: { data: unknown }) => void) | null = null
  constructor(public name: string) {
    channels.add(this)
  }
  postMessage(data: unknown) {
    for (const channel of channels) {
      if (channel !== this && channel.name === this.name)
        channel.onmessage?.({ data })
    }
  }
  close() {
    channels.delete(this)
  }
}

function tab(
  jar = new CookieJar(),
  url = 'https://www.andrewboltonsportsmassage.com/',
  detectNz: (browser: Window) => Promise<boolean> = async () => false,
): Fixture {
  const dom = new JSDOM(
    '<!doctype html><html><head></head><body></body></html>',
    { url, cookieJar: jar },
  )
  const browser = dom.window as unknown as Window & typeof globalThis
  Object.defineProperty(browser, 'BroadcastChannel', {
    value: FakeChannel,
    configurable: true,
  })
  const changed = vi.fn()
  const reload = vi.fn()
  const controller = new OptionalTrackingController(
    browser,
    changed,
    reload,
    detectNz,
  )
  const fixture = { dom, browser, changed, reload, controller }
  fixtures.push(fixture)
  return fixture
}

function scripts(fixture: ReturnType<typeof tab>) {
  return Array.from(fixture.browser.document.querySelectorAll('script')).map(
    (script) => script.src,
  )
}

function finishMeta(fixture: ReturnType<typeof tab>) {
  const pixel = vi.fn()
  fixture.browser.fbq!.callMethod = pixel
  fixture.browser.document
    .querySelector('script[src*="fbevents.js"]')!
    .dispatchEvent(new fixture.dom.window.Event('load'))
  return pixel
}

function googleCalls(fixture: ReturnType<typeof tab>) {
  return (fixture.browser.dataLayer || []).flatMap((entry) => {
    if (Array.isArray(entry)) return [entry]
    if ('length' in entry) return [Array.from(entry as IArguments)]
    return []
  })
}

function bookingEvents(fixture: ReturnType<typeof tab>) {
  return (fixture.browser.dataLayer || []).filter(
    (entry) =>
      !('length' in entry) && entry.event === 'clinikoBookingCompleted',
  )
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    fixture.controller.stop()
    fixture.dom.window.close()
  }
  channels.clear()
})

describe('optional tracking consent', () => {
  it('requests no optional scripts and stores no ad identifier before a choice', () => {
    const fixture = tab(
      undefined,
      'https://www.andrewboltonsportsmassage.com/?gclid=ad-click',
    )
    fixture.controller.start()
    fixture.controller.navigate('/about')
    expect(scripts(fixture)).toEqual([])
    expect(fixture.browser.fbq).toBeUndefined()
    expect(fixture.browser.dataLayer).toBeUndefined()
    expect(fixture.browser.sessionStorage.getItem('gclid')).toBeNull()
    expect(fixture.changed).toHaveBeenLastCalledWith(null, false)
  })

  it('persists rejection across visits without loading trackers', () => {
    const jar = new CookieJar()
    const first = tab(jar)
    first.controller.start()
    first.controller.choose('rejected')
    const next = tab(jar)
    next.controller.start()
    expect(next.changed).toHaveBeenLastCalledWith('rejected', false)
    expect(scripts(first)).toEqual([])
    expect(scripts(next)).toEqual([])
    expect(next.browser.document.cookie).toContain(`${CONSENT_COOKIE}=rejected`)
  })

  it('keeps GTM denied if consent is withdrawn while its script is loading', () => {
    const fixture = tab()
    fixture.controller.start()
    fixture.controller.choose('accepted')
    const gtm = fixture.browser.document.querySelector(
      'script[src*="googletagmanager.com/gtm.js"]',
    )!
    expect(googleCalls(fixture)).toEqual([
      [
        'consent',
        'default',
        {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        },
      ],
    ])
    expect(
      fixture.browser.dataLayer!.some(
        (entry) => !('length' in entry) && entry.event === 'gtm.js',
      ),
    ).toBe(false)

    fixture.controller.choose('rejected')
    gtm.dispatchEvent(new fixture.dom.window.Event('load'))

    expect(
      googleCalls(fixture).some(
        (call) =>
          call[0] === 'consent' && call[2]?.analytics_storage === 'granted',
      ),
    ).toBe(false)
    expect(
      fixture.browser.dataLayer!.some(
        (entry) => !('length' in entry) && entry.event === 'gtm.js',
      ),
    ).toBe(false)
    expect(googleCalls(fixture).at(-1)).toEqual([
      'consent',
      'update',
      {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ])
    expect(fixture.reload).toHaveBeenCalledOnce()
  })

  it('grants Google consent and queues the initial GTM event once after load', () => {
    const fixture = tab()
    fixture.controller.start()
    fixture.controller.choose('accepted')
    const gtm = fixture.browser.document.querySelector(
      'script[src*="googletagmanager.com/gtm.js"]',
    )!

    expect(googleCalls(fixture)).toHaveLength(1)
    gtm.dispatchEvent(new fixture.dom.window.Event('load'))
    gtm.dispatchEvent(new fixture.dom.window.Event('load'))

    expect(googleCalls(fixture)).toEqual([
      [
        'consent',
        'default',
        {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        },
      ],
      [
        'consent',
        'update',
        {
          analytics_storage: 'granted',
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
        },
      ],
    ])
    expect(
      fixture.browser.dataLayer!.filter(
        (entry) => !('length' in entry) && entry.event === 'gtm.js',
      ),
    ).toHaveLength(1)
  })

  it('discards a pending booking conversion when another tab withdraws consent', () => {
    const jar = new CookieJar()
    const first = tab(jar)
    const second = tab(jar)
    first.controller.start()
    second.controller.start()
    first.controller.choose('accepted')
    const secondGtm = second.browser.document.querySelector(
      'script[src*="googletagmanager.com/gtm.js"]',
    )!

    second.controller.trackBookingCompleted()
    expect(bookingEvents(second)).toHaveLength(0)

    first.controller.choose('rejected')
    secondGtm.dispatchEvent(new second.dom.window.Event('load'))

    expect(bookingEvents(second)).toHaveLength(0)
    expect(
      second.browser.dataLayer!.some(
        (entry) => !('length' in entry) && entry.event === 'gtm.js',
      ),
    ).toBe(false)
    expect(googleCalls(second).at(-1)).toEqual([
      'consent',
      'update',
      {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ])
    expect(second.reload).toHaveBeenCalledOnce()
  })

  it('loads GTM and Meta only after acceptance, then tracks each pathname once', () => {
    const fixture = tab(
      undefined,
      'https://www.andrewboltonsportsmassage.com/?gclid=ad-click',
    )
    fixture.controller.start()
    fixture.controller.choose('accepted')
    expect(scripts(fixture)).toHaveLength(2)
    expect(scripts(fixture).join(' ')).toContain('gtm.js?id=GTM-PSTX555')
    expect(fixture.browser.fbq!.queue).toHaveLength(0)
    expect(fixture.browser.sessionStorage.getItem('gclid')).toBe('ad-click')
    expect(fixture.browser.location.search).toBe('?gclid=ad-click')
    const pixel = finishMeta(fixture)
    expect(pixel.mock.calls).toEqual([
      ['consent', 'grant'],
      ['set', 'autoConfig', false, '2126552771609777'],
      ['init', '2126552771609777'],
      ['track', 'PageView'],
    ])
    fixture.controller.navigate('/about')
    fixture.controller.navigate('/about')
    fixture.controller.navigate('/')
    expect(pixel.mock.calls.filter((call) => call[0] === 'track')).toHaveLength(
      3,
    )
    expect(pixel.mock.calls.filter((call) => call[0] === 'init')).toHaveLength(
      1,
    )
    fixture.controller.stop()
    fixture.controller.start()
    fixture.controller.navigate('/')
    expect(scripts(fixture)).toHaveLength(2)
    expect(pixel.mock.calls.filter((call) => call[0] === 'track')).toHaveLength(
      3,
    )
  })

  it('tracks only the current pathname after accepted navigation during Meta loading', () => {
    const fixture = tab()
    fixture.controller.start()
    fixture.controller.choose('accepted')
    fixture.controller.navigate('/about')
    fixture.controller.navigate('/about')
    fixture.controller.navigate('/contact')
    expect(fixture.browser.fbq!.queue).toHaveLength(0)

    const pixel = finishMeta(fixture)
    expect(pixel.mock.calls).toEqual([
      ['consent', 'grant'],
      ['set', 'autoConfig', false, '2126552771609777'],
      ['init', '2126552771609777'],
      ['track', 'PageView'],
    ])
    fixture.controller.navigate('/contact')
    expect(pixel.mock.calls.filter((call) => call[0] === 'track')).toHaveLength(
      1,
    )
    fixture.controller.navigate('/about')
    fixture.controller.navigate('/about')
    expect(pixel.mock.calls.filter((call) => call[0] === 'track')).toHaveLength(
      2,
    )
    expect(pixel.mock.calls.filter((call) => call[0] === 'init')).toHaveLength(
      1,
    )
  })

  it('revokes tracking, removes known cookies and GCLID, and reloads to remove Google tags', () => {
    const fixture = tab()
    fixture.controller.start()
    fixture.controller.choose('accepted')
    const pixel = finishMeta(fixture)
    fixture.browser.sessionStorage.setItem('gclid', 'previous-click')
    for (const name of [
      '_fbp',
      '_fbc',
      '_ga',
      '_ga_ABC123',
      '_gcl_aw',
      '_gcl_au',
    ]) {
      fixture.browser.document.cookie = `${name}=host; Path=/`
      fixture.browser.document.cookie = `${name}=parent; Path=/; Domain=andrewboltonsportsmassage.com`
    }
    fixture.browser.document.cookie = 'booking_preference=keep; Path=/'
    fixture.controller.choose('rejected')
    fixture.controller.navigate('/services')
    expect(pixel).toHaveBeenLastCalledWith('consent', 'revoke')
    expect(pixel.mock.calls.filter((call) => call[0] === 'track')).toHaveLength(
      1,
    )
    expect(fixture.browser.document.cookie).not.toMatch(/_fbp|_fbc|_ga|_gcl_/)
    expect(fixture.browser.document.cookie).toContain('booking_preference=keep')
    expect(fixture.browser.document.cookie).toContain(
      `${CONSENT_COOKIE}=rejected`,
    )
    expect(fixture.browser.sessionStorage.getItem('gclid')).toBeNull()
    const lastGoogleCommand = Array.from(
      fixture.browser.dataLayer!.at(-1) as IArguments,
    )
    expect(lastGoogleCommand).toEqual([
      'consent',
      'update',
      {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ])
    expect(fixture.reload).toHaveBeenCalledOnce()
  })

  it('does not queue or transmit Meta init/PageView if consent is withdrawn during loading', () => {
    const fixture = tab()
    fixture.controller.start()
    fixture.controller.choose('accepted')
    fixture.controller.navigate('/about')
    fixture.controller.navigate('/contact')
    expect(fixture.browser.fbq!.queue).toHaveLength(0)
    fixture.controller.choose('rejected')
    expect(fixture.browser.fbq!.queue).toHaveLength(0)
    const pixel = finishMeta(fixture)
    fixture.controller.navigate('/about')
    expect(pixel.mock.calls).toEqual([['consent', 'revoke']])
  })

  it('synchronizes acceptance and withdrawal across tabs without rebroadcasting', () => {
    const jar = new CookieJar()
    const first = tab(jar)
    const second = tab(jar)
    first.controller.start()
    second.controller.start()
    first.controller.choose('accepted')
    expect(second.changed).toHaveBeenLastCalledWith('accepted', true)
    expect(scripts(second)).toHaveLength(2)
    const firstPixel = finishMeta(first)
    const secondPixel = finishMeta(second)
    first.controller.choose('rejected')
    expect(second.changed).toHaveBeenLastCalledWith('rejected', false)
    second.controller.navigate('/contact')
    expect(secondPixel).toHaveBeenLastCalledWith('consent', 'revoke')
    expect(
      secondPixel.mock.calls.filter((call) => call[0] === 'track'),
    ).toHaveLength(1)
    expect(firstPixel).toHaveBeenLastCalledWith('consent', 'revoke')
    expect(second.reload).toHaveBeenCalledOnce()
  })

  it('rechecks the cookie before a pending loader or navigation even if a tab message was missed', () => {
    const fixture = tab()
    fixture.controller.start()
    fixture.controller.choose('accepted')
    fixture.browser.document.cookie = `${CONSENT_COOKIE}=rejected; Path=/`
    const pixel = finishMeta(fixture)
    fixture.controller.navigate('/contact')
    expect(pixel.mock.calls.filter((call) => call[0] === 'track')).toHaveLength(
      0,
    )
    expect(fixture.changed).toHaveBeenLastCalledWith('rejected', false)
  })

  it('uses current cross-tab consent when Meta finishes loading', () => {
    const jar = new CookieJar()
    const first = tab(jar)
    const second = tab(jar)
    first.controller.start()
    second.controller.start()
    first.controller.choose('accepted')
    second.controller.navigate('/about')
    second.controller.navigate('/contact')
    first.controller.choose('rejected')
    const pixel = finishMeta(second)
    expect(second.changed).toHaveBeenLastCalledWith('rejected', false)
    expect(
      pixel.mock.calls.filter(
        (call) => call[0] === 'init' || call[0] === 'track',
      ),
    ).toHaveLength(0)
  })

  it('loads trackers on a return visit with saved acceptance and clears the landing ID on rejection', () => {
    const jar = new CookieJar()
    const first = tab(jar)
    first.controller.start()
    first.controller.choose('accepted')
    const returning = tab(
      jar,
      'https://www.andrewboltonsportsmassage.com/?gclid=new-click',
    )
    returning.controller.start()
    expect(returning.changed).toHaveBeenLastCalledWith('accepted', true)
    expect(scripts(returning)).toHaveLength(2)
    expect(returning.browser.sessionStorage.getItem('gclid')).toBe('new-click')
    returning.controller.choose('rejected')
    expect(returning.browser.location.search).toBe('')
    expect(returning.browser.sessionStorage.getItem('gclid')).toBeNull()
  })

  it('supports storage-event synchronization when BroadcastChannel is unavailable', () => {
    const fixture = tab()
    Object.defineProperty(fixture.browser, 'BroadcastChannel', {
      value: undefined,
    })
    fixture.controller.start()
    fixture.browser.document.cookie = `${CONSENT_COOKIE}=accepted; Path=/`
    fixture.browser.dispatchEvent(
      new fixture.dom.window.StorageEvent('storage', {
        key: 'optional-tracking-consent',
      }),
    )
    expect(fixture.changed).toHaveBeenLastCalledWith('accepted', true)
    fixture.controller.choose('rejected')
    expect(
      fixture.browser.localStorage.getItem('optional-tracking-consent'),
    ).toBeTruthy()
  })
})

describe('regional defaults and preference migration', () => {
  it('starts tracking for confirmed NZ without persisting acceptance, and does not duplicate scripts/events', async () => {
    const detect = vi.fn(async () => true)
    const fixture = tab(
      undefined,
      'https://www.andrewboltonsportsmassage.com/?gclid=nz-click',
      detect,
    )
    fixture.controller.start()
    expect(scripts(fixture)).toHaveLength(0)
    await vi.waitFor(() => expect(scripts(fixture)).toHaveLength(2))
    expect(fixture.changed).toHaveBeenLastCalledWith(null, true)
    expect(fixture.browser.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
    expect(fixture.browser.document.cookie).not.toContain(CONSENT_COOKIE)
    expect(fixture.browser.sessionStorage.getItem('gclid')).toBe('nz-click')
    expect(hasOptionalTrackingConsent(fixture.browser)).toBe(true)
    const pixel = finishMeta(fixture)
    fixture.controller.navigate('/')
    fixture.controller.stop()
    fixture.controller.start()
    expect(detect).toHaveBeenCalledOnce()
    expect(scripts(fixture)).toHaveLength(2)
    expect(pixel.mock.calls.filter((call) => call[0] === 'track')).toHaveLength(
      1,
    )
    fixture.controller.choose('accepted')
    expect(scripts(fixture)).toHaveLength(2)
    expect(pixel.mock.calls.filter((call) => call[0] === 'track')).toHaveLength(
      1,
    )
    fixture.controller.choose('rejected')
    expect(fixture.browser.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe(
      'rejected',
    )
    expect(hasOptionalTrackingConsent(fixture.browser)).toBe(false)
    expect(fixture.reload).toHaveBeenCalledOnce()
  })

  it.each(['DE', 'FR', 'IE', 'GB', 'CH', null, 'US', 'nz', 'NZ,DE'])(
    'keeps %s disabled without affirmative consent',
    async (country) => {
      const fixture = tab(undefined, undefined, (browser) =>
        detectNzVisitor(browser),
      )
      fixture.browser.fetch = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ country }) })
      fixture.controller.start()
      await vi.waitFor(() =>
        expect(fixture.browser.fetch).toHaveBeenCalledOnce(),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(scripts(fixture)).toHaveLength(0)
      expect(hasOptionalTrackingConsent(fixture.browser)).toBe(false)
      fixture.controller.choose('accepted')
      expect(scripts(fixture)).toHaveLength(2)
      expect(fixture.browser.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe(
        'accepted',
      )
    },
  )

  it.each(['accepted', 'rejected'] as const)(
    'respects localStorage %s on reload without a cookie',
    (choice) => {
      const fixture = tab()
      fixture.browser.localStorage.setItem(CONSENT_STORAGE_KEY, choice)
      fixture.controller.start()
      expect(scripts(fixture)).toHaveLength(choice === 'accepted' ? 2 : 0)
      expect(fixture.changed).toHaveBeenLastCalledWith(
        choice,
        choice === 'accepted',
      )
    },
  )

  it.each(['accepted', 'rejected'] as const)(
    'preserves legacy cookie %s for NZ visitors',
    async (choice) => {
      const fixture = tab(undefined, undefined, async () => true)
      fixture.browser.document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/`
      fixture.controller.start()
      await Promise.resolve()
      expect(scripts(fixture)).toHaveLength(choice === 'accepted' ? 2 : 0)
      expect(
        fixture.browser.localStorage.getItem(CONSENT_STORAGE_KEY),
      ).toBeNull()
    },
  )

  it('honours rejection while a NZ lookup is pending', async () => {
    let resolve!: (isNz: boolean) => void
    const fixture = tab(
      undefined,
      undefined,
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    fixture.controller.start()
    fixture.controller.choose('rejected')
    resolve(true)
    await Promise.resolve()
    expect(scripts(fixture)).toHaveLength(0)
    expect(fixture.changed).toHaveBeenLastCalledWith('rejected', false)
  })

  it('gives a legacy rejection precedence over stored acceptance', () => {
    const fixture = tab(undefined, undefined, async () => true)
    fixture.browser.localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted')
    fixture.browser.document.cookie = `${CONSENT_COOKIE}=rejected; Path=/`
    fixture.controller.start()
    expect(scripts(fixture)).toHaveLength(0)
  })

  it('falls back to a legacy choice when localStorage is blocked', () => {
    const fixture = tab()
    Object.defineProperty(fixture.browser, 'localStorage', {
      get() {
        throw new Error('blocked')
      },
    })
    fixture.controller.start()
    fixture.controller.choose('accepted')
    expect(scripts(fixture)).toHaveLength(2)
    fixture.controller.choose('rejected')
    expect(fixture.browser.document.cookie).toContain(
      `${CONSENT_COOKIE}=rejected`,
    )
  })

  it('uses localStorage storage events and rechecks opt-outs before booking events', async () => {
    const fixture = tab(undefined, undefined, async () => true)
    fixture.controller.start()
    await Promise.resolve()
    fixture.browser.document
      .querySelector('script[src*="gtm.js"]')!
      .dispatchEvent(new fixture.dom.window.Event('load'))
    fixture.browser.localStorage.setItem(CONSENT_STORAGE_KEY, 'rejected')
    fixture.controller.trackBookingCompleted()
    expect(bookingEvents(fixture)).toHaveLength(0)
    fixture.browser.dispatchEvent(
      new fixture.dom.window.StorageEvent('storage', {
        key: CONSENT_STORAGE_KEY,
      }),
    )
    expect(fixture.reload).toHaveBeenCalledOnce()
  })

  it.each(['network', 'http', 'json'])(
    'fails closed on a %s lookup failure',
    async (failure) => {
      const fixture = tab()
      fixture.browser.fetch =
        failure === 'network'
          ? vi.fn().mockRejectedValue(new Error('offline'))
          : vi.fn().mockResolvedValue({
              ok: failure !== 'http',
              json: async () => {
                throw new Error('not JSON')
              },
            })
      expect(await detectNzVisitor(fixture.browser)).toBe(false)
    },
  )
})
