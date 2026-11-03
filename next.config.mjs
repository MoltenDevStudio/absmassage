/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Keep static exports for existing static hosts; Vercel needs a runtime
  // for the trusted, per-request country lookup. Pages remain prerendered.
  ...(process.env.VERCEL === '1'
    ? {}
    : { output: 'export', distDir: './dist' }),
}

export default nextConfig
