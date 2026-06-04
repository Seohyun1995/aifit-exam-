'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import type { QuestionType } from '@/types'

// ── 관리자 권한 확인 헬퍼 ────────────────────────────────────
async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHORIZED')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') throw new Error('FORBIDDEN')
  return { supabase, user }
}

// ============================================================
// 문제은행 관리
// ============================================================

export async function createQuestionAction(formData: FormData) {
  try {
    const { supabase, user } = await requireAdmin()

    const type = formData.get('type') as QuestionType
    const subject = formData.get('subject') as string
    const content = formData.get('content') as string
    const answer = formData.get('answer') as string
    const explanation = formData.get('explanation') as string | null

    // 객관식 보기 파싱
    let options = null
    if (type === 'multiple_choice') {
      options = [
        formData.get('option1'),
        formData.get('option2'),
        formData.get('option3'),
        formData.get('option4'),
      ].filter(Boolean)

      if (options.length !== 4) {
        return { error: '객관식 문제는 보기 4개가 필요합니다.' }
      }
    }

    const { error } = await supabase.from('questions').insert({
      type,
      subject,
      content,
      options,
      answer,
      explanation,
      created_by: user.id,
    })

    if (error) return { error: `문제 등록 실패: ${error.message}` }

    revalidatePath('/admin/questions')
    return { success: true }
  } catch (e: any) {
    return { error: e.message === 'UNAUTHORIZED' ? '로그인이 필요합니다.' : '권한이 없습니다.' }
  }
}

export async function updateQuestionAction(formData: FormData) {
  try {
    const { supabase } = await requireAdmin()

    const id = formData.get('id') as string
    const type = formData.get('type') as QuestionType
    const subject = formData.get('subject') as string
    const content = formData.get('content') as string
    const answer = formData.get('answer') as string
    const explanation = formData.get('explanation') as string | null

    let options = null
    if (type === 'multiple_choice') {
      options = [
        formData.get('option1'),
        formData.get('option2'),
        formData.get('option3'),
        formData.get('option4'),
      ].filter(Boolean)
    }

    const { error } = await supabase
      .from('questions')
      .update({ type, subject, content, options, answer, explanation })
      .eq('id', id)

    if (error) return { error: `수정 실패: ${error.message}` }

    revalidatePath('/admin/questions')
    return { success: true }
  } catch (e: any) {
    return { error: '권한이 없습니다.' }
  }
}

export async function deleteQuestionAction(id: string) {
  try {
    const { supabase } = await requireAdmin()

    const { error } = await supabase
      .from('questions')
      .update({ is_active: false })
      .eq('id', id)

    if (error) return { error: `삭제 실패: ${error.message}` }

    revalidatePath('/admin/questions')
    return { success: true }
  } catch (e: any) {
    return { error: '권한이 없습니다.' }
  }
}

// ============================================================
// 시험 회차 관리
// ============================================================

export async function createExamAction(formData: FormData) {
  try {
    const { supabase, user } = await requireAdmin()

    const { error } = await supabase.from('exams').insert({
      title: formData.get('title'),
      description: formData.get('description'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      duration_minutes: Number(formData.get('duration_minutes')) || 30,
      tab_violation_limit: Number(formData.get('tab_violation_limit')) || 3,
      mc_question_count: Number(formData.get('mc_question_count')) || 25,
      ox_question_count: Number(formData.get('ox_question_count')) || 5,
      passing_score: 70,
      created_by: user.id,
    })

    if (error) return { error: `회차 생성 실패: ${error.message}` }

    revalidatePath('/admin/exams')
    return { success: true }
  } catch (e: any) {
    return { error: '권한이 없습니다.' }
  }
}

// ============================================================
// 합격자 이메일 일괄 발송 (Resend 사용)
// ============================================================

export async function sendPassEmailsAction(examId: string) {
  try {
    await requireAdmin()
    const serviceClient = createServiceClient()

    // 합격자 조회
    const { data: sessions, error } = await serviceClient
      .from('exam_sessions')
      .select(`
        id,
        score,
        users!inner(name, email)
      `)
      .eq('exam_id', examId)
      .eq('is_passed', true)
      .eq('status', 'submitted')

    if (error) return { error: '합격자 조회 실패' }
    if (!sessions || sessions.length === 0) {
      return { error: '발송할 합격자가 없습니다.' }
    }

    // Resend API로 이메일 발송
    const results = await Promise.allSettled(
      sessions.map((session: any) =>
        sendPassEmail(session.users.email, session.users.name, session.score)
      )
    )

    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failCount = results.filter((r) => r.status === 'rejected').length

    return {
      success: true,
      message: `총 ${sessions.length}명 중 ${successCount}명 발송 완료${failCount > 0 ? `, ${failCount}명 실패` : ''}`,
    }
  } catch (e: any) {
    return { error: '권한이 없습니다.' }
  }
}

// ── 단일 합격자 이메일 발송 ──────────────────────────────────
async function sendPassEmail(email: string, name: string, score: number) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `AI융합전문가 자격시험 <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: '[AI융합전문가] 2급 자격시험 합격을 축하드립니다!',
      html: buildPassEmailHtml(name, score),
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(`이메일 발송 실패: ${JSON.stringify(err)}`)
  }

  return response.json()
}

// ── 이메일 HTML 템플릿 ────────────────────────────────────────
function buildPassEmailHtml(name: string, score: number): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Apple SD Gothic Neo', '맑은 고딕', sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 32px; text-align: center;">
      <div style="color: #e2b96b; font-size: 14px; letter-spacing: 3px; margin-bottom: 12px;">AI FIT PRACTITIONER</div>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">합격을 축하드립니다!</h1>
    </div>
    <div style="padding: 40px 32px;">
      <p style="color: #333; font-size: 16px; line-height: 1.8; margin: 0 0 24px;">
        안녕하세요, <strong>${name}</strong>님.<br>
        <strong>AI융합전문가(AI FIT Practitioner) 2급</strong> 자격시험에 합격하셨습니다.
      </p>
      <div style="background: #f8f9ff; border-left: 4px solid #e2b96b; padding: 20px 24px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <div style="color: #666; font-size: 13px; margin-bottom: 4px;">취득 점수</div>
        <div style="color: #1a1a2e; font-size: 36px; font-weight: 700;">${score}<span style="font-size: 18px; color: #666;">점</span></div>
        <div style="color: #888; font-size: 12px; margin-top: 4px;">합격 기준: 70점 이상</div>
      </div>
      <p style="color: #555; font-size: 14px; line-height: 1.8;">
        자격증 발급 및 향후 일정에 대해서는 별도 안내 드릴 예정입니다.<br>
        궁금한 사항은 이노핏파트너스로 문의해 주세요.
      </p>
      <div style="border-top: 1px solid #eee; margin-top: 32px; padding-top: 24px;">
        <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
          ㈜이노핏파트너스 | AI융합전문가 자격시험 운영팀<br>
          본 메일은 발신 전용입니다.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// ============================================================
// CSV 내보내기용 데이터 조회
// ============================================================

export async function getSessionsForCSV(examId: string) {
  try {
    await requireAdmin()
    const serviceClient = createServiceClient()

    const { data, error } = await serviceClient
      .from('admin_session_view')
      .select('*')
      .eq('exam_id', examId)
      .order('submitted_at', { ascending: false })

    if (error) return { error: '데이터 조회 실패' }
    return { data }
  } catch {
    return { error: '권한이 없습니다.' }
  }
}
