import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import SessionsTable from '@/components/admin/SessionsTable'
import type { AdminSessionView, Exam } from '@/types'

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: { examId?: string; filter?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const serviceClient = createServiceClient()

  // 시험 회차 목록
  const { data: exams } = await serviceClient
    .from('exams')
    .select('id, title, start_date, end_date')
    .order('start_date', { ascending: false })

  const selectedExamId = searchParams.examId ?? (exams?.[0]?.id ?? null)

  // 응시자 명단 조회
  let sessions: AdminSessionView[] = []
  if (selectedExamId) {
    let query = serviceClient
      .from('admin_session_view')
      .select('*')
      .eq('exam_id', selectedExamId)
      .order('submitted_at', { ascending: false, nullsFirst: false })

    if (searchParams.filter === 'passed') {
      query = query.eq('is_passed', true)
    } else if (searchParams.filter === 'failed') {
      query = query.eq('is_passed', false)
    }

    const { data } = await query
    sessions = data ?? []
  }

  // 통계 계산
  const submittedSessions = sessions.filter((s) => s.status === 'submitted')
  const passedCount = submittedSessions.filter((s) => s.is_passed).length
  const failedCount = submittedSessions.filter((s) => s.is_passed === false).length
  const avgScore = submittedSessions.length > 0
    ? Math.round(submittedSessions.reduce((sum, s) => sum + (s.score ?? 0), 0) / submittedSessions.length)
    : 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">응시자 관리</h1>
        <p className="text-slate-500 text-sm mt-1">회차별 응시자 명단, 성적 조회, 합격자 이메일 발송</p>
      </div>

      {/* 회차 선택 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <form className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">시험 회차</label>
            <select
              name="examId"
              defaultValue={selectedExamId ?? ''}
              onChange={(e) => {
                const url = new URL(window.location.href)
                url.searchParams.set('examId', e.target.value)
                window.location.href = url.toString()
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
            >
              {exams?.map((exam: any) => (
                <option key={exam.id} value={exam.id}>{exam.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">필터</label>
            <div className="flex gap-2">
              {[
                { value: '', label: '전체' },
                { value: 'passed', label: '합격자' },
                { value: 'failed', label: '불합격자' },
              ].map(({ value, label }) => (
                <a
                  key={value}
                  href={`?examId=${selectedExamId}&filter=${value}`}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${searchParams.filter === value || (!searchParams.filter && value === '')
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* 통계 카드 */}
      {selectedExamId && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {[
            { label: '총 응시자', value: sessions.length, color: 'text-slate-900' },
            { label: '제출 완료', value: submittedSessions.length, color: 'text-blue-600' },
            { label: '합격자', value: passedCount, color: 'text-emerald-600' },
            { label: '평균 점수', value: `${avgScore}점`, color: 'text-amber-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 응시자 테이블 */}
      {selectedExamId && (
        <SessionsTable
          sessions={sessions}
          examId={selectedExamId}
        />
      )}
    </div>
  )
}
