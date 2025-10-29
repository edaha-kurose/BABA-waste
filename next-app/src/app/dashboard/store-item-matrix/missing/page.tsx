import { cookies } from 'next/headers'
import MissingMatrixClient from './MissingMatrixClient'

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

export const dynamic = 'force-dynamic'

async function loadMissing(e2eBypass: boolean): Promise<{ rows: Row[] }> {
  const cookieHeader = cookies().toString()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  const url = new URL('/api/store-item-collectors/missing-matrix', baseUrl)
  if (e2eBypass) {
    url.searchParams.set('e2e', '1')
  }
  console.log('[Missing Matrix] Fetching from:', url.toString())
  const res = await fetch(url.toString(), {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  })
  if (!res.ok) {
    console.error('[Missing Matrix] Fetch error:', res.status, await res.text())
    return { rows: [] }
  }
  const json = await res.json()
  console.log('[Missing Matrix] Fetched data count:', json.data?.length || 0)
  return { rows: json.data as Row[] }
}

export default async function Page({ searchParams }: { searchParams: { e2e?: string } }) {
  const e2eBypass = searchParams.e2e === '1'
  console.log('[Missing Matrix Page] E2E Bypass:', e2eBypass)
  const { rows } = await loadMissing(e2eBypass)
  console.log('[Missing Matrix Page] Loaded rows:', rows.length)
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">未設定マトリクスの編集</h1>
      <p className="text-sm text-gray-600 mb-4">一部の店舗で、品目と収集業者の対応関係（マトリクス）が未設定です。下表で直接設定できます。</p>
      <MissingMatrixClient initialRows={rows} />
    </div>
  )
}


