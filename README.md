# AI융합전문가 2급 온라인 시험 플랫폼
## 전체 구현 가이드 — ㈜이노핏파트너스

> 작성: 2026-06-04 | 스택: Next.js 15 App Router + Supabase + Vercel + Resend

---

## Step 1. DB 스키마 설계

파일 위치: `supabase/migrations/001_initial_schema.sql`

### 테이블 구조 요약

| 테이블 | 설명 | 보존 | RLS |
|--------|------|------|-----|
| `users` | 응시자/관리자 프로필 (Supabase Auth 연동) | 영구 | 본인만 |
| `questions` | 문제은행 (객관식/OX, 소프트 삭제) | 영구 | 관리자만 쓰기 |
| `exams` | 시험 회차 (기간·제한시간·탭이탈횟수 설정) | 영구 | 관리자만 쓰기 |
| `exam_sessions` | 개별 응시 세션 (출제 문항 순서 저장) | 5년+ | 본인+관리자 |
| `answers` | 문항별 답안·채점 결과 | 5년+ | 본인+관리자 |
| `tab_violations` | 탭 이탈 발생 기록 | 5년+ | 본인쓰기+관리자읽기 |

### 핵심 설계 결정

- **정답 보안**: `questions` 테이블의 `answer` 필드는 서비스 클라이언트(service role)로만 접근. 클라이언트에 절대 노출 안 됨
- **5년 보관**: 소프트 딜리트 방식 (`is_active: false`). 실제 DELETE 금지
- **점수 미노출**: `exam_sessions`에 score는 저장되나, 응시자 RLS 정책에서 score 필드 접근 불가
- **탭이탈 설정**: 하드코딩 없이 `exams.tab_violation_limit`에서 동적 로드
- **auth 훅**: 신규 Supabase Auth 사용자 생성 시 `public.users`에 자동 동기화

---

## Step 2. 프로젝트 구조

```
aifit-exam-platform/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # 루트 레이아웃
│   │   ├── globals.css                   # Tailwind 전역 스타일
│   │   ├── auth/
│   │   │   ├── login/page.tsx            # 응시자 로그인
│   │   │   ├── register/page.tsx         # 회원가입 (이메일 인증)
│   │   │   └── verify-email/page.tsx     # 인증 완료 리다이렉트
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # 응시자 대시보드 (시험 목록/이력)
│   │   ├── exam/
│   │   │   ├── [sessionId]/page.tsx      # 시험 응시 화면 (Server Component)
│   │   │   └── completed/page.tsx        # 제출 완료 화면
│   │   └── admin/
│   │       ├── layout.tsx                # 관리자 사이드바 레이아웃
│   │       ├── login/page.tsx            # 관리자 전용 로그인
│   │       ├── page.tsx                  # 관리자 대시보드
│   │       ├── questions/page.tsx        # 문제은행 관리
│   │       ├── exams/page.tsx            # 시험 회차 관리
│   │       └── sessions/page.tsx         # 응시자 명단 + 이메일 발송
│   ├── actions/
│   │   ├── auth.ts                       # 회원가입/로그인/로그아웃 Server Actions
│   │   ├── exam.ts                       # 응시신청/시작/탭기록/제출·채점 Server Actions
│   │   └── admin.ts                      # 문제CRUD/회차생성/이메일발송/CSV Server Actions
│   ├── components/
│   │   ├── exam/
│   │   │   └── ExamPageClient.tsx        # 시험 화면 Client Component (타이머/탭감지/자동제출)
│   │   └── admin/
│   │       ├── QuestionForm.tsx          # 문제 등록 폼
│   │       ├── QuestionList.tsx          # 문제 목록 + 삭제
│   │       ├── ExamForm.tsx              # 시험 회차 생성 폼
│   │       └── SessionsTable.tsx         # 응시자 명단 테이블 + 이메일발송 + CSV
│   ├── lib/
│   │   └── supabase.ts                   # Supabase 클라이언트 (브라우저/서버/서비스롤)
│   ├── types/
│   │   └── index.ts                      # TypeScript 타입 정의 전체
│   └── middleware.ts                     # 라우트 보호 (role 체크)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql        # DB 스키마 전체
├── .env.local.example                    # 환경변수 템플릿
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Step 3. 핵심 기능 구현 요약

### 1. 이메일 인증 회원가입 (`src/actions/auth.ts`)

```typescript
// signUpAction() 흐름
formData(name, email, password, phone, organization)
  → supabase.auth.signUp({ email, password, options: { data: { name, phone, organization } } })
  → Supabase가 인증 이메일 자동 발송
  → 사용자 클릭 → /auth/verify-email 리다이렉트
  → on_auth_user_created 트리거 → public.users 자동 생성
```

관리자 계정은 `/admin/login` 전용 경로 + `adminSignInAction()`으로 완전 분리.

### 2. 시험 응시 화면 (`src/components/exam/ExamPageClient.tsx`)

```
[Server Component /exam/[sessionId]/page.tsx]
  - Supabase에서 세션 검증 + 출제 문항 조회 (정답 필드 제외)
  - 응시 기간 만료 체크

