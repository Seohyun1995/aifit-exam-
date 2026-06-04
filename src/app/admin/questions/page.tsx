import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import QuestionForm from '@/components/admin/QuestionForm'
import QuestionList from '@/components/admin/QuestionList'
import type { Question } from '@/types'

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: { type?: string; subject?: string; page?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const serviceClient = createServiceClient()

  let query = serviceClient
    .from('questions')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (searchParams.type) query = query.eq('type', searchParams.type)
  if (searchParams.subject) query = query.ilike('subject', `%${searchParams.subject}%`)

  const { data: questions, count } = await query

  // 과목 목록 (필터용)
  const { data: subjects } = await serviceClient
    .from('questions')
    .select('subject')
    .eq('is_active', true)

  const uniqueSubjects = [...new Set(subjects?.map((s: any) => s.subject) ?? [])]

  // 통계
  const mcCount = questions?.filter((q: any) => q.type === 'multiple_choice').length ?? 0
  const oxCount = questions?.filter((q: any) => q.type === 'ox').length ?? 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">문제은행 관리</h1>
        <p className="text-slate-500 text-sm mt-1">
          문제 등록·수정·삭제 | 총 {count ?? 0}개 (객관식 {mcCount}개, OX {oxCount}개)
        </p>
      </div>

      {/* 문제 등록 폼 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">새 문제 등록</h2>
        <QuestionForm subjects={uniqueSubjects as string[]} />
      </div>

      {/* 문제 목록 */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">문제 목록</h2>
          {/* 필터 */}
          <form className="flex items-center gap-2">
            <select name="type" defaultValue={searchParams.type ?? ''}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700">
              <option value="">전체 유형</option>
              <option value="multiple_choice">객관식</option>
              <option value="ox">OX</option>
            </select>
            <button type="submit"
              className="text-sm px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
              필터
            </button>
          </form>
        </div>
        <QuestionList questions={questions as Question[] ?? []} />
      </div>
    </div>
  )
}
