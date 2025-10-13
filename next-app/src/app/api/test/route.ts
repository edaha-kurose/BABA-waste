import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/test - Prisma接続テスト
export async function GET() {
  try {
    // Prismaクライアントの動作確認
    const result = await prisma.$queryRaw`SELECT 1 as test`
    
    return NextResponse.json({
      status: 'ok',
      message: 'Prisma client is working',
      test: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[API] Prisma test failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Prisma client failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

