'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spin } from 'antd'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // ルートアクセス時は常にログインページへリダイレクト
    router.push('/login')
  }, [router])

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
      }}
    >
      <Spin size="large" tip="読み込み中..." />
    </div>
  )
}
