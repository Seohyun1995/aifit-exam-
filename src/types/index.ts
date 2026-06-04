export type UserRole = 'examinee' | 'admin'
export type QuestionType = 'multiple_choice' | 'ox'
export type SessionStatus = 'registered' | 'in_progress' | 'submitted'
export type SubmitReason = 'manual' | 'timeout' | 'violation'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  organization?: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  type: QuestionType
  subject: string
  content: string
  options?: string[] | null  // 객관식: 4개 보기, OX: null
  answer: string              // 객관식: "1"~"4", OX: "O" | "X"
  explanation?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Exam {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  duration_minutes: number
  tab_violation_limit: number
  mc_question_count: number
  ox_question_count: number
  passing_score: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ExamSession {
  id: string
  exam_id: string
  user_id: string
  question_ids: string[]
  started_at?: string
  submitted_at?: string
  score?: number
  is_passed?: boolean
  submit_reason?: SubmitReason
  status: SessionStatus
  created_at: string
  updated_at: string
}

export interface Answer {
  id: string
  session_id: string
  question_id: string
  user_answer?: string
  is_correct?: boolean
  score_earned?: number
  created_at: string
  updated_at: string
}

export interface TabViolation {
  id: string
  session_id: string
  user_id: string
  occurred_at: string
  violation_count: number
}

// 시험 응시 화면용 (정답 제외)
export interface ExamQuestion {
  id: string
  type: QuestionType
  subject: string
  content: string
  options?: string[] | null
  // answer는 클라이언트에 절대 노출 안 함
}

// 관리자 응시자 뷰
export interface AdminSessionView {
  session_id: string
  exam_title: string
  user_name: string
  user_email: string
  user_phone?: string
  user_organization?: string
  score?: number
  is_passed?: boolean
  status: SessionStatus
  submit_reason?: SubmitReason
  started_at?: string
  submitted_at?: string
  tab_violation_count: number
  exam_id: string
  user_id: string
}

// 시험 제출 payload
export interface SubmitExamPayload {
  sessionId: string
  answers: Record<string, string>  // questionId -> userAnswer
  submitReason: SubmitReason
}

// 채점 결과 (서버 내부용)
export interface GradingResult {
  score: number
  isPassed: boolean
  correctCount: number
  totalCount: number
  answerDetails: Array<{
    questionId: string
    userAnswer: string | null
    correctAnswer: string
    isCorrect: boolean
    scoreEarned: number
  }>
}
