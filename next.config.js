/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Mark youtube-transcript as server-side only (not bundled for client)
  // Note: serverExternalPackages is available in Next.js 13.1+
  experimental: {
    serverComponentsExternalPackages: ['youtube-transcript', 'mammoth'],
  },
}

module.exports = nextConfig

