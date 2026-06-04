import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOutAction } from '@/actions/auth'
import { registerExamSession } from '@/actions/exam'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const serviceClient = createServiceClient()

  // 응시 가능한 진행 중 시험
  const now = new Date().toISOString()
  const { data: activeExams } = await serviceClient
    .from('exams')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .order('start_date', { ascending: false })

  // 내 응시 이력
  const { data: mySessions } = await supabase
    .from('exam_sessions')
    .select('*, exams!inner(title, start_date)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <span className="font-semibold text-slate-900">AI융합전문가 자격시험</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{profile?.name}님</span>
            <form action={signOutAction}>
              <button type="submit" className="text-sm text-slate-500 hover:text-slate-700">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 환영 메시지 */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-2xl p-6 mb-6 text-white">
          <p className="text-slate-300 text-sm mb-1">환영합니다</p>
          <h1 className="text-xl font-bold">{profile?.name}님</h1>
          <p className="text-slate-400 text-sm mt-1">{profile?.organization}</p>
        </div>

        {/* 응시 가능한 시험 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">현재 응시 가능한 시험</h2>
          {!activeExams || activeExams.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              <p className="text-sm">현재 진행 중인 시험이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeExams.map((exam: any) => {
                const mySession = mySessions?.find((s: any) => s.exam_id === exam.id)

                return (
                  <div key={exam.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold
                            bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                            응시 가능
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900">{exam.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          종료: {new Date(exam.end_date).toLocaleString('ko-KR')} |
                          제한시간: {exam.duration_minutes}분 |
                          총 {exam.mc_question_count + exam.ox_question_count}문항
                        </p>
                      </div>
                      <div>
                        {mySession?.status === 'submitted' ? (
                          <span className="text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg">
                            제출 완료
                          </span>
                        ) : mySession?.status === 'in_progress' ? (
                          <Link
                            href={`/exam/${mySession.id}`}
                            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold
                              hover:bg-amber-600 transition-colors"
                          >
                            계속 응시
                          </Link>
                        ) : (
                          <ExamRegisterButton examId={exam.id} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 응시 이력 */}
        {mySessions && mySessions.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">응시 이력</h2>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
              {mySessions.map((session: any) => (
                <div key={session.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{session.exams.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {session.submitted_at
                        ? `제출: ${new Date(session.submitted_at).toLocaleDateString('ko-KR')}`
                        : '응시 신청'}
                    </p>
                  </div>
                  <div className="text-right">
                    {session.status === 'submitted' ? (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                        결과 대기 중
                      </span>
                    ) : session.status === 'in_progress' ? (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                        응시 중
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                        신청 완료
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// 응시 신청 버튼 컴포넌트
function ExamRegisterButton({ examId }: { examId: string }) {
  async function handleRegister() {
    'use server'
    const { sessionId, error } = await registerExamSession(examId)
    if (error) {
      redirect(`/dashboard?error=${encodeURIComponent(error)}`)
    }
    redirect(`/exam/${sessionId}`)
  }

  return (
    <form action={handleRegister}>
      <button
        type="submit"
        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold
          hover:bg-slate-800 transition-colors"
      >
        응시 신청
      </button>
    </form>
  )
}
