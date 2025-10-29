'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HearingTarget {
  id: string
  hearing_id: string
  company_name: string
  store_name: string
  item_name: string
  response_status: string
  hearings: {
    title: string
    response_deadline: string
  }
}

export default function CollectorHearingsPage() {
  const [targets, setTargets] = useState<HearingTarget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTargets()
  }, [])

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/hearings/my-targets')
      if (res.ok) {
        const data = await res.json()
        setTargets(Array.isArray(data) ? data : data.targets || [])
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
      <h1 className="text-3xl font-bold mb-6" data-testid="page-title">ヒアリング回答</h1>

      {targets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">対応中のヒアリングはありません</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {targets.map((target) => (
            <div
              key={target.id}
              className="p-6 bg-white rounded-lg shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{target.hearings.title}</h2>
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p>企業: {target.company_name}</p>
                <p>店舗: {target.store_name}</p>
                <p>品目: {target.item_name}</p>
                <p>回答期限: {target.hearings.response_deadline}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/collector-hearings/${target.hearing_id}/respond?target_id=${target.id}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  回答する
                </Link>
                <span className={`px-3 py-1 rounded text-sm ${
                  target.response_status === 'RESPONDED' ? 'bg-green-100 text-green-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {target.response_status === 'RESPONDED' ? '回答済み' : '未回答'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
