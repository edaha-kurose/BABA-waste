'use client'

import { useState } from 'react'
import { Tabs } from 'antd'
import { FileTextOutlined, UnorderedListOutlined, CalculatorOutlined } from '@ant-design/icons'
import BillingManagementTab from './components/BillingManagementTab'
import MonthlyOverviewTab from './components/MonthlyOverviewTab'

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('overview')

  const items = [
    {
      key: 'overview',
      label: (
        <span>
          <UnorderedListOutlined />
          月別一覧
        </span>
      ),
      children: <MonthlyOverviewTab />,
    },
    {
      key: 'management',
      label: (
        <span>
          <CalculatorOutlined />
          請求処理
        </span>
      ),
      children: <BillingManagementTab />,
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>
        <FileTextOutlined /> 請求管理
      </h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        回収実績から請求明細を生成し、業者ごとの請求書を作成・管理します
      </p>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
    </div>
  )
}
