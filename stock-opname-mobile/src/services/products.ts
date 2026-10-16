import { supabase } from './supabase'
import type { Product, ProductWithCategory, ProductFilters } from '../../../types'

export const productService = {
  async getAll(filters?: ProductFilters) {
    let query = supabase
      .from('products')
      .select('*, categories(name)')
      .order('name', { ascending: true })

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`)
    }

    if (filters?.min_stock !== undefined) {
      query = query.gte('system_stock', filters.min_stock)
    }

    if (filters?.max_stock !== undefined) {
      query = query.lte('system_stock', filters.max_stock)
    }

    const { data, error } = await query
    if (error) throw error
    return data as ProductWithCategory[]
  },

  async getByBarcode(barcode: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('barcode', barcode)
      .single()

    if (error) throw error
    return data as ProductWithCategory
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as ProductWithCategory
  },

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'last_updated'>) {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async bulkCreate(products: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'last_updated'>[]) {
    const { data, error } = await supabase
      .from('products')
      .insert(products)
      .select()

    if (error) throw error
    return data
  },
}
