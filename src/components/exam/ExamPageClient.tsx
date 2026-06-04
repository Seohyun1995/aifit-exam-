'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ExamQuestion } from '@/types'
import { submitExamAction, recordTabViolation, startExamSession } from '@/actions/exam'

interface ExamPageClientProps {
  sessionId: string
  questions: ExamQuestion[]
  durationMinutes: number
  tabViolationLimit: number
}

export default function ExamPageClient({
  sessionId,
  questions,
  durationMinutes,
  tabViolationLimit,
}: ExamPageClientProps) {
  const router = useRouter()

  // ── 답안 상태 (sessionStorage로 새로고침 유지) ────────────
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = sessionStorage.getItem(`exam_answers_${sessionId}`)
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })

  // ── 현재 문항 인덱스 ──────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0)

  // ── 타이머 ────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(() => {
    if (typeof window === 'undefined') return durationMinutes * 60
    const saved = sessionStorage.getItem(`exam_timeleft_${sessionId}`)
    return saved ? parseInt(saved, 10) : durationMinutes * 60
  })

  // ── 탭 이탈 관련 ─────────────────────────────────────────
  const [tabViolationCount, setTabViolationCount] = useState(0)
  const [showViolationWarning, setShowViolationWarning] = useState(false)

  // ── 제출 관련 ─────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const hasSubmitted = useRef(false)

  // ── 세션 시작 ─────────────────────────────────────────────
  useEffect(() => {
    startExamSession(sessionId)
  }, [sessionId])

  // ── 타이머 로직 ───────────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0) {
      handleAutoSubmit('timeout')
      return
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1
        sessionStorage.setItem(`exam_timeleft_${sessionId}`, String(next))
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeLeft, sessionId])

  // ── 답안 자동 저장 (sessionStorage) ──────────────────────
  useEffect(() => {
    sessionStorage.setItem(`exam_answers_${sessionId}`, JSON.stringify(answers))
  }, [answers, sessionId])

  // ── 탭 이탈 감지 (visibilitychange) ──────────────────────
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        const newCount = tabViolationCount + 1
        setTabViolationCount(newCount)

        // 서버에 기록
        await recordTabViolation(sessionId, newCount)

        if (newCount > tabViolationLimit) {
          // 허용 횟수 초과 → 즉시 자동 제출
          handleAutoSubmit('violation')
        } else {
          // 경고 팝업
          setShowViolationWarning(true)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [tabViolationCount, tabViolationLimit, sessionId])

  // ── 자동 제출 ─────────────────────────────────────────────
  const handleAutoSubmit = useCallback(async (reason: 'timeout' | 'violation') => {
    if (hasSubmitted.current) return
    hasSubmitted.current = true
    setIsSubmitting(true)

    await submitExamAction({
      sessionId,
      answers,
      submitReason: reason,
    })

    // sessionStorage 정리
    sessionStorage.removeItem(`exam_answers_${sessionId}`)
    sessionStorage.removeItem(`exam_timeleft_${sessionId}`)

    router.replace('/exam/completed')
  }, [sessionId, answers, router])

  // ── 수동 제출 ─────────────────────────────────────────────
  const handleManualSubmit = async () => {
    if (hasSubmitted.current) return
    hasSubmitted.current = true
    setIsSubmitting(true)
    setShowSubmitConfirm(false)

    await submitExamAction({
      sessionId,
      answers,
      submitReason: 'manual',
    })

    sessionStorage.removeItem(`exam_answers_${sessionId}`)
    sessionStorage.removeItem(`exam_timeleft_${sessionId}`)

    router.replace('/exam/completed')
  }

  // ── 시간 포맷 ─────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const isTimeCritical = timeLeft <= 300 // 5분 이하 경고

  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── 상단 헤더 바 ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600 font-medium">
              <span className="text-slate-900 font-bold">{currentIndex + 1}</span>
              <span className="text-slate-400"> / {questions.length}</span>
            </div>
            <div className="text-xs text-slate-500">
              답안 완료: {answeredCount}/{questions.length}
            </div>
          </div>

          {/* 타이머 */}
          <div
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-bold text-lg
              transition-all duration-300 ${
                isTimeCritical
                  ? 'bg-red-50 text-red-600 animate-pulse'
                  : 'bg-slate-100 text-slate-800'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime(timeLeft)}
          </div>

          {/* 탭 이탈 경고 카운터 */}
          {tabViolationCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              이탈 {tabViolationCount}/{tabViolationLimit}회
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-4 py-6 flex-1 flex flex-col gap-6">
        {/* ── 문제 카드 ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* 문항 헤더 */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                ${currentQuestion.type === 'multiple_choice'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-emerald-50 text-emerald-700'
                }`}>
                {currentQuestion.type === 'multiple_choice' ? '객관식' : 'OX'}
              </span>
              <span className="text-xs text-slate-500">{currentQuestion.subject}</span>
            </div>
            <span className="text-sm font-medium text-slate-600">문항 {currentIndex + 1}</span>
          </div>

          {/* 문제 내용 */}
          <div className="px-6 py-6">
            <p className="text-slate-900 text-base leading-relaxed font-medium mb-6">
              {currentQuestion.content}
            </p>

            {/* 객관식 보기 */}
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  const value = String(idx + 1)
                  const isSelected = answers[currentQuestion.id] === value
                  return (
                    <button
                      key={idx}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }))
                      }
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-150
                        flex items-start gap-3 group
                        ${isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                    >
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                        text-xs font-bold transition-all
                        ${isSelected
                          ? 'border-white bg-white text-slate-900'
                          : 'border-slate-300 text-slate-500 group-hover:border-slate-500'
                        }`}>
                        {idx + 1}
                      </span>
                      <span className="text-sm leading-relaxed">{option}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* OX 선택 */}
            {currentQuestion.type === 'ox' && (
              <div className="flex gap-4 justify-center">
                {(['O', 'X'] as const).map((choice) => {
                  const isSelected = answers[currentQuestion.id] === choice
                  return (
                    <button
                      key={choice}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: choice }))
                      }
                      className={`w-36 h-36 rounded-2xl border-2 text-5xl font-bold
                        transition-all duration-150 flex items-center justify-center
                        ${isSelected
                          ? choice === 'O'
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-red-500 bg-red-500 text-white'
                          : 'border-slate-200 bg-white text-slate-400 hover:border-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {choice}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 문항 이동 버튼 */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600
                disabled:opacity-40 hover:text-slate-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              이전
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600
                  hover:text-slate-900 transition-colors"
              >
                다음
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white
                  rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                제출하기
              </button>
            )}
          </div>
        </div>

        {/* ── 문항 네비게이션 그리드 ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-500 mb-3">문항 이동</p>
          <div className="grid grid-cols-10 gap-1.5">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id]
              const isCurrent = idx === currentIndex
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`aspect-square rounded-lg text-xs font-semibold transition-all
                    ${isCurrent
                      ? 'bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-1'
                      : isAnswered
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500 inline-block"/>답안 완료
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block"/>미응답
            </span>
          </div>
        </div>

        {/* ── 최종 제출 버튼 ── */}
        <div className="text-center pb-6">
          <button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={isSubmitting}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-semibold
              hover:bg-slate-800 disabled:opacity-50 transition-all text-sm"
          >
            최종 제출하기
          </button>
        </div>
      </div>

      {/* ── 탭 이탈 경고 모달 ── */}
      {showViolationWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">탭 이탈 감지</h3>
            <p className="text-sm text-slate-600 text-center leading-relaxed mb-1">
              시험 화면을 벗어난 것이 감지되었습니다.
            </p>
            <p className="text-sm text-center font-semibold mb-2">
              <span className="text-red-600">
                이탈 횟수: {tabViolationCount} / {tabViolationLimit}회
              </span>
            </p>
            {tabViolationCount >= tabViolationLimit && (
              <p className="text-xs text-red-500 text-center mb-3">
                허용 횟수를 초과하면 시험이 자동 제출됩니다.
              </p>
            )}
            <button
              onClick={() => setShowViolationWarning(false)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-semibold text-sm
                hover:bg-slate-800 transition-colors mt-2"
            >
              확인 후 계속 응시
            </button>
          </div>
        </div>
      )}

      {/* ── 제출 확인 모달 ── */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">답안을 제출하시겠습니까?</h3>
            <p className="text-sm text-slate-600 mb-2">
              현재 <strong>{answeredCount}개</strong> / {questions.length}개 문항을 완료했습니다.
            </p>
            {answeredCount < questions.length && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-4">
                미응답 문항({questions.length - answeredCount}개)은 0점 처리됩니다.
              </p>
            )}
            <p className="text-xs text-slate-500 mb-6">제출 후에는 수정이 불가능합니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-lg
                  text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-sm
                  font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? '제출 중...' : '제출하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 제출 중 오버레이 ── */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"/>
            <p className="text-slate-700 font-medium">답안을 제출하는 중입니다...</p>
            <p className="text-slate-400 text-sm mt-1">잠시만 기다려 주세요</p>
          </div>
        </div>
      )}
    </div>
  )
}
