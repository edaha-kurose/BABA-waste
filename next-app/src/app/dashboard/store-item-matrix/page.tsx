'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/auth/session'

interface Collector {
  id: string
  company_name: string
}

interface MatrixRow {
  store_id: string
  store_code: string
  store_name: string
  item_name: string
  item_code: string | null
  current_assignments: Array<{ priority: number; collector_id: string; collector_name: string }>
}

export default function StoreItemMatrixPage() {
  const { user, userOrg } = useUser()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<MatrixRow[]>([])
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [saving, setSaving] = useState(false)
  const [showAll, setShowAll] = useState(false) // 折り畳み状態管理

  useEffect(() => {
    if (userOrg?.id) {
      fetchData()
    }
  }, [userOrg])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/store-item-collectors/matrix')
      const result = await res.json()
      
      if (result.data && result.data.length > 0) {
        // APIレスポンスをMatrixRow形式に変換
        const transformedRows: MatrixRow[] = result.data.map((item: any) => ({
          store_id: item.store_id,
          store_code: item.store_code,
          store_name: item.store_name,
          item_name: item.item_name,
          item_code: item.item_code || null,
          current_assignments: item.collectors.map((c: any, index: number) => ({
            priority: index + 1,
            collector_id: c.id,
            collector_name: c.name,
          })),
        }))
        setRows(transformedRows)
        
        // 業者候補を抽出（重複排除）
        const uniqueCollectors = Array.from(
          new Map(
            result.data.flatMap((item: any) => 
              item.collectors.map((c: any) => [c.id, { id: c.id, company_name: c.name }])
            )
          ).values()
        ) as Collector[]
        setCollectors(uniqueCollectors)
      }
    } catch (error) {
      console.error('データの取得に失敗しました:', error)
      alert('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (rowIndex: number, priority: number, collectorId: string) => {
    setRows(prev => {
      const next = [...prev]
      const r = { ...next[rowIndex] }
      const assignments = [...r.current_assignments]
      const idx = assignments.findIndex(a => a.priority === priority)
      const name = collectors.find(c => c.id === collectorId)?.company_name || ''
      const record = { priority, collector_id: collectorId, collector_name: name }
      if (idx >= 0) assignments[idx] = record
      else assignments.push(record)
      r.current_assignments = assignments.sort((a, b) => a.priority - b.priority)
      next[rowIndex] = r
      return next
    })
  }

  const handleSave = async () => {
    if (!userOrg?.id) return

    setSaving(true)
    try {
      const payload = rows.map(r => ({
        store_id: r.store_id,
        item_name: r.item_name,
        item_code: r.item_code,
        assignments: r.current_assignments
          .filter(a => a.collector_id)
          .map(a => ({ priority: a.priority, collector_id: a.collector_id })),
      }))

      const res = await fetch('/api/store-item-collectors/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      })

      if (res.ok) {
        alert('保存しました')
        fetchData()
      } else {
        const error = await res.json()
        alert(error.error || '保存に失敗しました')
      }
    } catch (error) {
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const visibleColumns = showAll ? 10 : 5 // 表示列数

  if (!user || !userOrg) {
    return (
      <div className="p-4">
        <p className="text-gray-600">ログインしてください</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">店舗×品目×業者マトリクス管理</h1>
      <p className="text-sm text-gray-600 mb-4">
        各店舗の品目に対して、収集業者を優先順位付きで設定できます。
      </p>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">全 {rows.length} 行</span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? '－ 折りたたむ' : '＋ さらに表示（業者6～10）'}
              </button>
              <button
                className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? '保存中…' : '変更を保存'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left border-r">店舗コード</th>
                  <th className="px-3 py-2 text-left border-r">店舗名</th>
                  <th className="px-3 py-2 text-left border-r">品目名</th>
                  <th className="px-3 py-2 text-left border-r">品目コード</th>
                  {Array.from({ length: visibleColumns }).map((_, i) => (
                    <th key={i} className="px-3 py-2 text-left">業者{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, rowIndex) => (
                  <tr key={`${r.store_id}-${r.item_name}`} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap border-r">{r.store_code}</td>
                    <td className="px-3 py-2 border-r">{r.store_name}</td>
                    <td className="px-3 py-2 border-r">{r.item_name}</td>
                    <td className="px-3 py-2 border-r">{r.item_code || '-'}</td>
                    {Array.from({ length: visibleColumns }).map((_, i) => {
                      const priority = i + 1
                      const current = r.current_assignments.find(a => a.priority === priority)?.collector_id || ''
                      return (
                        <td key={i} className="px-3 py-2">
                          <select
                            className="border rounded px-2 py-1 w-44 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={current}
                            onChange={(e) => handleChange(rowIndex, priority, e.target.value)}
                          >
                            <option value="">未選択</option>
                            {collectors.map(c => (
                              <option key={c.id} value={c.id}>{c.company_name}</option>
                            ))}
                          </select>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
