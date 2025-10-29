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
  hearing: {
    title: string
    description: string | null
    target_period_from: string
    target_period_to: string
    response_deadline: string
  }
}

type Response = {
  target_date: string
  is_available: boolean
}

type Comment = {
  id: string
  comment: string
  user_role: string
  user_name: string
  created_at: string
  parent_comment_id: string | null
}

export default function CollectorHearingRespondPage() {
  const router = useRouter()
  const params = useParams()
  const targetId = params?.id as string

  const [target, setTarget] = useState<HearingTarget | null>(null)
  const [responses, setResponses] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (targetId) {
      fetchTargetDetail()
      fetchComments()
    }
  }, [targetId])

  const fetchTargetDetail = async () => {
    try {
      setLoading(true)

      // ターゲット情報取得
      const targetRes = await fetch(`/api/hearings/targets/${targetId}`)
      if (!targetRes.ok) throw new Error('Failed to fetch target')
      const targetData = await targetRes.json()
      setTarget(targetData.target)

      // 既存回答取得
      const responsesRes = await fetch(`/api/hearings/${targetData.target.hearing_id}/responses?target_id=${targetId}`)
      if (responsesRes.ok) {
        const responsesData = await responsesRes.json()
        const responsesMap: Record<string, boolean> = {}
        responsesData.responses?.forEach((r: Response) => {
          responsesMap[r.target_date] = r.is_available
        })
        setResponses(responsesMap)
      }
    } catch (error) {
      console.error('Failed to load target:', error)
      alert('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/hearings/targets/${targetId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
    }
  }

  const handleToggleDate = (dateStr: string) => {
    setResponses((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }))
  }

  const handleSubmit = async () => {
    if (!target) return

    try {
      setSaving(true)

      const payload = Object.entries(responses).map(([date, isAvailable]) => ({
        target_date: date,
        is_available: isAvailable,
      }))

      const response = await fetch(`/api/hearings/${target.hearing_id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_id: targetId,
          responses: payload,
        }),
      })

      if (!response.ok) throw new Error('Failed to save responses')

      alert('回答を保存しました')
      router.push('/dashboard/collector-hearings')
    } catch (error) {
      console.error('Failed to save responses:', error)
      alert('回答の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const response = await fetch(`/api/hearings/targets/${targetId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: newComment,
        }),
      })

      if (!response.ok) throw new Error('Failed to add comment')

      alert('コメントを投稿しました')
      setNewComment('')
      fetchComments()
    } catch (error) {
      console.error('Failed to add comment:', error)
      alert('コメント投稿に失敗しました')
    }
  }

  // 日付リスト生成
  const generateDateList = () => {
    if (!target) return []
    const from = new Date(target.hearing.target_period_from)
    const to = new Date(target.hearing.target_period_to)
    const dates: string[] = []

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0])
    }

    return dates
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

  const dateList = generateDateList()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{target.hearing.title}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {target.company_name} - {target.store_name} ({target.item_name})
          </p>
        </div>
        <Link
          href="/dashboard/collector-hearings"
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← 一覧に戻る
        </Link>
      </div>

      {/* 説明 */}
      {target.hearing.description && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">{target.hearing.description}</p>
        </div>
      )}

      {/* 回答マトリクス */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">回収可能日を選択</h2>
        <p className="text-sm text-gray-600 mb-4">
          回収可能な日付にチェックを入れてください
        </p>

        <div className="grid grid-cols-7 gap-2">
          {dateList.map((dateStr) => {
            const date = new Date(dateStr)
            const dayOfWeek = date.toLocaleDateString('ja-JP', { weekday: 'short' })
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const isChecked = responses[dateStr] || false

            return (
              <div
                key={dateStr}
                onClick={() => handleToggleDate(dateStr)}
                className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-colors ${
                  isChecked
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${isWeekend ? 'bg-red-50' : ''}`}
              >
                <div className="text-xs text-gray-500">{dayOfWeek}</div>
                <div className="text-lg font-bold text-gray-900">
                  {date.getDate()}
                </div>
                <div className="text-xs text-gray-600">
                  {date.getMonth() + 1}月
                </div>
                {isChecked && (
                  <div className="mt-2 text-blue-600 font-bold">✓</div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex items-center justify-end gap-4">
          <button
            onClick={() => setResponses({})}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            クリア
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '回答を保存'}
          </button>
        </div>
      </div>

      {/* コメント */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">コメント</h2>

        {/* コメント一覧 */}
        <div className="space-y-4 mb-6">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-500">コメントはまだありません</p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-4 rounded-lg ${
                  comment.user_role === 'ADMIN'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {comment.user_name}
                    {comment.user_role === 'ADMIN' && (
                      <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                        システム管理者
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.created_at).toLocaleString('ja-JP')}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{comment.comment}</p>
              </div>
            ))
          )}
        </div>

        {/* 新規コメント */}
        <div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3"
            rows={3}
            placeholder="コメントを入力..."
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              コメント投稿
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}





