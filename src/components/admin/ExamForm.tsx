'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createExamAction } from '@/actions/admin'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold
        hover:bg-slate-800 disabled:opacity-50 transition-colors"
    >
      {pending ? '생성 중...' : '회차 생성'}
    </button>
  )
}

export default function ExamForm() {
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)

  async function handleSubmit(formData: FormData) {
    setResult(null)
    const res = await createExamAction(formData)
    setResult(res)
    if (res.success) {
      const form = document.getElementById('exam-form') as HTMLFormElement
      form?.reset()
    }
  }

  return (
    <form id="exam-form" action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">회차명 *</label>
          <input
            type="text"
            name="title"
            required
            placeholder="예: 2025년 1회 AI융합전문가 2급"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">응시 시작일시 *</label>
          <input
            type="datetime-local"
            name="start_date"
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">응시 종료일시 *</label>
          <input
            type="datetime-local"
            name="end_date"
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">제한 시간 (분) *</label>
          <input
            type="number"
            name="duration_minutes"
            defaultValue={30}
            min={10}
            max={120}
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">탭 이탈 허용 횟수</label>
          <input
            type="number"
            name="tab_violation_limit"
            defaultValue={3}
            min={0}
            max={10}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">객관식 출제 수</label>
          <input
            type="number"
            name="mc_question_count"
            defaultValue={25}
            min={1}
            max={50}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">OX 출제 수</label>
          <input
            type="number"
            name="ox_question_count"
            defaultValue={5}
            min={0}
            max={20}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">설명 (선택)</label>
        <textarea
          name="description"
          rows={2}
          placeholder="시험에 대한 추가 안내 사항"
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 resize-none"
        />
      </div>

      {result?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {result.error}
        </div>
      )}
      {result?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg">
          시험 회차가 생성되었습니다.
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  )
}
