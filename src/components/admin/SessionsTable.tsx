'use client'

import { useState } from 'react'
import { sendPassEmailsAction, getSessionsForCSV } from '@/actions/admin'
import type { AdminSessionView } from '@/types'

export default function SessionsTable({
  sessions,
  examId,
}: {
  sessions: AdminSessionView[]
  examId: string
}) {
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // ── 합격자 이메일 일괄 발송 ───────────────────────────────
  async function handleSendEmails() {
    const passedCount = sessions.filter((s) => s.is_passed && s.status === 'submitted').length
    if (passedCount === 0) {
      alert('발송할 합격자가 없습니다.')
      return
    }
    if (!confirm(`합격자 ${passedCount}명에게 이메일을 발송하시겠습니까?`)) return

    setIsSending(true)
    setSendResult(null)

    const res = await sendPassEmailsAction(examId)
    setSendResult(res.error ?? res.message ?? '완료')
    setIsSending(false)
  }

  // ── CSV 내보내기 ─────────────────────────────────────────
  async function handleExportCSV() {
    setIsExporting(true)

    const res = await getSessionsForCSV(examId)
    if (res.error || !res.data) {
      alert(res.error ?? 'CSV 생성 실패')
      setIsExporting(false)
      return
    }

    const headers = [
      '이름', '이메일', '연락처', '소속기관',
      '점수', '합격여부', '제출방식', '탭이탈횟수',
      '응시시작', '제출시간', '상태',
    ]

    const rows = res.data.map((s) => [
      s.user_name,
      s.user_email,
      s.user_phone ?? '',
      s.user_organization ?? '',
      s.score ?? '',
      s.is_passed === true ? '합격' : s.is_passed === false ? '불합격' : '미집계',
      s.submit_reason === 'manual' ? '수동제출'
        : s.submit_reason === 'timeout' ? '시간초과'
        : s.submit_reason === 'violation' ? '이탈초과'
        : '-',
      s.tab_violation_count,
      s.started_at ? new Date(s.started_at).toLocaleString('ko-KR') : '',
      s.submitted_at ? new Date(s.submitted_at).toLocaleString('ko-KR') : '',
      s.status === 'submitted' ? '제출완료' : s.status === 'in_progress' ? '응시중' : '신청',
    ])

    const csv = [
      '\uFEFF' + headers.join(','), // BOM for Excel Korean
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `응시자명단_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setIsExporting(false)
  }

  const passedCount = sessions.filter((s) => s.is_passed && s.status === 'submitted').length

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* 액션 바 */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-600">
          총 <strong>{sessions.length}</strong>명
          {passedCount > 0 && <> | 합격자 <strong className="text-emerald-600">{passedCount}</strong>명</>}
        </p>
        <div className="flex items-center gap-3">
          {sendResult && (
            <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
              {sendResult}
            </span>
          )}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200
              text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            {isExporting ? 'CSV 생성 중...' : 'CSV 내보내기'}
          </button>
          <button
            onClick={handleSendEmails}
            disabled={isSending || passedCount === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600
              text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-semibold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            {isSending ? '발송 중...' : `합격자 이메일 발송 (${passedCount}명)`}
          </button>
        </div>
      </div>

      {/* 테이블 */}
      {sessions.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <p className="text-sm">해당 회차의 응시자가 없습니다</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['이름', '이메일', '소속기관', '점수', '합격여부', '제출방식', '탭이탈', '제출시간'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sessions.map((session) => (
                <tr key={session.session_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {session.user_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {session.user_email}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {session.user_organization ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">
                    {session.score != null
                      ? <span className={session.is_passed ? 'text-emerald-700' : 'text-red-600'}>
                          {session.score}점
                        </span>
                      : <span className="text-slate-300">-</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    {session.is_passed === true ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
                        text-xs font-semibold bg-emerald-50 text-emerald-700">
                        합격
                      </span>
                    ) : session.is_passed === false ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
                        text-xs font-semibold bg-red-50 text-red-600">
                        불합격
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {session.submit_reason ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full
                        ${session.submit_reason === 'manual' ? 'bg-slate-100 text-slate-600'
                          : session.submit_reason === 'timeout' ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-600'
                        }`}>
                        {session.submit_reason === 'manual' ? '수동'
                          : session.submit_reason === 'timeout' ? '시간초과'
                          : '이탈초과'}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {session.tab_violation_count > 0 ? (
                      <span className={`text-xs font-semibold
                        ${session.tab_violation_count >= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                        {session.tab_violation_count}회
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">0회</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {session.submitted_at
                      ? new Date(session.submitted_at).toLocaleString('ko-KR', {
                          month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : session.status === 'in_progress'
                      ? <span className="text-blue-500">응시 중</span>
                      : <span className="text-slate-300">-</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
