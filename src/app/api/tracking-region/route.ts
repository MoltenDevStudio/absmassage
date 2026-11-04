// On Vercel this is a dynamic route: reading request.headers opts out of caching.
// Static exports on other hosts can only return an unknown country.
export function GET(request: Request) {
  // Vercel overwrites this header at its trusted ingress. Do not trust it on
  // arbitrary hosts, or accept country overrides from query strings/cookies.
  const value =
    process.env.VERCEL === '1'
      ? request.headers.get('x-vercel-ip-country')
      : null
  const country = value && /^[A-Z]{2}$/.test(value) ? value : null
  return Response.json(
    { country },
    {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    },
  )
}
