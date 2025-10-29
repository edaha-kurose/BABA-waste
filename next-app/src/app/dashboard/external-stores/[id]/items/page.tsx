'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type ExternalStore = {
  id: string
  company_name: string
  store_name: string
  store_code: string
}

type Item = {
  id: string
  item_name: string
  item_code: string | null
  sort_order: number
  assigned_collector_id: string | null
  is_active: boolean
}

export default function ExternalStoreItemsPage() {
  const router = useRouter()
  const params = useParams()
  const storeId = params?.id as string

  const [store, setStore] = useState<ExternalStore | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  const [formData, setFormData] = useState({
    item_name: '',
    item_code: '',
    sort_order: 0,
    assigned_collector_id: '',
    is_active: true,
  })

  useEffect(() => {
    if (storeId) {
      fetchStoreAndItems()
    }
  }, [storeId])

  const fetchStoreAndItems = async () => {
    try {
      setLoading(true)

      const [storeRes, itemsRes] = await Promise.all([
        fetch(`/api/hearing-external-stores/${storeId}`),
        fetch(`/api/hearing-external-stores/${storeId}/items`),
      ])

      if (!storeRes.ok || !itemsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [storeData, itemsData] = await Promise.all([
        storeRes.json(),
        itemsRes.json(),
      ])

      setStore(storeData.store)
      setItems(itemsData.items || [])
    } catch (error) {
      console.error('Failed to load data:', error)
      alert('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const method = editingItem ? 'PATCH' : 'POST'
      const url = editingItem
        ? `/api/hearing-external-stores/${storeId}/items/${editingItem.id}`
        : `/api/hearing-external-stores/${storeId}/items`

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to save item')

      alert(editingItem ? '更新しました' : '作成しました')
      setShowModal(false)
      setEditingItem(null)
      resetForm()
      fetchStoreAndItems()
    } catch (error) {
      console.error('Failed to save item:', error)
      alert('保存に失敗しました')
    }
  }

  const handleEdit = (item: Item) => {
    setEditingItem(item)
    setFormData({
      item_name: item.item_name,
      item_code: item.item_code || '',
      sort_order: item.sort_order,
      assigned_collector_id: item.assigned_collector_id || '',
      is_active: item.is_active,
    })
    setShowModal(true)
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('この品目を削除してもよろしいですか？')) return

    try {
      const response = await fetch(`/api/hearing-external-stores/${storeId}/items/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete item')

      alert('削除しました')
      fetchStoreAndItems()
    } catch (error) {
      console.error('Failed to delete item:', error)
      alert('削除に失敗しました')
    }
  }

  const resetForm = () => {
    setFormData({
      item_name: '',
      item_code: '',
      sort_order: 0,
      assigned_collector_id: '',
      is_active: true,
    })
  }

  const openNewModal = () => {
    setEditingItem(null)
    resetForm()
    setShowModal(true)
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

  if (!store) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">店舗が見つかりません</p>
        <Link
          href="/dashboard/external-stores"
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
          <h1 className="text-3xl font-bold text-gray-900">
            {store.company_name} - {store.store_name}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            店舗コード: {store.store_code}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/external-stores"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← 店舗一覧
          </Link>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 品目追加
          </button>
        </div>
      </div>

      {/* 品目一覧 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">品目一覧</h2>
          <p className="mt-1 text-sm text-gray-600">
            この店舗で回収する廃棄物の種類を管理します
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">品目がありません</p>
            <button
              onClick={openNewModal}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              最初の品目を追加
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  表示順
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  品目名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  品目コード
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  状態
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.sort_order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.item_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.item_code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          item.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.is_active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingItem ? '品目編集' : '品目追加'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  品目名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.item_name}
                  onChange={(e) =>
                    setFormData({ ...formData, item_name: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="例: 可燃ゴミ、段ボール、不燃物"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">品目コード</label>
                <input
                  type="text"
                  value={formData.item_code}
                  onChange={(e) =>
                    setFormData({ ...formData, item_code: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="例: COMB001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">表示順</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <label className="ml-2 text-sm text-gray-700">有効</label>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingItem(null)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingItem ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}





