// next-sitemap.config.js
const nextSitemapConfig = {
  sourceDir: '.next',
  outDir: process.env.VERCEL === '1' ? 'public' : 'dist',
  siteUrl: process.env.SITE_URL || 'https://andrewboltonsportsmassage.com',
  generateRobotsTxt: true, // (optional) Generate robots.txt
  // Optional options for better control
  sitemapSize: 7000,
  changefreq: 'monthly',
  priority: 0.7,
  exclude: ['/privacypolicy', '/refundcancellations', '/api/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/privacypolicy', '/refundcancellations'],
      },
    ],
  },
}

export default nextSitemapConfig
