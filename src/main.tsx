// ============================================================================
// メインエントリーポイント
// 作成日: 2025-09-16
// 目的: Reactアプリケーションの起動
// ============================================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// データベース初期化
import { initializeDatabase } from '@/utils/dexie-db'

// アプリケーション起動
async function startApp() {
  try {
    // Dexieデータベースを初期化
    await initializeDatabase()
    
    // Reactアプリケーションをレンダリング
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    )
  } catch (error) {
    console.error('Failed to start app:', error)
    
    // エラー時のフォールバック表示
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1>アプリケーションの起動に失敗しました</h1>
        <p>エラー: {error instanceof Error ? error.message : '不明なエラー'}</p>
        <button onClick={() => window.location.reload()}>
          再読み込み
        </button>
      </div>
    )
  }
}

startApp()



