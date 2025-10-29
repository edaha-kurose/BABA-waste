'use client'

import { useState } from 'react'
import { Card, Button, Statistic, Row, Col, Space, Alert, App } from 'antd'
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons'

export default function SeedDataPage() {
  const { message: messageApi } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [loadingBilling, setLoadingBilling] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [billingResult, setBillingResult] = useState<any>(null)

  const handleSeedCollectors = async () => {
    try {
      setLoading(true)
      messageApi.loading('収集業者シードデータ作成中...')

      const response = await fetch('/api/seed/collectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 200 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'シードデータ作成失敗')
      }

      setResult(data)
      messageApi.success('シードデータ作成完了！')
    } catch (error: any) {
      console.error('Seed error:', error)
      messageApi.error(error.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSeedBillingYearData = async () => {
    try {
      setLoadingBilling(true)
      messageApi.loading('1年分の請求データ生成中（数分かかる場合があります）...')

      const response = await fetch('/api/seed/billing-year-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '請求データ生成失敗')
      }

      setBillingResult(data)
      messageApi.success('1年分の請求データ生成完了！')
    } catch (error: any) {
      console.error('Billing seed error:', error)
      messageApi.error(error.message || 'エラーが発生しました')
    } finally {
      setLoadingBilling(false)
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card title="🌱 テストデータ生成">
        <Alert
          message="📋 テストデータ生成機能"
          description={
            <div>
              <p>開発・テスト環境用のデータを自動生成します。</p>
              <ul style={{ marginLeft: 20 }}>
                <li>🚛 <strong>収集業者200社</strong>を自動生成</li>
                <li>🔗 <strong>店舗への紐づけ</strong>を自動設定（最初の100店舗に2〜5社）</li>
                <li>✅ <strong>Prisma経由</strong>で安全にデータ作成（グローバルルール準拠）</li>
                <li>⚡ <strong>バッチ処理</strong>で高速実行</li>
              </ul>
              <p style={{ marginTop: 8, color: '#ff4d4f' }}>
                ⚠️ <strong>注意</strong>: 本番環境では実行しないでください
              </p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 収集業者データ生成 */}
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleSeedCollectors}
            loading={loading}
            block
          >
            🚛 収集業者200社 + 店舗紐づけ 生成
          </Button>

          {result && (
            <Card title="✅ 実行結果: 収集業者データ" type="inner">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="作成した収集業者数"
                    value={result.collectorsCreated}
                    suffix="社"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="作成した紐づけ数"
                    value={result.assignmentsCreated}
                    suffix="件"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="対象店舗数"
                    value={result.storesCount}
                    suffix="店舗"
                  />
                </Col>
              </Row>
              <p style={{ marginTop: 16, color: '#52c41a' }}>
                {result.message}
              </p>
            </Card>
          )}

          {/* 請求データ生成 */}
          <Alert
            message="📊 1年分の請求データ生成（マトリクス・料金設定含む）"
            description={
              <div>
                <p>既存の収集業者・店舗データをベースに、2024年1月〜12月の請求データを自動生成します。</p>
                <ul style={{ marginLeft: 20 }}>
                  <li>🔧 <strong>店舗×品目×業者マトリクス</strong>を自動生成（未登録の場合）</li>
                  <li>💵 <strong>廃棄物種別マスターの料金</strong>を自動設定（未設定の場合）</li>
                  <li>📅 <strong>回収予定・回収依頼・回収実績</strong>を月次で自動生成</li>
                  <li>💰 <strong>請求明細・請求サマリー</strong>をマトリクスの料金に基づいて自動計算</li>
                  <li>✅ <strong>Prismaのみ使用</strong>（グローバルルール準拠）</li>
                  <li>⚡ <strong>5〜10分かかる場合があります</strong>（進捗はサーバーログで確認）</li>
                </ul>
                <p style={{ marginTop: 8, color: '#52c41a', fontWeight: 'bold' }}>
                  ✨ <strong>本番と同じロジック</strong>: マトリクスと料金設定に基づいた請求データを生成するため、実際の業務フローをテスト可能
                </p>
                <p style={{ marginTop: 8, color: '#ff4d4f' }}>
                  ⚠️ <strong>前提条件</strong>: 収集業者・店舗・廃棄品目・廃棄物種別マスターが登録されている必要があります
                </p>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginTop: 24 }}
          />

          <Button
            type="primary"
            size="large"
            icon={<ReloadOutlined />}
            onClick={handleSeedBillingYearData}
            loading={loadingBilling}
            block
            danger
          >
            💰 1年分の請求データを生成（2024年1月〜12月）
          </Button>

          {billingResult && (
            <Card title="✅ 実行結果: 請求データ（1年分）" type="inner">
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Statistic
                    title="収集業者数"
                    value={billingResult.summary.collectors}
                    suffix="社"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="対象店舗数"
                    value={billingResult.summary.stores}
                    suffix="店舗"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="廃棄品目数"
                    value={billingResult.summary.itemMaps}
                    suffix="品目"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="マトリクス生成数"
                    value={billingResult.summary.matrixGenerated}
                    suffix="件"
                    valueStyle={{ color: billingResult.summary.matrixGenerated > 0 ? '#52c41a' : '#999' }}
                  />
                </Col>
              </Row>
              {billingResult.summary.wasteTypePricesSet > 0 && (
                <Alert
                  message={`✅ 廃棄物種別マスターに料金を設定しました: ${billingResult.summary.wasteTypePricesSet}件`}
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              {billingResult.summary.matrixGenerated > 0 && (
                <Alert
                  message={`✅ 店舗×品目×業者マトリクスを自動生成しました: ${billingResult.summary.matrixGenerated}件`}
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <Card title="📅 月別実行結果" type="inner">
                <Row gutter={[16, 16]}>
                  {billingResult.stats.map((stat: any, index: number) => (
                    <Col span={24} key={index}>
                      <Card size="small" style={{ backgroundColor: '#f0f2f5' }}>
                        <h4>{stat.month}</h4>
                        <Row gutter={8}>
                          <Col span={8}>
                            <div style={{ fontSize: 12 }}>
                              回収予定: <strong>{stat.plansCreated}件</strong>
                            </div>
                          </Col>
                          <Col span={8}>
                            <div style={{ fontSize: 12 }}>
                              回収実績: <strong>{stat.collectionsCreated}件</strong>
                            </div>
                          </Col>
                          <Col span={8}>
                            <div style={{ fontSize: 12 }}>
                              請求明細: <strong>{stat.billingItemsCreated}件</strong>
                            </div>
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>

              <p style={{ marginTop: 16, color: '#52c41a' }}>
                {billingResult.message}
              </p>
            </Card>
          )}
        </Space>
      </Card>
    </div>
  )
}

