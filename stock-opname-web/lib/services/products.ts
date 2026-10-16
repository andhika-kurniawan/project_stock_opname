import { createClient } from '@/lib/supabase/client'
import type { Product, ProductWithCategory, ProductFilters, ImportProductDTO, Category } from '../../../types'

const supabase = createClient()

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

  async delete(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
  },

  async bulkImport(products: ImportProductDTO[]) {
    const categories = await supabase.from('categories').select('id, name')
    const { data: categoryData } = categories

    const categoryMap = new Map<string, string>()
    categoryData?.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id)
    })

    const productsToInsert = products.map((p) => ({
      barcode: p.barcode,
      name: p.name,
      category_id: categoryMap.get(p.category_name.toLowerCase()) || '',
      system_stock: p.system_stock,
    }))

    const { data, error } = await supabase
      .from('products')
      .upsert(productsToInsert, { onConflict: 'barcode' })
      .select()

    if (error) throw error
    return data
  },
}

export const categoryService = {
  async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data
  },

  async create(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Category>) {
    const { data, error } = await supabase
      .from('categories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
  },
}
