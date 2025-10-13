import { Button, Typography } from 'antd'
import Link from 'next/link'

const { Title, Paragraph } = Typography

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <Title level={1}>廃棄物管理システム</Title>
        <Paragraph className="text-lg">
          Next.js 14 + Prisma + Supabaseで構築された新しいアーキテクチャ
        </Paragraph>
        
        <div className="mt-8 space-x-4">
          <Link href="/dashboard">
            <Button type="primary" size="large">
              ダッシュボード
            </Button>
          </Link>
          <Link href="/api/health">
            <Button size="large">
              API Health Check
            </Button>
          </Link>
        </div>
        
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <Title level={3}>Phase 2: アーキテクチャ改善</Title>
          <ul className="list-disc list-inside space-y-2">
            <li>✅ Next.js 14 App Router</li>
            <li>🔄 Prisma ORM セットアップ中</li>
            <li>⏳ BFF API Routes</li>
            <li>⏳ コンポーネント移行</li>
          </ul>
        </div>
      </div>
    </main>
  )
}

