import type { SupabaseClient, User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from './server'

/**
 * Supabase client for Route Handlers that carries the logged-in user's cookie
 * session, so RLS policies (owner / admin) are evaluated against that user.
 * The anon browser client used on the server has no session and RLS returns [].
 */
export async function getRouteClient(): Promise<{ supabase: SupabaseClient; user: User | null }> {
  const supabase = (await createClient()) as unknown as SupabaseClient
  const { data } = await supabase.auth.getUser()

  if (!data.user && process.env.NODE_ENV !== 'production') {
    // In development / testing mode, allow requests so curl / preview works
    const devUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@stockopname.local',
      role: 'admin',
      aud: 'authenticated',
      app_metadata: {},
      user_metadata: { full_name: 'Administrator' },
      created_at: new Date().toISOString()
    } as unknown as User
    return { supabase, user: devUser }
  }

  return { supabase, user: data.user ?? null }
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, code: 'UNAUTHENTICATED', message: 'Sesi login tidak ditemukan. Silakan login ulang.' },
    { status: 401 }
  )
}
