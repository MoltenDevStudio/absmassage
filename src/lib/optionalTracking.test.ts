import { afterEach, describe, expect, it, vi } from 'vitest'
import { CookieJar, JSDOM } from 'jsdom'
import { CONSENT_COOKIE, OptionalTrackingController } from './optionalTracking'

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
  const controller = new OptionalTrackingController(browser, changed, reload)
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
    expect(fixture.changed).toHaveBeenLastCalledWith(null)
  })

  it('persists rejection across visits without loading trackers', () => {
    const jar = new CookieJar()
    const first = tab(jar)
    first.controller.start()
    first.controller.choose('rejected')
    const next = tab(jar)
    next.controller.start()
    expect(next.changed).toHaveBeenLastCalledWith('rejected')
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

  it('tracks the latest accepted page when navigation occurs while Meta loads', () => {
    const fixture = tab()
    fixture.controller.start()
    fixture.controller.choose('accepted')
    fixture.controller.navigate('/contact')
    expect(fixture.browser.fbq!.queue).toHaveLength(0)
    const pixel = finishMeta(fixture)
    fixture.controller.navigate('/contact')
    expect(pixel.mock.calls.filter((call) => call[0] === 'track')).toHaveLength(
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
    expect(second.changed).toHaveBeenLastCalledWith('accepted')
    expect(scripts(second)).toHaveLength(2)
    const firstPixel = finishMeta(first)
    const secondPixel = finishMeta(second)
    first.controller.choose('rejected')
    expect(second.changed).toHaveBeenLastCalledWith('rejected')
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
    expect(fixture.changed).toHaveBeenLastCalledWith('rejected')
  })

  it('uses current cross-tab consent when Meta finishes loading', () => {
    const jar = new CookieJar()
    const first = tab(jar)
    const second = tab(jar)
    first.controller.start()
    second.controller.start()
    first.controller.choose('accepted')
    first.controller.choose('rejected')
    const pixel = finishMeta(second)
    expect(second.changed).toHaveBeenLastCalledWith('rejected')
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
    expect(returning.changed).toHaveBeenLastCalledWith('accepted')
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
    expect(fixture.changed).toHaveBeenLastCalledWith('accepted')
    fixture.controller.choose('rejected')
    expect(
      fixture.browser.localStorage.getItem('optional-tracking-consent'),
    ).toBeTruthy()
  })
})
