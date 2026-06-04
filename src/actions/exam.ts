'use server'

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import type { SubmitExamPayload, GradingResult } from '@/types'

// ── 시험 응시 신청 ────────────────────────────────────────────
export async function registerExamSession(examId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: '로그인이 필요합니다.' }

  // 이미 응시 신청했는지 확인
  const { data: existing } = await supabase
    .from('exam_sessions')
    .select('id, status')
    .eq('exam_id', examId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    if (existing.status === 'submitted') {
      return { error: '이미 제출된 시험입니다.' }
    }
    return { sessionId: existing.id }
  }

  // 시험 정보 조회 (출제 설정)
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .eq('is_active', true)
    .single()

  if (examError || !exam) return { error: '시험 정보를 찾을 수 없습니다.' }

  // 응시 기간 확인
  const now = new Date()
  if (now < new Date(exam.start_date) || now > new Date(exam.end_date)) {
    return { error: '응시 가능 기간이 아닙니다.' }
  }

  // 문제은행에서 랜덤 출제
  const { data: mcQuestions } = await supabase
    .from('questions')
    .select('id')
    .eq('type', 'multiple_choice')
    .eq('is_active', true)

  const { data: oxQuestions } = await supabase
    .from('questions')
    .select('id')
    .eq('type', 'ox')
    .eq('is_active', true)

  if (!mcQuestions || mcQuestions.length < exam.mc_question_count) {
    return { error: `객관식 문제가 부족합니다. (필요: ${exam.mc_question_count}개)` }
  }

  if (!oxQuestions || oxQuestions.length < exam.ox_question_count) {
    return { error: `OX 문제가 부족합니다. (필요: ${exam.ox_question_count}개)` }
  }

  // 랜덤 셔플
  const shuffledMC = shuffleArray(mcQuestions).slice(0, exam.mc_question_count)
  const shuffledOX = shuffleArray(oxQuestions).slice(0, exam.ox_question_count)
  const questionIds = [...shuffledMC, ...shuffledOX].map((q) => q.id)

  // 세션 생성
  const { data: session, error: sessionError } = await supabase
    .from('exam_sessions')
    .insert({
      exam_id: examId,
      user_id: user.id,
      question_ids: questionIds,
      status: 'registered',
    })
    .select('id')
    .single()

  if (sessionError) return { error: '응시 신청에 실패했습니다.' }

  return { sessionId: session.id }
}

// ── 시험 시작 (세션 상태 업데이트) ───────────────────────────
export async function startExamSession(sessionId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('exam_sessions')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('status', 'registered')

  if (error) return { error: '시험 시작에 실패했습니다.' }
  return { success: true }
}

// ── 탭 이탈 기록 ─────────────────────────────────────────────
export async function recordTabViolation(sessionId: string, violationCount: number) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증 오류' }

  await supabase.from('tab_violations').insert({
    session_id: sessionId,
    user_id: user.id,
    violation_count: violationCount,
  })

  return { success: true }
}

// ── 시험 제출 + 채점 (핵심 Server Action) ────────────────────
export async function submitExamAction(payload: SubmitExamPayload) {
  // 서비스 클라이언트 사용 (채점 로직은 RLS 우회 필요)
  const serviceClient = createServiceClient()
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: '로그인이 필요합니다.' }

  const { sessionId, answers, submitReason } = payload

  // 1. 세션 검증 (본인 세션 + 아직 미제출 상태)
  const { data: session, error: sessionError } = await serviceClient
    .from('exam_sessions')
    .select('*, exams!inner(passing_score, duration_minutes)')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .neq('status', 'submitted')
    .single()

  if (sessionError || !session) {
    return { error: '유효하지 않은 세션입니다.' }
  }

  // 2. 출제된 문항의 정답 조회 (서비스 클라이언트로 정답 접근)
  const { data: questions, error: qError } = await serviceClient
    .from('questions')
    .select('id, type, answer')
    .in('id', session.question_ids)

  if (qError || !questions) {
    return { error: '문항 정보 조회에 실패했습니다.' }
  }

  // 3. 채점
  const totalQuestions = questions.length
  const scorePerQuestion = Math.floor(100 / totalQuestions) // 100 / 30 ≈ 3.33
  // 나머지 점수를 마지막 문항에 배분
  const remainderScore = 100 - scorePerQuestion * totalQuestions

  const gradingResult = gradeAnswers(questions, answers, scorePerQuestion, remainderScore)

  const passingScore = session.exams.passing_score

  // 4. 답안 저장 (upsert)
  const answerRows = gradingResult.answerDetails.map((detail) => ({
    session_id: sessionId,
    question_id: detail.questionId,
    user_answer: detail.userAnswer,
    is_correct: detail.isCorrect,
    score_earned: detail.scoreEarned,
  }))

  await serviceClient
    .from('answers')
    .upsert(answerRows, { onConflict: 'session_id,question_id' })

  // 5. 세션 업데이트 (제출 완료 + 채점 결과)
  const { error: updateError } = await serviceClient
    .from('exam_sessions')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      score: gradingResult.score,
      is_passed: gradingResult.score >= passingScore,
      submit_reason: submitReason,
    })
    .eq('id', sessionId)

  if (updateError) {
    return { error: '제출 처리에 실패했습니다.' }
  }

  // 6. 응시자에게는 점수 미노출 - success만 반환
  return { success: true }
}

// ── 채점 로직 ─────────────────────────────────────────────────
function gradeAnswers(
  questions: Array<{ id: string; type: string; answer: string }>,
  userAnswers: Record<string, string>,
  scorePerQ: number,
  remainderScore: number
) {
  let totalScore = 0
  const answerDetails = questions.map((q, index) => {
    const userAnswer = userAnswers[q.id] ?? null
    const isCorrect = userAnswer !== null && userAnswer === q.answer

    // 마지막 문항에 나머지 점수 배분
    const questionScore = index === questions.length - 1
      ? scorePerQ + remainderScore
      : scorePerQ

    const scoreEarned = isCorrect ? questionScore : 0
    totalScore += scoreEarned

    return {
      questionId: q.id,
      userAnswer,
      correctAnswer: q.answer,
      isCorrect,
      scoreEarned,
    }
  })

  return {
    score: totalScore,
    isPassed: false, // 판단은 호출부에서
    correctCount: answerDetails.filter((a) => a.isCorrect).length,
    totalCount: questions.length,
    answerDetails,
  }
}

// ── 배열 셔플 (Fisher-Yates) ──────────────────────────────────
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
