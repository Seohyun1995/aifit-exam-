'use client'

import { useState } from 'react'
import { deleteQuestionAction } from '@/actions/admin'
import type { Question } from '@/types'

export default function QuestionList({ questions }: { questions: Question[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('이 문제를 삭제하시겠습니까? (비활성화 처리)')) return
    setDeletingId(id)
    await deleteQuestionAction(id)
    setDeletingId(null)
  }

  if (questions.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p className="text-sm">등록된 문제가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      {questions.map((question, idx) => (
        <div key={question.id} className="p-5 hover:bg-slate-50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-400 font-mono">{idx + 1}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                  ${question.type === 'multiple_choice'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-emerald-50 text-emerald-700'
                  }`}>
                  {question.type === 'multiple_choice' ? '객관식' : 'OX'}
                </span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {question.subject}
                </span>
              </div>
              <p className="text-sm text-slate-900 leading-relaxed mb-2 line-clamp-2">
                {question.content}
              </p>
              {question.type === 'multiple_choice' && question.options && (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {question.options.map((opt, i) => (
                    <span key={i}
                      className={`text-xs ${
                        question.answer === String(i + 1)
                          ? 'text-emerald-700 font-semibold'
                          : 'text-slate-500'
                      }`}>
                      {i + 1}. {opt}
                      {question.answer === String(i + 1) && ' ✓'}
                    </span>
                  ))}
                </div>
              )}
              {question.type === 'ox' && (
                <span className="text-xs text-slate-500">
                  정답: <strong className={question.answer === 'O' ? 'text-blue-600' : 'text-red-500'}>
                    {question.answer}
                  </strong>
                </span>
              )}
            </div>
            <button
              onClick={() => handleDelete(question.id)}
              disabled={deletingId === question.id}
              className="flex-shrink-0 p-2 text-slate-400 hover:text-red-500
                hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="삭제"
            >
              {deletingId === question.id ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"/>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
