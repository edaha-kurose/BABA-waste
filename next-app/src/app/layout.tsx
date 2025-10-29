import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider } from 'antd'
import { babaTheme } from '@/config/theme'
import jaJP from 'antd/locale/ja_JP'

const notoSansJP = Noto_Sans_JP({ 
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

// すべてのページを動的レンダリングに設定
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'BABA 廃棄物管理システム',
  description: '循環型社会を実現する廃棄物管理・JWNET連携システム',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={notoSansJP.className}>
        <AntdRegistry>
          <ConfigProvider theme={babaTheme} locale={jaJP}>
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}

