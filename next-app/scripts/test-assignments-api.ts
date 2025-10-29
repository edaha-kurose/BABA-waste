/**
 * 割り当てAPIのレスポンスをテスト
 */

async function testAPI() {
  const orgId = '00000000-0000-0000-0000-000000000004'
  const url = `http://localhost:3001/api/store-collector-assignments?org_id=${orgId}`

  console.log('🔍 APIをテスト中...')
  console.log('URL:', url)
  console.log('')

  try {
    const response = await fetch(url, {
      headers: {
        'Cookie': 'e2e-bypass=1', // E2Eバイパス
      },
    })

    console.log('📊 Status:', response.status)
    console.log('📊 Status Text:', response.statusText)
    console.log('')

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ APIエラー:')
      console.error('   Error:', data.error)
      console.error('   Details:', JSON.stringify(data.details, null, 2))
      return
    }

    console.log('✅ APIレスポンス成功')
    console.log('   データ件数:', data.data?.length || 0)
    console.log('   Total:', data.meta?.total || 0)
    console.log('')

    if (data.data && data.data.length > 0) {
      console.log('📋 最初の3件:')
      data.data.slice(0, 3).forEach((item: any, index: number) => {
        console.log(`\n${index + 1}. ID: ${item.id}`)
        console.log(`   store_id: ${item.store_id}`)
        console.log(`   collector_id: ${item.collector_id}`)
        console.log(`   stores: ${item.stores ? JSON.stringify(item.stores) : 'null'}`)
        console.log(`   collectors: ${item.collectors ? JSON.stringify(item.collectors) : 'null'}`)
        console.log(`   is_primary: ${item.is_primary}`)
        console.log(`   deleted_at: ${item.deleted_at || 'null'}`)
      })
    } else {
      console.log('⚠️ データが空です')
    }
  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

testAPI()


