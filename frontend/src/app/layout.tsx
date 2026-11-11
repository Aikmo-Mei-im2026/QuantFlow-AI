import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Head } from 'nextra/components'
import './[lang]/styles/index.css'

// eslint-disable-next-line node/prefer-global/process
const siteUrl = process.env.SITE_URL || 'https://example.com'

export const metadata = {
  metadataBase: new URL(siteUrl),
  icons: '/img/favicon.svg',
  title: 'QuantFlow AI',
  description: '面向大学生的可解释量化学习与 K 线训练平台',
} satisfies Metadata

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh" dir="ltr" suppressHydrationWarning>
      <Head>
        <meta property="og:title" content="QuantFlow AI" />
        <meta property="og:description" content="面向大学生的可解释量化学习与 K 线训练平台" />
      </Head>
      <body>{children}</body>
    </html>
  )
}
