import { createClient } from '@/lib/supabase/client'
import type { SOItem, SOItemWithRelations, UpdateSOItemDTO } from '../../../types'

const supabase = createClient()

export const soItemService = {
  async getBySession(sessionId: string) {
    const { data, error } = await supabase
      .from('so_items')
      .select('*, products(barcode, name)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as SOItemWithRelations[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('so_items')
      .select('*, products(barcode, name)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as SOItemWithRelations
  },

  async updatePhysicalStock(id: string, updates: UpdateSOItemDTO) {
    const { data, error } = await supabase
      .from('so_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, products(barcode, name)')
      .single()

    if (error) throw error
    return data as SOItemWithRelations
  },

  async getVarianceItems(sessionId: string) {
    const { data, error } = await supabase
      .from('so_items')
      .select('*, products(barcode, name)')
      .eq('session_id', sessionId)
      .eq('is_counted', true)
      .neq('variance', 0)

    if (error) throw error
    return data as SOItemWithRelations[]
  },

  subscribeToItems(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`items_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'so_items',
          filter: `session_id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe()
  },
}
