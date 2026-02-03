/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React strict mode to prevent version conflicts
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
