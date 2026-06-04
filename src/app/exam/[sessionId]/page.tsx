import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import ExamPageClient from '@/components/exam/ExamPageClient'
import type { ExamQuestion } from '@/types'

interface Props {
  params: { sessionId: string }
}

export default async function ExamPage({ params }: Props) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { sessionId } = params

  // 세션 조회 (본인 세션 확인)
  const { data: session, error: sessionError } = await supabase
    .from('exam_sessions')
    .select('*, exams!inner(*)')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (sessionError || !session) notFound()

  // 이미 제출된 시험
  if (session.status === 'submitted') {
    redirect('/exam/completed')
  }

  const exam = session.exams

  // 응시 기간 확인
  const now = new Date()
  if (now > new Date(exam.end_date)) {
    redirect('/dashboard?error=exam_expired')
  }

  // 출제된 문항 조회 (정답 제외 - 보안상 서버에서 처리)
  // 서비스 클라이언트를 사용하되 클라이언트에 정답은 절대 전달 안 함
  const serviceClient = createServiceClient()
  const { data: questions, error: qError } = await serviceClient
    .from('questions')
    .select('id, type, subject, content, options')  // answer 필드 제외!
    .in('id', session.question_ids)

  if (qError || !questions) notFound()

  // question_ids 순서대로 정렬
  const orderedQuestions: ExamQuestion[] = session.question_ids
    .map((id: string) => questions.find((q: any) => q.id === id))
    .filter(Boolean)

  return (
    <ExamPageClient
      sessionId={sessionId}
      questions={orderedQuestions}
      durationMinutes={exam.duration_minutes}
      tabViolationLimit={exam.tab_violation_limit}
    />
  )
}
