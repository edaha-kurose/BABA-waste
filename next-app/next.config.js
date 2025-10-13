/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Ant Designの最適化
  transpilePackages: ['antd', '@ant-design/icons'],
}

module.exports = nextConfig

