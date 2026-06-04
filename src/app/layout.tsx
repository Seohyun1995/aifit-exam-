import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI융합전문가 자격시험 | ㈜이노핏파트너스',
  description: 'AI FIT Practitioner 2급 온라인 시험 플랫폼',
  robots: 'noindex, nofollow', // 시험 사이트는 검색엔진 노출 제한
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  )
}
