'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ExternalStore {
  id: string
  company_name: string
  store_code: string
  store_name: string
  address?: string
  is_active: boolean
}

export default function ExternalStoresPage() {
  const [stores, setStores] = useState<ExternalStore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/hearing-external-stores')
      if (res.ok) {
        const data = await res.json()
        setStores(Array.isArray(data) ? data : data.data || [])
      }
    } catch (error) {
      console.error('店舗取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">読み込み中...</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="page-title">外部店舗管理</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          新規登録
        </button>
      </div>

      {stores.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">外部店舗が登録されていません</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {stores.map((store) => (
            <div
              key={store.id}
              className="p-6 bg-white rounded-lg shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    {store.company_name} - {store.store_name}
                  </h2>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>店舗コード: {store.store_code}</p>
                    {store.address && <p>住所: {store.address}</p>}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded text-sm ${
                  store.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {store.is_active ? '有効' : '無効'}
                </span>
              </div>
              <div className="mt-4">
                <Link
                  href={`/dashboard/external-stores/${store.id}/items`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  品目管理
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
