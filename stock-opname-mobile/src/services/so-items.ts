import { supabase } from './supabase'
import type { SOItem, SOItemWithRelations, UpdateSOItemDTO } from '../../../types'

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

  async create(item: Omit<SOItem, 'id' | 'created_at' | 'updated_at' | 'variance'>) {
    const { data, error } = await supabase
      .from('so_items')
      .insert(item)
      .select('*, products(barcode, name)')
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

  async bulkCreate(items: Omit<SOItem, 'id' | 'created_at' | 'updated_at' | 'variance'>[]) {
    const { data, error } = await supabase
      .from('so_items')
      .insert(items)
      .select('*, products(barcode, name)')

    if (error) throw error
    return data as SOItemWithRelations[]
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

  async getUncountedItems(sessionId: string) {
    const { data, error } = await supabase
      .from('so_items')
      .select('*, products(barcode, name)')
      .eq('session_id', sessionId)
      .eq('is_counted', false)

    if (error) throw error
    return data as SOItemWithRelations[]
  },
}
