# Andrew Bolton Sports Massage

This is the website for my massage business.

My original massage website was built with squarespace. I then rebuilt it with vanilla HTML, CSS & JS, but 3 years on I felt that it was looking a bit shabby, needed a bit of refreshment + I wanted to componentise it, as I had learnt more about doing that & was having to update things in too many places in the previous setup.

## The Build

I originally built this with React to make it responsive & easy to create the components. Then when I launched it was working great BUT the SEO was not.

So I investigated & experimented with a few different pathways of SSG (Static Site Generation). These included Vike, vite-plugin-ssr-ssg & react-snapshot, however none of these were particularly fruitful.

I decided on Next.js because I was interested in the tech, had a recommendation & was about to join a project that was also using it. When I researched it I also found that it would suit my situation well, I can use it to generate a static site now, & then in the future (when my bluehost subscription ends), I can change it to being a Server Side Rendered app.

## Website tracking preferences

The existing banner and footer **Cookie settings** panel keep one combined analytics/advertising choice; there were no granular controls. Equally styled **Accept all** and **Reject all** controls enable or disable both categories. New explicit decisions are saved as versioned JSON under `optional_tracking_consent` in localStorage and in the existing one-year functional cookie as a fallback. Each record includes analytics/advertising choices, country, applicable region (NZ, EEA, UK, CH, OTHER or UNKNOWN) and the decision timestamp. Existing explicit `accepted`/`rejected` values remain valid without fabricating historic timestamps. A rejection in either store takes precedence. Malformed/inconsistent records cannot authorize tracking. No preference is saved for an automatic default.

With no saved choice, only visitors confirmed as NZ by `/api/tracking-region` receive automatic tracking and no banner. EEA/UK/Swiss visitors, all other countries and unknown locations see the existing banner when no valid preference exists, and tracking remains disabled until affirmative consent. Returning visitors with valid explicit choices do not see the banner again. While the country lookup is pending, unsaved visitors receive no tracking and no banner flash; failure or timeout resolves to UNKNOWN and requires consent. The lookup uses Vercel's country header, makes no third-party geolocation request, is not cached and fails closed after three seconds.

On Vercel (`VERCEL=1`), Next.js retains a runtime for the country endpoint; the website pages remain prerendered. Existing non-Vercel static exports continue to work and return an unknown country. To enable automatic NZ tracking on another host, that host must supply a trusted per-request implementation of the same endpoint returning `{ "country": "NZ" }` only for reliably identified NZ visitors. Never serve a static NZ response or infer country from language/timezone. IP geolocation reflects the visitor's network location and can be affected by VPNs/proxies.

GTM, Meta Pixel, Vercel Analytics, Speed Insights and booking attribution follow the same setting. Opt-out revokes Google/Meta consent, clears supported measurement cookies and the stored ad click identifier, then reloads the document to remove running tags. Other tabs reconcile changes through BroadcastChannel, storage events and focus. Meta automatic event/metadata collection is disabled; booking measurement pushes only the existing generic `clinikoBookingCompleted` event, with no booking form data.

Run `npx vitest run --maxWorkers=2 --minWorkers=1` for consent, country endpoint and footer/booking tests. Run `npx eslint src next.config.mjs next-sitemap.config.js` for source lint; the repository-wide lint command also traverses generated build files. Both `npm run build` (static export) and `VERCEL=1 npm run build` (runtime endpoint) should succeed.

The repository contains GTM container `GTM-PSTX555` and Meta Pixel `2126552771609777`, but no exported GTM configuration or standalone GA4/Google Ads IDs. Verify the published container in Tag Assistant/GA4 DebugView before merging: one initial page view, appropriate consent requirements for every tag, no form/health data collection, no automatic or enhanced matching of personal details, and no duplicate GA4/Meta tags. Client tests can verify script gating, event payloads and consent updates; they cannot confirm receipt in Google/Meta accounts or audit remotely configured tags.
