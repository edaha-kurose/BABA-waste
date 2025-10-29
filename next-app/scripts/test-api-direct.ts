/**
 * APIに直接アクセスしてレスポンスを確認
 */

async function testAPI() {
  const orgId = '00000000-0000-0000-0000-000000000004'
  const url = `http://localhost:3001/api/store-collector-assignments?org_id=${orgId}`

  console.log('🔍 APIに直接アクセス中...')
  console.log('URL:', url)
  console.log('')

  try {
    // E2Eバイパスを使用してリクエスト
    const response = await fetch(url, {
      headers: {
        'Cookie': 'e2e-bypass=1',
      },
    })

    console.log('📊 Status:', response.status)
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ APIエラー:')
      console.error('   Error:', errorData.error)
      console.error('   Details:', errorData.details)
      return
    }

    const data = await response.json()

    console.log('✅ APIレスポンス成功\n')
    console.log('📊 Meta情報:')
    console.log('   total:', data.meta?.total)
    console.log('   limit:', data.meta?.limit)
    console.log('   offset:', data.meta?.offset)
    console.log('   has_more:', data.meta?.has_more)
    console.log('')
    console.log('📊 データ件数:', data.data?.length || 0)
    console.log('')

    if (data.data && data.data.length > 0) {
      console.log('📋 取得したデータ:')
      data.data.forEach((item: any, index: number) => {
        console.log(`${index + 1}. ${item.stores?.name || '(店舗名なし)'} - ${item.collectors?.company_name || '(業者名なし)'}`)
      })
    } else {
      console.log('⚠️ データが空です')
    }

    console.log('\n🔍 問題分析:')
    if (data.meta?.total === 2 && data.data?.length === 2) {
      console.log('❌ APIは2件しか返していません（期待値: 10件）')
      console.log('   → WHERE条件に問題がある可能性が高い')
      console.log('   → サーバーログを確認してWHERE条件を見てください')
    } else if (data.meta?.total === 10 && data.data?.length === 2) {
      console.log('⚠️ totalは10件だがdataは2件しか返っていません')
      console.log('   → limit/offsetの問題の可能性')
    } else if (data.meta?.total === 10 && data.data?.length === 10) {
      console.log('✅ 正常：10件のデータが取得できています')
    }

  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

testAPI()


