'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Hearing = {
  id: string
  title: string
  description: string | null
  target_period_from: string
  target_period_to: string
  response_deadline: string
  status: 'DRAFT' | 'ACTIVE' | 'LOCKED' | 'CLOSED'
  created_at: string
}

type HearingTarget = {
  id: string
  collector_id: string
  company_name: string
  store_name: string
  item_name: string
  response_status: string
  responded_at: string | null
  _count?: {
    hearing_responses: number
  }
}

type Stats = {
  total_targets: number
  responded: number
  not_responded: number
  response_rate: number
}

const STATUS_LABELS = {
  DRAFT: '下書き',
  ACTIVE: '配信中',
  LOCKED: 'ロック済み',
  CLOSED: '終了',
}

const RESPONSE_STATUS_LABELS = {
  NOT_RESPONDED: '未回答',
  RESPONDED: '回答済み',
  LOCKED: 'ロック済み',
  UNLOCK_REQUESTED: 'ロック解除申請中',
}

export default function MassHearingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const hearingId = params?.id as string

  const [hearing, setHearing] = useState<Hearing | null>(null)
  const [targets, setTargets] = useState<HearingTarget[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (hearingId) {
      fetchHearingDetail()
    }
  }, [hearingId])

  const fetchHearingDetail = async () => {
    try {
      setLoading(true)

      const [hearingRes, targetsRes] = await Promise.all([
        fetch(`/api/hearings/${hearingId}`),
        fetch(`/api/hearings/${hearingId}/targets`),
      ])

      if (!hearingRes.ok || !targetsRes.ok) {
        throw new Error('Failed to fetch hearing details')
      }

      const [hearingData, targetsData] = await Promise.all([
        hearingRes.json(),
        targetsRes.json(),
      ])

      setHearing(hearingData.hearing)
      setTargets(targetsData.targets || [])

      // 集計計算
      const total = targetsData.targets?.length || 0
      const responded = targetsData.targets?.filter((t: HearingTarget) => t.response_status === 'RESPONDED').length || 0
      const notResponded = total - responded
      const responseRate = total > 0 ? (responded / total) * 100 : 0

      setStats({
        total_targets: total,
        responded,
        not_responded: notResponded,
        response_rate: responseRate,
      })
    } catch (error) {
      console.error('Failed to load hearing detail:', error)
      alert('ヒアリング詳細の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`ステータスを「${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}」に変更しますか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/hearings/${hearingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      alert('ステータスを更新しました')
      fetchHearingDetail()
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('ステータス更新に失敗しました')
    }
  }

  const handleLockAll = async () => {
    if (!confirm('回答期限を過ぎたため、すべての回答をロックしますか？')) return

    try {
      // TODO: ロック処理APIを実装
      alert('ロック処理を実行しました')
      fetchHearingDetail()
    } catch (error) {
      console.error('Failed to lock all:', error)
      alert('ロック処理に失敗しました')
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

  if (!hearing) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">ヒアリングが見つかりません</p>
        <Link
          href="/dashboard/mass-hearings"
          className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          一覧に戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{hearing.title}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {hearing.description || '説明なし'}
          </p>
        </div>
        <Link
          href="/dashboard/mass-hearings"
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← 一覧に戻る
        </Link>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm text-gray-600">ステータス</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {STATUS_LABELS[hearing.status]}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm text-gray-600">対象件数</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {stats?.total_targets || 0}件
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm text-gray-600">回答済み</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {stats?.responded || 0}件
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-sm text-gray-600">回答率</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">
            {stats?.response_rate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">基本情報</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">対象期間</p>
            <p className="mt-1 font-medium">
              {new Date(hearing.target_period_from).toLocaleDateString('ja-JP')} 〜{' '}
              {new Date(hearing.target_period_to).toLocaleDateString('ja-JP')}
            </p>
          </div>
          <div>
            <p className="text-gray-600">回答期限</p>
            <p className="mt-1 font-medium">
              {new Date(hearing.response_deadline).toLocaleString('ja-JP')}
            </p>
          </div>
          <div>
            <p className="text-gray-600">作成日</p>
            <p className="mt-1 font-medium">
              {new Date(hearing.created_at).toLocaleString('ja-JP')}
            </p>
          </div>
        </div>
      </div>

      {/* ステータス変更 */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">ステータス管理</h2>
        <div className="flex items-center gap-4">
          {hearing.status === 'DRAFT' && (
            <button
              onClick={() => handleStatusChange('ACTIVE')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              配信開始
            </button>
          )}
          {hearing.status === 'ACTIVE' && (
            <>
              <button
                onClick={handleLockAll}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                全件ロック
              </button>
              <button
                onClick={() => handleStatusChange('CLOSED')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                終了
              </button>
            </>
          )}
          {hearing.status === 'LOCKED' && (
            <button
              onClick={() => handleStatusChange('CLOSED')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              終了
            </button>
          )}
        </div>
      </div>

      {/* ターゲット一覧 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">ヒアリング対象一覧</h2>
        </div>
        {targets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">対象がありません</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  企業名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  店舗名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  品目
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  回答状況
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  回答日時
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {targets.map((target) => (
                <tr key={target.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {target.company_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {target.store_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {target.item_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        target.response_status === 'RESPONDED'
                          ? 'bg-green-100 text-green-800'
                          : target.response_status === 'LOCKED'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {RESPONSE_STATUS_LABELS[target.response_status as keyof typeof RESPONSE_STATUS_LABELS]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {target.responded_at
                      ? new Date(target.responded_at).toLocaleString('ja-JP')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/dashboard/mass-hearings/${hearingId}/targets/${target.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}





