import { createClient } from '@/lib/supabase/client'
import type { AuditLog, AuditLogWithUser, AuditLogFilters } from '../../../types'

const supabase = createClient()

export const auditLogService = {
  async getAll(filters?: AuditLogFilters, limit: number = 100) {
    let query = supabase
      .from('audit_logs')
      .select('*, users(full_name, username)')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type)
    }

    if (filters?.action) {
      query = query.eq('action', filters.action)
    }

    if (filters?.date_from) {
      query = query.gte('timestamp', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('timestamp', filters.date_to)
    }

    const { data, error } = await query
    if (error) throw error
    return data as AuditLogWithUser[]
  },

  async getByEntity(entityType: string, entityId: string) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, users(full_name, username)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('timestamp', { ascending: false })

    if (error) throw error
    return data as AuditLogWithUser[]
  },
}
