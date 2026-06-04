'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { signUpAction } from '@/actions/auth'

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
      {pending ? '처리 중...' : '회원가입'}
    </button>
  )
}

export default function RegisterPage() {
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)
  const [agreed, setAgreed] = useState(false)

  async function handleSubmit(formData: FormData) {
    setResult(null)
    const res = await signUpAction(formData)
    setResult(res)
  }

  if (result?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-3">이메일 인증 메일을 발송했습니다</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            입력하신 이메일 주소로 인증 링크를 발송했습니다.<br />
            메일함을 확인하고 인증 링크를 클릭해 주세요.
          </p>
          <p className="text-xs text-slate-400">스팸 메일함도 확인해 주세요</p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2"
          >
            로그인 화면으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <span className="text-slate-700 font-semibold text-sm">AI융합전문가 자격시험</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">회원가입</h1>
          <p className="text-slate-500 text-sm mt-1">이메일 인증 후 시험에 응시할 수 있습니다</p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">이름 *</label>
            <input
              type="text"
              name="name"
              required
              placeholder="홍길동"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-900
                placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300
                focus:border-transparent transition-all"
            />
          </div>

          {/* 이메일 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">이메일 *</label>
            <input
              type="email"
              name="email"
              required
              placeholder="example@email.com"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-900
                placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300
                focus:border-transparent transition-all"
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">비밀번호 * <span className="text-slate-400 font-normal">(8자 이상)</span></label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-900
                placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300
                focus:border-transparent transition-all"
            />
          </div>

          {/* 연락처 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">연락처 *</label>
            <input
              type="tel"
              name="phone"
              required
              placeholder="010-0000-0000"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-900
                placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300
                focus:border-transparent transition-all"
            />
          </div>

          {/* 소속기관 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">소속기관 *</label>
            <input
              type="text"
              name="organization"
              required
              placeholder="이노핏파트너스"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-900
                placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300
                focus:border-transparent transition-all"
            />
          </div>

          {/* 개인정보 동의 */}
          <div className="bg-slate-50 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                이름, 이메일, 연락처, 소속기관 정보는 자격시험 운영 목적으로 수집되며,
                관련 규정에 따라 <strong>5년간 보관</strong>됩니다. 이에 동의합니다.
              </span>
            </label>
          </div>

          {/* 에러 메시지 */}
          {result?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {result.error}
            </div>
          )}

          <SubmitButton />
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" className="text-slate-900 font-semibold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
