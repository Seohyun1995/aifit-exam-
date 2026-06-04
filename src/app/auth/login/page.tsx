'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { signInAction } from '@/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 px-4 bg-slate-900 text-white font-semibold rounded-lg
        hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200 text-sm tracking-wide"
    >
      {pending ? '로그인 중...' : '로그인'}
    </button>
  )
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)
    const res = await signInAction(formData)
    if (res?.error) setError(res.error)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-md">
        {/* Brand */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <span className="text-slate-700 font-semibold text-sm">AI융합전문가 자격시험</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">로그인</h1>
          <p className="text-slate-500 text-sm mt-1">응시자 계정으로 로그인하세요</p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">이메일</label>
            <input
              type="email"
              name="email"
              required
              placeholder="example@email.com"
              autoComplete="email"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-900
                placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300
                focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">비밀번호</label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-900
                placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300
                focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <SubmitButton />
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          계정이 없으신가요?{' '}
          <Link href="/auth/register" className="text-slate-900 font-semibold hover:underline">
            회원가입
          </Link>
        </p>

        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
          <Link href="/admin/login" className="text-xs text-slate-400 hover:text-slate-600">
            관리자 로그인 →
          </Link>
        </div>
      </div>
    </div>
  )
}
