'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'

// ── 회원가입 (이메일 인증 포함) ──────────────────────────────
export async function signUpAction(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const phone = formData.get('phone') as string
  const organization = formData.get('organization') as string

  // 입력값 검증
  if (!name || !email || !password || !phone || !organization) {
    return { error: '모든 필드를 입력해주세요.' }
  }

  if (password.length < 8) {
    return { error: '비밀번호는 8자 이상이어야 합니다.' }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 이메일 인증 후 리다이렉트 URL
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/verify-email`,
      data: {
        name,
        phone,
        organization,
        role: 'examinee',
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: '이미 사용 중인 이메일 주소입니다.' }
    }
    return { error: `회원가입 오류: ${error.message}` }
  }

  return { success: true }
}

// ── 로그인 ────────────────────────────────────────────────────
export async function signInAction(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.' }
    }
    return { error: `로그인 오류: ${error.message}` }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ── 관리자 로그인 ─────────────────────────────────────────────
export async function adminSignInAction(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  // role 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: '관리자 계정이 아닙니다.' }
  }

  revalidatePath('/', 'layout')
  redirect('/admin')
}

// ── 로그아웃 ──────────────────────────────────────────────────
export async function signOutAction() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}
