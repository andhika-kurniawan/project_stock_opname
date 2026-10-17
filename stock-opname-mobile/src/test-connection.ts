import { supabase } from './services/supabase'

export async function testConnection() {
  console.log('🔄 Testing Supabase connection...')

  try {
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .limit(3)

    if (catError) throw catError

    console.log('✅ Connection successful!')
    console.log('📦 Categories found:', categories?.length)
    console.log('Categories:', categories)

    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*, categories(name)')
      .limit(3)

    if (prodError) throw prodError

    console.log('📦 Products found:', products?.length)
    console.log('Products:', products)

    return { success: true, categories, products }
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message)
    return { success: false, error: error.message }
  }
}
