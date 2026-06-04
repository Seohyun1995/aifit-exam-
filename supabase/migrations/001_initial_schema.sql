-- ============================================================
-- AI융합전문가 2급 온라인 시험 플랫폼 - DB 스키마
-- Supabase PostgreSQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS (응시자 프로필 - Supabase Auth 연동)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  organization  TEXT,
  role          TEXT NOT NULL DEFAULT 'examinee' CHECK (role IN ('examinee', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: 본인 데이터만 읽기, 관리자는 전체 읽기
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can insert users"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 2. QUESTIONS (문제은행)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          TEXT NOT NULL CHECK (type IN ('multiple_choice', 'ox')),
  subject       TEXT NOT NULL,              -- 과목 분류
  content       TEXT NOT NULL,              -- 문제 내용
  options       JSONB,                      -- 보기 (객관식: ["①..","②..","③..","④.."], OX: null)
  answer        TEXT NOT NULL,              -- 정답 (객관식: "1"~"4", OX: "O" or "X")
  explanation   TEXT,                       -- 해설
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage questions"
  ON public.questions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. EXAMS (시험 회차)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exams (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 TEXT NOT NULL,              -- 회차명 (예: "2024년 1회")
  description           TEXT,
  start_date            TIMESTAMPTZ NOT NULL,        -- 응시 시작일
  end_date              TIMESTAMPTZ NOT NULL,        -- 응시 종료일
  duration_minutes      INTEGER NOT NULL DEFAULT 30, -- 제한 시간 (분)
  tab_violation_limit   INTEGER NOT NULL DEFAULT 3,  -- 탭 이탈 허용 횟수
  mc_question_count     INTEGER NOT NULL DEFAULT 25, -- 객관식 출제 문항 수
  ox_question_count     INTEGER NOT NULL DEFAULT 5,  -- OX 출제 문항 수
  passing_score         INTEGER NOT NULL DEFAULT 70, -- 합격 기준 점수
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_by            UUID REFERENCES public.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exams"
  ON public.exams FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Examinees can view active exams"
  ON public.exams FOR SELECT
  USING (is_active = TRUE AND auth.role() = 'authenticated');

-- ============================================================
-- 4. EXAM_SESSIONS (응시 세션 - 개별 응시 기록)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id             UUID NOT NULL REFERENCES public.exams(id),
  user_id             UUID NOT NULL REFERENCES public.users(id),
  -- 출제된 문항 순서 저장 (랜덤 출제 재현 가능하도록)
  question_ids        UUID[] NOT NULL DEFAULT '{}',
  started_at          TIMESTAMPTZ,
  submitted_at        TIMESTAMPTZ,
  -- 채점 결과 (제출 전: NULL)
  score               INTEGER,
  is_passed           BOOLEAN,
  -- 제출 방식
  submit_reason       TEXT CHECK (submit_reason IN ('manual', 'timeout', 'violation')),
  status              TEXT NOT NULL DEFAULT 'registered'
                      CHECK (status IN ('registered', 'in_progress', 'submitted')),
  -- 5년 보관을 위한 소프트 딜리트 방지 (DELETE 대신 archived 상태 사용)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_id, user_id)  -- 동일 회차 중복 응시 방지
);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.exam_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.exam_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.exam_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON public.exam_sessions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all sessions"
  ON public.exam_sessions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 5. ANSWERS (응시자 답안 - 문항별 저장)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES public.questions(id),
  user_answer     TEXT,          -- 응시자 선택 답 (null = 미응답)
  is_correct      BOOLEAN,       -- 채점 결과 (제출 전: NULL)
  score_earned    INTEGER,       -- 획득 점수
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own answers"
  ON public.answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_sessions es
      WHERE es.id = session_id AND es.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all answers"
  ON public.answers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 6. TAB_VIOLATIONS (탭 이탈 기록)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tab_violations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  violation_count INTEGER NOT NULL  -- 해당 시점의 누적 이탈 횟수
);

ALTER TABLE public.tab_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own violations"
  ON public.tab_violations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all violations"
  ON public.tab_violations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 유틸리티: updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER exam_sessions_updated_at
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER answers_updated_at
  BEFORE UPDATE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Supabase Auth 훅: 신규 사용자 users 테이블 자동 삽입
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, phone, organization, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'organization', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'examinee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 인덱스 (성능 최적화)
-- ============================================================
CREATE INDEX idx_exam_sessions_exam_id ON public.exam_sessions(exam_id);
CREATE INDEX idx_exam_sessions_user_id ON public.exam_sessions(user_id);
CREATE INDEX idx_answers_session_id ON public.answers(session_id);
CREATE INDEX idx_tab_violations_session_id ON public.tab_violations(session_id);
CREATE INDEX idx_questions_type ON public.questions(type);
CREATE INDEX idx_questions_is_active ON public.questions(is_active);

-- ============================================================
-- 관리자 집계 뷰 (성적 조회용)
-- ============================================================
CREATE OR REPLACE VIEW public.admin_session_view AS
SELECT
  es.id AS session_id,
  e.title AS exam_title,
  u.name AS user_name,
  u.email AS user_email,
  u.phone AS user_phone,
  u.organization AS user_organization,
  es.score,
  es.is_passed,
  es.status,
  es.submit_reason,
  es.started_at,
  es.submitted_at,
  (
    SELECT COUNT(*) FROM public.tab_violations tv
    WHERE tv.session_id = es.id
  ) AS tab_violation_count,
  es.exam_id,
  es.user_id
FROM public.exam_sessions es
JOIN public.exams e ON e.id = es.exam_id
JOIN public.users u ON u.id = es.user_id;
