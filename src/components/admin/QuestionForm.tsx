'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createQuestionAction } from '@/actions/admin'
import type { QuestionType } from '@/types'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold
        hover:bg-slate-800 disabled:opacity-50 transition-colors"
    >
      {pending ? '등록 중...' : '문제 등록'}
    </button>
  )
}

export default function QuestionForm({ subjects }: { subjects: string[] }) {
  const [type, setType] = useState<QuestionType>('multiple_choice')
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)

  async function handleSubmit(formData: FormData) {
    setResult(null)
    const res = await createQuestionAction(formData)
    setResult(res)
    if (res.success) {
      // 폼 초기화
      const form = document.getElementById('question-form') as HTMLFormElement
      form?.reset()
    }
  }

  return (
    <form id="question-form" action={handleSubmit} className="space-y-4">
      {/* 유형 + 과목 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">문제 유형 *</label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
          >
            <option value="multiple_choice">객관식 (4지선다)</option>
            <option value="ox">OX 문제</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">과목 분류 *</label>
          <input
            type="text"
            name="subject"
            required
            placeholder="예: AI 기초, 데이터 분석"
            list="subjects-list"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900"
          />
          <datalist id="subjects-list">
            {subjects.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
      </div>

      {/* 문제 내용 */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">문제 내용 *</label>
        <textarea
          name="content"
          required
          rows={3}
          placeholder="문제 내용을 입력하세요"
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 resize-none"
        />
      </div>

      {/* 객관식 보기 */}
      {type === 'multiple_choice' && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">보기 (4개 필수) *</label>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full
                  text-xs font-bold text-slate-600 flex-shrink-0">
                  {num}
                </span>
                <input
                  type="text"
                  name={`option${num}`}
                  required={type === 'multiple_choice'}
                  placeholder={`보기 ${num}`}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 정답 */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">정답 *</label>
        {type === 'multiple_choice' ? (
          <select
            name="answer"
            required
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
          >
            <option value="">정답 선택</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={String(n)}>보기 {n}</option>
            ))}
          </select>
        ) : (
          <div className="flex gap-3">
            {(['O', 'X'] as const).map((c) => (
              <label key={c} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="answer" value={c} required
                  className="w-4 h-4 text-slate-900 border-slate-300" />
                <span className={`text-xl font-bold ${c === 'O' ? 'text-blue-600' : 'text-red-500'}`}>
                  {c}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 해설 */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          해설 <span className="text-slate-400 font-normal">(선택)</span>
        </label>
        <textarea
          name="explanation"
          rows={2}
          placeholder="정답에 대한 해설을 입력하세요"
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 resize-none"
        />
      </div>

      {/* 피드백 */}
      {result?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {result.error}
        </div>
      )}
      {result?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg">
          문제가 성공적으로 등록되었습니다.
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  )
}
