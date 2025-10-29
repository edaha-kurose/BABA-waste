"use client"

import { useMemo, useState } from 'react'

type Candidate = { id: string; company_name: string }
type Row = {
  store_id: string
  store_code: string
  store_name: string
  item_name: string
  item_code: string | null
  current_assignments: Array<{ priority: number; collector_id: string; collector_name: string }>
  collector_candidates: Candidate[]
}

type Props = { initialRows: Row[] }

export default function MissingMatrixClient({ initialRows }: Props) {
  console.log('[MissingMatrixClient] Received initialRows:', initialRows.length)
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [saving, setSaving] = useState(false)
  const [showAll, setShowAll] = useState(false) // 折り畳み状態管理

  const handleChange = (rowIndex: number, priority: number, collectorId: string) => {
    setRows(prev => {
      const next = [...prev]
      const r = { ...next[rowIndex] }
      const assignments = [...r.current_assignments]
      const idx = assignments.findIndex(a => a.priority === priority)
      const name = r.collector_candidates.find(c => c.id === collectorId)?.company_name || ''
      const record = { priority, collector_id: collectorId, collector_name: name }
      if (idx >= 0) assignments[idx] = record
      else assignments.push(record)
      r.current_assignments = assignments.sort((a, b) => a.priority - b.priority)
      next[rowIndex] = r
      return next
    })
  }

  const payload = useMemo(() => rows.map(r => ({
    store_id: r.store_id,
    item_name: r.item_name,
    item_code: r.item_code,
    assignments: r.current_assignments
      .filter(a => a.collector_id)
      .map(a => ({ priority: a.priority, collector_id: a.collector_id })),
  })), [rows])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/store-item-collectors/missing-matrix/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json?.error || '保存に失敗しました')
        return
      }
      alert(`保存完了: ${json.updated}件`)
    } catch (e: any) {
      alert(e?.message || '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const visibleColumns = showAll ? 10 : 5 // 表示列数

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">未設定 {rows.length} 行</span>
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
            onClick={save}
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
                        {r.collector_candidates.map(c => (
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
  )
}



