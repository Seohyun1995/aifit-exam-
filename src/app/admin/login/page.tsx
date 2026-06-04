'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { adminSignInAction } from '@/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 px-4 bg-slate-900 text-white font-semibold rounded-lg
        hover:bg-slate-800 disabled:opacity-50 transition-all text-sm"
    >
      {pending ? '로그인 중...' : '관리자 로그인'}
    </button>
  )
}

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)
    const res = await adminSignInAction(formData)
    if (res?.error) setError(res.error)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold">AI</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">관리자 로그인</h1>
          <p className="text-slate-500 text-sm mt-1">이노핏파트너스 운영팀 전용</p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">이메일</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-900
                focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">비밀번호</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-900
                focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <SubmitButton />
        </form>
      </div>
    </div>
  )
}
