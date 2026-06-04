import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI융합전문가 자격시험 | ㈜이노핏파트너스',
  description: 'AI FIT Practitioner 2급 온라인 시험 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
