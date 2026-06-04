import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import ExamForm from '@/components/admin/ExamForm'
import type { Exam } from '@/types'

export default async function AdminExamsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const serviceClient = createServiceClient()

  const { data: exams } = await serviceClient
    .from('exams')
    .select('*')
    .order('start_date', { ascending: false })

  // 문제 수 확인
  const { count: mcCount } = await serviceClient
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'multiple_choice')
    .eq('is_active', true)

  const { count: oxCount } = await serviceClient
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'ox')
    .eq('is_active', true)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">시험 회차 관리</h1>
        <p className="text-slate-500 text-sm mt-1">
          시험 일정 및 출제 설정 관리 |
          문제은행: 객관식 <strong>{mcCount ?? 0}</strong>개, OX <strong>{oxCount ?? 0}</strong>개
        </p>
      </div>

      {/* 회차 생성 폼 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">새 시험 회차 생성</h2>
        <ExamForm />
      </div>

      {/* 회차 목록 */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">시험 회차 목록</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {!exams || exams.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">등록된 시험 회차가 없습니다</div>
          ) : (
            exams.map((exam: Exam) => {
              const now = new Date()
              const start = new Date(exam.start_date)
              const end = new Date(exam.end_date)
              const status = now < start ? '예정' : now > end ? '종료' : '진행 중'
              const statusColor = status === '진행 중'
                ? 'bg-emerald-50 text-emerald-700'
                : status === '예정'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-slate-100 text-slate-500'

              return (
                <div key={exam.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{exam.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                        {status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p>응시 기간: {new Date(exam.start_date).toLocaleDateString('ko-KR')} ~
                        {new Date(exam.end_date).toLocaleDateString('ko-KR')}</p>
                      <p>
                        제한 {exam.duration_minutes}분 | 객관식 {exam.mc_question_count}문항 + OX {exam.ox_question_count}문항 |
                        탭이탈 허용 {exam.tab_violation_limit}회 | 합격기준 {exam.passing_score}점
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
