import { supabase } from './supabase'
import * as SecureStore from 'expo-secure-store'
import type { User } from '../types'

const USER_SESSION_KEY = 'stockify_mobile_user_session'

export interface LoginParams {
  identifier: string // email or username
  password: string
}

export const authService = {
  async signIn({ identifier, password }: LoginParams): Promise<User> {
    const trimmed = identifier.trim()
    if (!trimmed) {
      throw new Error('Silakan masukkan username atau email petugas.')
    }
    if (!password || !password.trim()) {
      throw new Error('Silakan masukkan kata sandi Anda.')
    }

    let emailToUse = trimmed

    // 1. If identifier doesn't contain '@', look up email from public.users table
    if (!trimmed.includes('@')) {
      const { data: userByUsername, error: usernameError } = await (supabase as any)
        .from('users')
        .select('email')
        .ilike('username', trimmed)
        .maybeSingle()

      if (usernameError || !userByUsername?.email) {
        throw new Error(`Username "${trimmed}" tidak terdaftar dalam sistem.`)
      }
      emailToUse = userByUsername.email
    }

    // 2. Strict password authentication via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: password,
    })

    if (authError || !authData?.user) {
      const errMsg = authError?.message || ''
      if (errMsg.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Kata sandi yang Anda masukkan salah. Silakan periksa kembali.')
      }
      if (errMsg.toLowerCase().includes('email not confirmed')) {
        throw new Error('Email akun belum dikonfirmasi oleh sistem.')
      }
      throw new Error(errMsg || 'Autentikasi gagal. Periksa kembali email dan kata sandi Anda.')
    }

    // 3. Fetch user profile from public.users table
    const { data: userRecord, error: userError } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle()

    let finalUser = userRecord
    if (!finalUser) {
      // Fallback lookup by email if id was seeded independently
      const { data: userByEmail } = await (supabase as any)
        .from('users')
        .select('*')
        .ilike('email', emailToUse)
        .maybeSingle()
      finalUser = userByEmail
    }

    if (!finalUser) {
      await supabase.auth.signOut()
      throw new Error('Profil data petugas tidak ditemukan di database.')
    }

    if (finalUser.is_active === false) {
      await supabase.auth.signOut()
      throw new Error('Akun petugas ini telah dinonaktifkan oleh administrator.')
    }

    // 4. Update last_login in public.users
    try {
      await (supabase as any)
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', finalUser.id)
    } catch {
      // Non-blocking
    }

    // 5. Persist user session to SecureStore
    await SecureStore.setItemAsync(USER_SESSION_KEY, JSON.stringify(finalUser))

    return finalUser as User
  },

  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut()
    } catch {
      // Non-blocking
    }
    await SecureStore.deleteItemAsync(USER_SESSION_KEY)
  },

  async getSavedSession(): Promise<User | null> {
    try {
      const json = await SecureStore.getItemAsync(USER_SESSION_KEY)
      if (json) {
        const user = JSON.parse(json) as User
        return user
      }
    } catch {
      // Ignore
    }
    return null
  },

  async getStaffList(): Promise<User[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (error) throw error
      return (data || []) as User[]
    } catch (err) {
      console.error('Error fetching staff list:', err)
      return []
    }
  }
}
