'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type HearingTarget = {
  id: string
  hearing_id: string
  company_name: string
  store_name: string
  item_name: string
  response_status: string
}

export default function UnlockRequestPage() {
  const router = useRouter()
  const params = useParams()
  const targetId = params?.id as string

  const [target, setTarget] = useState<HearingTarget | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (targetId) {
      fetchTarget()
    }
  }, [targetId])

  const fetchTarget = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/hearings/targets/${targetId}`)
      if (!response.ok) throw new Error('Failed to fetch target')
      const data = await response.json()
      setTarget(data.target)
    } catch (error) {
      console.error('Failed to load target:', error)
      alert('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      alert('理由を入力してください')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch(`/api/hearings/targets/${targetId}/unlock-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_reason: reason,
        }),
      })

      if (!response.ok) throw new Error('Failed to submit unlock request')

      alert('ロック解除申請を送信しました。管理者の承認をお待ちください。')
      router.push('/dashboard/collector-hearings')
    } catch (error) {
      console.error('Failed to submit unlock request:', error)
      alert('申請の送信に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!target) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">ヒアリングが見つかりません</p>
        <Link
          href="/dashboard/collector-hearings"
          className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          一覧に戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">ロック解除申請</h1>
        <Link
          href="/dashboard/collector-hearings"
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← 一覧に戻る
        </Link>
      </div>

      {/* 対象情報 */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">対象情報</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">企業名</p>
            <p className="mt-1 font-medium">{target.company_name}</p>
          </div>
          <div>
            <p className="text-gray-600">店舗名</p>
            <p className="mt-1 font-medium">{target.store_name}</p>
          </div>
          <div>
            <p className="text-gray-600">品目</p>
            <p className="mt-1 font-medium">{target.item_name}</p>
          </div>
          <div>
            <p className="text-gray-600">現在のステータス</p>
            <p className="mt-1">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                ロック済み
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 申請フォーム */}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">申請内容</h2>
        <p className="text-sm text-gray-600">
          ロックを解除する理由を入力してください。管理者が承認すると、再度回答を編集できるようになります。
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            解除理由 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3"
            rows={5}
            placeholder="例: 回収可能日に変更があったため、再度回答を修正したい"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-4 pt-4">
          <Link
            href="/dashboard/collector-hearings"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={submitting || !reason.trim()}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '送信中...' : 'ロック解除申請'}
          </button>
        </div>
      </form>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ 注意事項</h3>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
          <li>申請は管理者が確認します</li>
          <li>承認されるまで回答の編集はできません</li>
          <li>却下された場合は再度申請が必要です</li>
        </ul>
      </div>
    </div>
  )
}





