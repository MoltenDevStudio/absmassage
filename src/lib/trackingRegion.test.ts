import { afterEach, expect, it, vi } from 'vitest'
import { GET } from '../app/api/tracking-region/route'

afterEach(() => {
  vi.unstubAllEnvs()
})

it.each([
  ['1', 'NZ', 'NZ'],
  ['1', 'DE', 'DE'],
  ['1', 'GB', 'GB'],
  ['1', 'CH', 'CH'],
  ['1', undefined, null],
  ['1', 'NZ,DE', null],

  ['0', 'NZ', null],
])(
  'uses only valid platform country headers (Vercel=%s, header=%s)',
  (vercel, header, country) => {
    vi.stubEnv('VERCEL', vercel)
    const headers = header ? { 'x-vercel-ip-country': header } : undefined
    const res = GET(
      new Request('https://example.com/api/tracking-region?country=NZ', {
        headers,
      }),
    )
    expect(res.headers.get('Cache-Control')).toBe(
      'private, no-store, max-age=0',
    )
    return expect(res.json()).resolves.toEqual({ country })
  },
)
