import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// DATABASE_URLを明示的に取得（.envファイルのエンコーディング問題回避）
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not defined in environment variables')
  }
  return url
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// デフォルトエクスポートも提供（互換性のため）
export default prisma

