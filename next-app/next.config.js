/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // output: 'standalone' はVercelで自動設定されるため不要
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // ESMの外部化を緩和
    esmExternals: 'loose',
  },
  // Ant Designの最適化を削除（問題の原因）
  transpilePackages: [],
}

module.exports = nextConfig

