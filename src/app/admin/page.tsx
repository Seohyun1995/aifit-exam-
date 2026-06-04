import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const serviceClient = createServiceClient()

  // 통계 데이터
  const [
    { count: totalQuestions },
    { count: totalExams },
    { count: totalSessions },
    { count: passedSessions },
  ] = await Promise.all([
    serviceClient.from('questions').select('*', { count: 'exact', head: true }).eq('is_active', true),
    serviceClient.from('exams').select('*', { count: 'exact', head: true }).eq('is_active', true),
    serviceClient.from('exam_sessions').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    serviceClient.from('exam_sessions').select('*', { count: 'exact', head: true }).eq('is_passed', true),
  ])

  const stats = [
    { label: '등록 문제 수', value: totalQuestions ?? 0, unit: '개', href: '/admin/questions', color: 'bg-blue-50 text-blue-600' },
    { label: '시험 회차', value: totalExams ?? 0, unit: '회', href: '/admin/exams', color: 'bg-purple-50 text-purple-600' },
    { label: '총 응시자', value: totalSessions ?? 0, unit: '명', href: '/admin/sessions', color: 'bg-amber-50 text-amber-600' },
    { label: '합격자', value: passedSessions ?? 0, unit: '명', href: '/admin/sessions?filter=passed', color: 'bg-emerald-50 text-emerald-600' },
  ]

  // 최근 응시 세션
  const { data: recentSessions } = await serviceClient
    .from('admin_session_view')
    .select('*')
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(5)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">관리자 대시보드</h1>
        <p className="text-slate-500 text-sm mt-1">AI융합전문가 2급 시험 운영 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, unit, href, color }) => (
          <Link key={label} href={href}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-all">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${color} mb-3`}>
              <span className="text-lg font-bold">{value}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {value}<span className="text-sm font-normal text-slate-500 ml-1">{unit}</span>
            </p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* 빠른 실행 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { href: '/admin/questions', label: '문제 등록하기', desc: '새 문제를 문제은행에 추가합니다', icon: '✏️' },
          { href: '/admin/exams', label: '시험 회차 만들기', desc: '새 시험 회차를 생성하고 설정합니다', icon: '📅' },
          { href: '/admin/sessions', label: '결과 확인 & 발송', desc: '합격자 조회 및 이메일 발송합니다', icon: '📧' },
        ].map(({ href, label, desc, icon }) => (
          <Link key={href} href={href}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="text-2xl mb-3">{icon}</div>
            <p className="font-semibold text-slate-900 mb-1">{label}</p>
            <p className="text-xs text-slate-500">{desc}</p>
          </Link>
        ))}
      </div>

      {/* 최근 응시 기록 */}
      {recentSessions && recentSessions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">최근 응시 기록</h2>
            <Link href="/admin/sessions" className="text-xs text-slate-500 hover:text-slate-700">
              전체 보기 →
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentSessions.map((session: any) => (
              <div key={session.session_id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{session.user_name}</p>
                  <p className="text-xs text-slate-500">{session.exam_title}</p>
                </div>
                <div className="text-right">
                  {session.score != null && (
                    <p className={`text-sm font-bold ${session.is_passed ? 'text-emerald-600' : 'text-red-500'}`}>
                      {session.score}점
                    </p>
                  )}
                  {session.is_passed === true && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">합격</span>
                  )}
                  {session.is_passed === false && (
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">불합격</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
