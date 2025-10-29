// BABA様コーポレートサイトに合わせたテーマ設定
// 参考: https://www.baba-ichi.com/

export const babaTheme = {
  // メインカラー: 環境・循環型社会をイメージした緑色
  token: {
    colorPrimary: '#2d8659', // BABA グリーン
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    colorLink: '#2d8659',
    
    // フォント
    fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
    fontSize: 14,
    
    // ボーダー半径（柔らかい印象）
    borderRadius: 6,
    
    // レイアウト
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f5f5',
  },
  
  // コンポーネント固有設定
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#1a3d2e', // 深い緑（環境イメージ）
      bodyBg: '#f5f5f5',
    },
    Menu: {
      darkItemBg: '#1a3d2e',
      darkItemSelectedBg: '#2d8659',
      darkItemHoverBg: '#234d38',
      darkSubMenuItemBg: '#1a3d2e', // SubMenu背景を統一
      darkPopupBg: '#1a3d2e', // SubMenuポップアップ背景
      subMenuItemBg: '#1a3d2e', // SubMenu項目背景
    },
    Button: {
      primaryColor: '#ffffff',
      primaryBg: '#2d8659',
    },
  },
}

// BABA ブランドカラー
export const brandColors = {
  primary: '#2d8659',
  secondary: '#1a3d2e',
  accent: '#52c41a',
  text: {
    primary: '#333333',
    secondary: '#666666',
    light: '#999999',
  },
  background: {
    main: '#ffffff',
    light: '#f5f5f5',
    dark: '#1a3d2e',
  },
}

