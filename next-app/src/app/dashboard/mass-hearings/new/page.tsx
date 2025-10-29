'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewHearingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      target_period_from: formData.get('target_period_from'),
      target_period_to: formData.get('target_period_to'),
      response_deadline: formData.get('response_deadline'),
    }

    // クライアント側バリデーション: 終了日が開始日より前なら送信しない
    const from = data.target_period_from ? new Date(String(data.target_period_from)) : null
    const to = data.target_period_to ? new Date(String(data.target_period_to)) : null
    if (from && to && to.getTime() < from.getTime()) {
      alert('対象期間の終了日は開始日以降にしてください。')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/hearings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        router.push('/dashboard/mass-hearings')
      } else {
        alert('作成に失敗しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6" data-testid="page-title">新規ヒアリング作成</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="w-full border rounded px-3 py-2"
            placeholder="例: GW期間中の回収可否確認"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            説明
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="w-full border rounded px-3 py-2"
            placeholder="ヒアリングの詳細説明"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="target_period_from" className="block text-sm font-medium mb-2">
              対象期間（開始） <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="target_period_from"
              name="target_period_from"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="target_period_to" className="block text-sm font-medium mb-2">
              対象期間（終了） <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="target_period_to"
              name="target_period_to"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="response_deadline" className="block text-sm font-medium mb-2">
            回答期限 <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="response_deadline"
            name="response_deadline"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '作成中...' : '作成'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border px-6 py-2 rounded hover:bg-gray-50"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  )
}
