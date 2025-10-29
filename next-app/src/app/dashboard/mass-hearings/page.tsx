'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Hearing {
  id: string
  title: string
  status: string
  response_deadline: string
  target_period_from: string
  target_period_to: string
}

export default function MassHearingsPage() {
  const [hearings, setHearings] = useState<Hearing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHearings()
  }, [])

  const fetchHearings = async () => {
    try {
      const res = await fetch('/api/hearings')
      if (res.ok) {
        const data = await res.json()
        setHearings(Array.isArray(data) ? data : data.data || [])
      }
    } catch (error) {
      console.error('ヒアリング取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">読み込み中...</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="page-title">一斉ヒアリング管理</h1>
        <Link 
          href="/dashboard/mass-hearings/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          新規作成
        </Link>
      </div>

      {hearings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">ヒアリングがありません</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {hearings.map((hearing) => (
            <Link
              key={hearing.id}
              href={`/dashboard/mass-hearings/${hearing.id}`}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{hearing.title}</h2>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>期間: {hearing.target_period_from} 〜 {hearing.target_period_to}</p>
                    <p>回答期限: {hearing.response_deadline}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded text-sm ${
                  hearing.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  hearing.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {hearing.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
