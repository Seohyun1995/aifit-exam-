import Link from 'next/link'

export default function ExamCompletedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100
      flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200
        p-10 max-w-md w-full text-center">

        {/* 아이콘 */}
        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          답안이 제출되었습니다
        </h1>

        {/* 안내 문구 */}
        <p className="text-slate-600 text-sm leading-relaxed mb-2">
          시험에 응시해 주셔서 감사합니다.
        </p>
        <div className="bg-blue-50 rounded-xl p-5 mb-6">
          <p className="text-blue-800 text-sm leading-relaxed font-medium">
            합격 여부는 <strong>3일 이내</strong> 이메일로 안내드립니다.
          </p>
          <p className="text-blue-600 text-xs mt-2">
            스팸 메일함도 확인해 주세요.
          </p>
        </div>

        {/* 규정 안내 */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs text-slate-500 font-semibold mb-2">응시 완료 안내</p>
          <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
            <li>합격 기준: 100점 만점 기준 70점 이상</li>
            <li>결과 통보: 시험 종료 후 3일 이내 이메일</li>
            <li>문의: ㈜이노핏파트너스 운영팀</li>
          </ul>
        </div>

        <Link
          href="/dashboard"
          className="inline-block w-full py-3 px-6 bg-slate-900 text-white
            rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </div>
  )
}
