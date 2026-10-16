import { supabase } from './supabase'
import type { SOSession, SessionWithRelations, CreateSessionDTO, SessionFilters } from '../../../types'

export const sessionService = {
  async getAll(filters?: SessionFilters) {
    let query = supabase
      .from('so_sessions')
      .select('*, users(full_name, username), categories(name)')
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    const { data, error } = await query
    if (error) throw error
    return data as SessionWithRelations[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('so_sessions')
      .select('*, users(full_name, username), categories(name)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as SessionWithRelations
  },

  async create(session: CreateSessionDTO) {
    const sessionCode = await this.generateSessionCode()
    
    const { data, error } = await supabase
      .from('so_sessions')
      .insert({
        ...session,
        session_code: sessionCode,
        status: 'active',
      })
      .select('*, users(full_name, username), categories(name)')
      .single()

    if (error) throw error
    return data as SessionWithRelations
  },

  async update(id: string, updates: Partial<SOSession>) {
    const { data, error } = await supabase
      .from('so_sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, users(full_name, username), categories(name)')
      .single()

    if (error) throw error
    return data as SessionWithRelations
  },

  async complete(id: string) {
    return this.update(id, {
      status: 'completed',
      end_time: new Date().toISOString(),
    })
  },

  async getProgress(sessionId: string) {
    const { data, error } = await supabase.rpc('get_session_progress', {
      session_id: sessionId,
    })

    if (error) throw error
    return data[0]
  },

  async generateSessionCode(): Promise<string> {
    const { data, error } = await supabase.rpc('generate_session_code')
    if (error) throw error
    return data
  },
}