[Client Component ExamPageClient.tsx]
  - sessionStorage: 답안 임시저장 (새로고침 유지)
  - sessionStorage: 남은 시간 저장
  - useEffect + setInterval: 1초마다 타이머 감소
  - visibilitychange 이벤트: 탭 이탈 감지
    → recordTabViolation() Server Action으로 서버 기록
    → 경고 팝업 표시
    → 허용 횟수 초과 시 handleAutoSubmit('violation')
  - 타이머 0초: handleAutoSubmit('timeout')
  - 제출 버튼: handleManualSubmit()
```

### 3. 시험 제출 Server Action (`src/actions/exam.ts`)

```typescript
submitExamAction(payload) 흐름:
  1. getUser() → 본인 세션 검증
  2. serviceClient로 questions 정답 조회 (RLS 우회, 채점 전용)
  3. gradeAnswers(): 100점 기준 배점, Fisher-Yates 보정
  4. answers 테이블 upsert (문항별 정답여부 + 획득점수)
  5. exam_sessions 업데이트:
     - status: 'submitted'
     - score: 계산된 점수
     - is_passed: score >= passing_score(70)
     - submit_reason: 'manual' | 'timeout' | 'violation'
  6. 응시자에게는 { success: true }만 반환 (점수 미노출)
```

### 4. 관리자 문제 등록 (`src/actions/admin.ts` + `src/components/admin/QuestionForm.tsx`)

- 관리자 권한 확인: `requireAdmin()` 헬퍼로 모든 admin action 보호
- 객관식: type, subject, content, options[4], answer(1~4), explanation
- OX: type, subject, content, answer(O/X), explanation
- 삭제: `is_active: false` 소프트 삭제 (5년 보관 준수)

### 5. 응시자 명단 + 합격자 이메일 발송 (`src/components/admin/SessionsTable.tsx`)

```typescript
// 합격자 이메일 발송
sendPassEmailsAction(examId):
  → admin_session_view에서 is_passed=true 필터
  → Promise.allSettled()로 Resend API 병렬 발송
  → 합격자 HTML 이메일 템플릿 (이름, 점수 포함)
  → 성공/실패 카운트 반환

// CSV 내보내기 (클라이언트 사이드)
getSessionsForCSV(examId):
  → admin_session_view 전체 조회
  → BOM 포함 CSV 생성 (Excel 한글 깨짐 방지)
  → Blob + URL.createObjectURL로 다운로드
```

---

## Step 4. 배포 가이드

### 환경변수 목록

| 변수 | 설명 | 필수 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 공개 키 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | 채점용 서비스 롤 키 (서버 전용) | ✅ |
| `NEXT_PUBLIC_SITE_URL` | 배포 도메인 (이메일 인증 콜백용) | ✅ |
| `RESEND_API_KEY` | Resend 이메일 발송 API 키 | ✅ |
| `EMAIL_FROM` | 발신 이메일 주소 | ✅ |

### 배포 체크리스트 (5단계)

1. **Supabase 설정**
   - `001_initial_schema.sql` SQL Editor에서 실행
   - Authentication > Email > Confirm Email ON
   - Authentication > URL Configuration > Site URL 설정

2. **관리자 계정 생성**
   ```sql
   -- Supabase Dashboard > SQL Editor에서 실행
   UPDATE public.users SET role = 'admin' WHERE email = 'admin@innofitpartners.com';
   ```

3. **Resend 도메인 인증**
   - resend.com에서 도메인 DNS 설정 (SPF, DKIM)
   - `EMAIL_FROM`을 인증된 도메인으로 설정

4. **Vercel 배포**
   ```bash
   npx vercel --prod
   # 또는 GitHub 연동 후 자동 배포
   ```
   - Vercel Dashboard > Environment Variables에 위 6개 변수 등록

5. **기능 검증**
   - 응시자 회원가입 → 이메일 인증 → 시험 응시 → 제출 완료 화면 확인
   - 관리자 로그인 → 문제 등록 → 회차 생성 → 응시자 명단 → 이메일 발송 확인

---

## 보안 주의사항

- `SUPABASE_SERVICE_ROLE_KEY`는 절대 `NEXT_PUBLIC_` 접두사 사용 금지
- 채점 로직은 Server Action에서만 실행 (클라이언트 접근 불가)
- 관리자 route는 middleware + requireAdmin() 이중 검증
- 응시자 API 응답에서 `answer`, `is_passed`, `score` 필드 미포함

## MVP 이후 확장 고려사항

- 휴대폰 본인인증 (PASS API) 연동 — 관리운영규정 제5조 준수
- 응시료 결제 (TossPayments/아임포트)
- 자격증 PDF 자동 생성 (Puppeteer/PDFKit)
- 1급 시험 모듈 추가
