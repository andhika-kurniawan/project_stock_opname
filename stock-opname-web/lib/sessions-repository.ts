import { createClient } from './supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export interface ActiveSession {
  id: string
  session_code: string
  category_id: string
  category_name: string
  user_id: string | null
  officer_name: string
  officer_username: string
  status: 'active' | 'completed' | 'cancelled'
  start_time: string
  end_time?: string | null
  total_items: number
  counted_items: number
  notes?: string | null
  items: SessionItem[]
}

export interface SessionItem {
  id: string
  session_id: string
  product_id?: string
  barcode: string
  name: string
  category: string
  shelf_location?: string | null
  system_stock: number
  physical_stock: number | null
  variance: number | null
  is_counted: boolean
  counted_at: string | null
  user: string
  counted_by_id?: string | null
}

export interface MasterCategory {
  id: string
  name: string
  description?: string
}

export interface DbSessionRecord {
  id: string
  session_code: string
  category_id: string
  user_id: string | null
  status: string
  start_time: string
  end_time: string | null
  total_items: number
  counted_items: number
  notes: string | null
  categories?: { name?: string } | null
  users?: { full_name?: string } | null
}

export interface DbItemRecord {
  id: string
  session_id: string
  product_id: string
  system_stock: number
  physical_stock: number | null
  variance: number | null
  is_counted: boolean
  counted_at?: string | null
  products?: { barcode?: string; name?: string } | null
}

export interface MasterOfficer {
  id: string
  full_name: string
  username: string
  role: string
}

// Master Sample Products by Category to initialize items if products table is empty
const SAMPLE_PRODUCTS_BY_CATEGORY: Record<string, { barcode: string; name: string; shelf_location: string; system_stock: number }[]> = {
  'Makanan Ringan & Biskuit': [
    { barcode: '8992761234801', name: 'Oreo Vanilla Sandwich 133g', shelf_location: 'B-01-01', system_stock: 120 },
    { barcode: '8992761234802', name: 'Roma Biskuit Kelapa 300g', shelf_location: 'B-01-02', system_stock: 85 },
    { barcode: '8992761234803', name: 'Tango Wafer Cokelat 130g', shelf_location: 'B-02-01', system_stock: 150 },
    { barcode: '8992761234804', name: 'Chitato Sapi Panggang 68g', shelf_location: 'B-03-01', system_stock: 95 },
    { barcode: '8992761234805', name: 'Pocky Chocolate Stick 47g', shelf_location: 'B-03-02', system_stock: 110 },
    { barcode: '8992761234806', name: 'Khong Guan Assorted Biscuits 650g', shelf_location: 'B-04-01', system_stock: 40 }
  ],
  'Minuman & Dairy Chiller': [
    { barcode: '8992761234901', name: 'Ultra Milk Cokelat 1000ml', shelf_location: 'D-01-01', system_stock: 200 },
    { barcode: '8992761234902', name: 'Aqua Air Mineral 600ml', shelf_location: 'D-02-01', system_stock: 480 },
    { barcode: '8992761234903', name: 'Teh Botol Sosro Kotak 250ml', shelf_location: 'D-02-02', system_stock: 240 },
    { barcode: '8992761234904', name: 'Yakult Minuman Fermentasi 5x65ml', shelf_location: 'D-03-01', system_stock: 90 },
    { barcode: '8992761234905', name: 'Pocari Sweat Ion Drink 500ml', shelf_location: 'D-04-01', system_stock: 130 },
    { barcode: '8992761234906', name: 'Greenfields Fresh Milk Pasteurisasi 1L', shelf_location: 'D-05-01', system_stock: 65 }
  ],
  'Sembako & Minyak Goreng': [
    { barcode: '8992761234501', name: 'Minyak Goreng Sania 2L', shelf_location: 'A-01-01', system_stock: 140 },
    { barcode: '8992761234502', name: 'Beras Ramos Super 5kg', shelf_location: 'A-02-01', system_stock: 90 },
    { barcode: '8992761234503', name: 'Gula Pasir Gulaku Putih 1kg', shelf_location: 'A-03-01', system_stock: 210 },
    { barcode: '8992761234504', name: 'Tepung Terigu Segitiga Biru 1kg', shelf_location: 'A-04-01', system_stock: 125 }
  ],
  'Bumbu Dapur & Saus Kemasan': [
    { barcode: '8992761234601', name: 'Kecap Manis Bango Botol 520ml', shelf_location: 'B-12-01', system_stock: 80 },
    { barcode: '8992761234602', name: 'Saus Sambal Asli ABC 335ml', shelf_location: 'B-13-02', system_stock: 95 },
    { barcode: '8992761234603', name: 'Royco Kaldu Sapi 230g', shelf_location: 'B-14-01', system_stock: 250 },
    { barcode: '8992761234605', name: 'Garam Dapur Beriodium 250g', shelf_location: 'B-16-01', system_stock: 310 }
  ],
  'Perawatan Tubuh & Sabun Mandi': [
    { barcode: '8992761234701', name: 'Sabun Mandi Lifebuoy Total 10 85g', shelf_location: 'C-04-01', system_stock: 150 },
    { barcode: '8992761234702', name: 'Shampo Pantene Anti Dandruff 290ml', shelf_location: 'C-05-02', system_stock: 65 },
    { barcode: '8992761234703', name: 'Pasta Gigi Pepsodent 190g', shelf_location: 'C-06-01', system_stock: 180 }
  ]
}

const DEFAULT_CATEGORIES: MasterCategory[] = [
  { id: 'cat-004', name: 'Makanan Ringan & Biskuit', description: 'Snack, biskuit, wafer, cokelat, dan permen' },
  { id: 'cat-005', name: 'Minuman & Dairy Chiller', description: 'Air mineral, susu, teh kemasan, dan jus' },
  { id: 'cat-001', name: 'Sembako & Minyak Goreng', description: 'Beras, minyak goreng, gula, dan tepung' },
  { id: 'cat-002', name: 'Bumbu Dapur & Saus Kemasan', description: 'Kecap, saus, kaldu instan, dan garam' },
  { id: 'cat-003', name: 'Perawatan Tubuh & Sabun Mandi', description: 'Sabun mandi, shampo, dan pasta gigi' }
]

const DEFAULT_OFFICERS: MasterOfficer[] = [
  { id: 'user-001', full_name: 'Rizky Firmansyah', username: 'rizky.so', role: 'staff' },
  { id: 'user-002', full_name: 'Anita Wijaya', username: 'anita.ops', role: 'staff' },
  { id: 'user-003', full_name: 'Budi Santoso', username: 'budi.so', role: 'staff' },
  { id: 'user-004', full_name: 'Siti Maryam', username: 'siti.so', role: 'staff' },
  { id: 'user-005', full_name: 'Aditya R.', username: 'aditya.admin', role: 'admin' }
]

const INITIAL_ACTIVE_SESSIONS: ActiveSession[] = [
  {
    id: 'act-sess-001',
    session_code: 'SO-20261027-0104',
    category_id: 'cat-004',
    category_name: 'Makanan Ringan & Biskuit',
    user_id: 'user-001',
    officer_name: 'Rizky Firmansyah',
    officer_username: 'rizky.so',
    status: 'active',
    start_time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    total_items: 6,
    counted_items: 4,
    notes: 'Monitoring sesi opname rak display biskuit lorong 4',
    items: [
      {
        id: 'item-act-101',
        session_id: 'act-sess-001',
        barcode: '8992761234801',
        name: 'Oreo Vanilla Sandwich 133g',
        category: 'Makanan Ringan & Biskuit',
        shelf_location: 'B-01-01',
        system_stock: 120,
        physical_stock: 120,
        variance: 0,
        is_counted: true,
        counted_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        user: 'Rizky Firmansyah',
        counted_by_id: 'user-001'
      },
      {
        id: 'item-act-102',
        session_id: 'act-sess-001',
        barcode: '8992761234802',
        name: 'Roma Biskuit Kelapa 300g',
        category: 'Makanan Ringan & Biskuit',
        shelf_location: 'B-01-02',
        system_stock: 85,
        physical_stock: 83,
        variance: -2,
        is_counted: true,
        counted_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        user: 'Rizky Firmansyah',
        counted_by_id: 'user-001'
      },
      {
        id: 'item-act-103',
        session_id: 'act-sess-001',
        barcode: '8992761234803',
        name: 'Tango Wafer Cokelat 130g',
        category: 'Makanan Ringan & Biskuit',
        shelf_location: 'B-02-01',
        system_stock: 150,
        physical_stock: 153,
        variance: 3,
        is_counted: true,
        counted_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        user: 'Rizky Firmansyah',
        counted_by_id: 'user-001'
      },
      {
        id: 'item-act-104',
        session_id: 'act-sess-001',
        barcode: '8992761234804',
        name: 'Chitato Sapi Panggang 68g',
        category: 'Makanan Ringan & Biskuit',
        shelf_location: 'B-03-01',
        system_stock: 95,
        physical_stock: 95,
        variance: 0,
        is_counted: true,
        counted_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        user: 'Rizky Firmansyah',
        counted_by_id: 'user-001'
      },
      {
        id: 'item-act-105',
        session_id: 'act-sess-001',
        barcode: '8992761234805',
        name: 'Pocky Chocolate Stick 47g',
        category: 'Makanan Ringan & Biskuit',
        shelf_location: 'B-03-02',
        system_stock: 110,
        physical_stock: null,
        variance: null,
        is_counted: false,
        counted_at: null,
        user: '-'
      },
      {
        id: 'item-act-106',
        session_id: 'act-sess-001',
        barcode: '8992761234806',
        name: 'Khong Guan Assorted Biscuits 650g',
        category: 'Makanan Ringan & Biskuit',
        shelf_location: 'B-04-01',
        system_stock: 40,
        physical_stock: null,
        variance: null,
        is_counted: false,
        counted_at: null,
        user: '-'
      }
    ]
  },
  {
    id: 'act-sess-002',
    session_code: 'SO-20261027-0208',
    category_id: 'cat-005',
    category_name: 'Minuman & Dairy Chiller',
    user_id: 'user-004',
    officer_name: 'Siti Maryam',
    officer_username: 'siti.so',
    status: 'active',
    start_time: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    total_items: 6,
    counted_items: 2,
    notes: 'Sesi opname chiller susu pasteurisasi dan minuman dingin',
    items: [
      {
        id: 'item-act-201',
        session_id: 'act-sess-002',
        barcode: '8992761234901',
        name: 'Ultra Milk Cokelat 1000ml',
        category: 'Minuman & Dairy Chiller',
        shelf_location: 'D-01-01',
        system_stock: 200,
        physical_stock: 200,
        variance: 0,
        is_counted: true,
        counted_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        user: 'Siti Maryam',
        counted_by_id: 'user-004'
      },
      {
        id: 'item-act-202',
        session_id: 'act-sess-002',
        barcode: '8992761234902',
        name: 'Aqua Air Mineral 600ml',
        category: 'Minuman & Dairy Chiller',
        shelf_location: 'D-02-01',
        system_stock: 480,
        physical_stock: 475,
        variance: -5,
        is_counted: true,
        counted_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        user: 'Siti Maryam',
        counted_by_id: 'user-004'
      },
      {
        id: 'item-act-203',
        session_id: 'act-sess-002',
        barcode: '8992761234903',
        name: 'Teh Botol Sosro Kotak 250ml',
        category: 'Minuman & Dairy Chiller',
        shelf_location: 'D-02-02',
        system_stock: 240,
        physical_stock: null,
        variance: null,
        is_counted: false,
        counted_at: null,
        user: '-'
      },
      {
        id: 'item-act-204',
        session_id: 'act-sess-002',
        barcode: '8992761234904',
        name: 'Yakult Minuman Fermentasi 5x65ml',
        category: 'Minuman & Dairy Chiller',
        shelf_location: 'D-03-01',
        system_stock: 90,
        physical_stock: null,
        variance: null,
        is_counted: false,
        counted_at: null,
        user: '-'
      },
      {
        id: 'item-act-205',
        session_id: 'act-sess-002',
        barcode: '8992761234905',
        name: 'Pocari Sweat Ion Drink 500ml',
        category: 'Minuman & Dairy Chiller',
        shelf_location: 'D-04-01',
        system_stock: 130,
        physical_stock: null,
        variance: null,
        is_counted: false,
        counted_at: null,
        user: '-'
      },
      {
        id: 'item-act-206',
        session_id: 'act-sess-002',
        barcode: '8992761234906',
        name: 'Greenfields Fresh Milk Pasteurisasi 1L',
        category: 'Minuman & Dairy Chiller',
        shelf_location: 'D-05-01',
        system_stock: 65,
        physical_stock: null,
        variance: null,
        is_counted: false,
        counted_at: null,
        user: '-'
      }
    ]
  }
]

const DATA_DIR = path.join(process.cwd(), '.data')
const ACTIVE_SESSIONS_FILE = path.join(DATA_DIR, 'active_sessions.json')
const COMPLETED_SESSIONS_FILE = path.join(DATA_DIR, 'completed_sessions.json')

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    } catch {
      // Ignore
    }
  }
  if (!fs.existsSync(ACTIVE_SESSIONS_FILE)) {
    try {
      fs.writeFileSync(ACTIVE_SESSIONS_FILE, JSON.stringify(INITIAL_ACTIVE_SESSIONS, null, 2), 'utf-8')
    } catch {
      // Ignore
    }
  }
}

function readLocalActiveSessions(): ActiveSession[] {
  try {
    ensureDataFiles()
    if (fs.existsSync(ACTIVE_SESSIONS_FILE)) {
      const data = fs.readFileSync(ACTIVE_SESSIONS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.warn('Could not read local active sessions:', err)
  }
  return INITIAL_ACTIVE_SESSIONS
}

function writeLocalActiveSessions(sessions: ActiveSession[]) {
  try {
    ensureDataFiles()
    fs.writeFileSync(ACTIVE_SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8')
  } catch (err) {
    console.warn('Could not write local active sessions:', err)
  }
}

export class SessionsRepository {
  /**
   * Get all currently active stock opname sessions
   */
  static async getActiveSessions() {
    let sessions: ActiveSession[] = []

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('so_sessions')
        .select(`
          id,
          session_code,
          category_id,
          user_id,
          status,
          start_time,
          end_time,
          total_items,
          counted_items,
          notes,
          categories:category_id (name),
          users:user_id (full_name, username)
        `)
        .eq('status', 'active')
        .order('start_time', { ascending: false })

      if (!error && data) {
        sessions = (data as unknown as Array<{
          id: string
          session_code: string
          category_id: string
          categories?: { name?: string } | null
          user_id: string | null
          users?: { full_name?: string; username?: string } | null
          status: string
          start_time: string
          end_time: string | null
          total_items: number
          counted_items: number
          notes: string | null
        }>).map(s => {
          const isUnassigned = !s.user_id || s.notes?.includes('[Petugas: Terbuka/Belum Ditugaskan]')
          return {
            id: s.id,
            session_code: s.session_code,
            category_id: s.category_id,
            category_name: s.categories?.name || 'Kategori Umum',
            user_id: isUnassigned ? null : s.user_id,
            officer_name: isUnassigned ? 'Belum Ditugaskan' : (s.users?.full_name || 'Petugas SO'),
            officer_username: isUnassigned ? '-' : (s.users?.username || 'officer'),
            status: 'active',
            start_time: s.start_time,
            end_time: s.end_time,
            total_items: s.total_items || 0,
            counted_items: s.counted_items || 0,
            notes: s.notes,
            items: []
          }
        })
      } else {
        sessions = readLocalActiveSessions()
      }
    } catch {
      sessions = readLocalActiveSessions()
    }

    const totalActive = sessions.length
    const totalCountedItems = sessions.reduce((acc, s) => acc + s.counted_items, 0)
    const totalItemsCount = sessions.reduce((acc, s) => acc + s.total_items, 0)
    const overallProgress = totalItemsCount > 0 ? Math.round((totalCountedItems / totalItemsCount) * 100) : 0

    return {
      sessions,
      stats: {
        totalActive,
        totalCountedItems,
        totalItemsCount,
        overallProgress
      }
    }
  }

  /**
   * Get all items for an active session
   */
  static async getSessionItems(sessionId: string): Promise<SessionItem[]> {
    try {
      const supabase = createClient()
      let resolvedId = sessionId
      if (sessionId.startsWith('SO-') || !sessionId.includes('-') || sessionId.length < 32) {
        const { data: sRow } = await supabase
          .from('so_sessions')
          .select('id')
          .or(`id.eq.${sessionId},session_code.eq.${sessionId}`)
          .maybeSingle()
        if (sRow && (sRow as { id: string }).id) {
          resolvedId = (sRow as { id: string }).id
        }
      }

      const { data, error } = await supabase
        .from('so_items')
        .select(`
          id,
          session_id,
          product_id,
          system_stock,
          physical_stock,
          variance,
          is_counted,
          counted_at,
          products:product_id (barcode, name, shelf_location, categories:category_id (name)),
          users:counted_by (full_name)
        `)
        .eq('session_id', resolvedId)
        .order('counted_at', { ascending: false })

      if (!error && data && data.length > 0) {
        return (data as unknown as Array<{
          id: string
          session_id: string
          product_id: string
          system_stock: number
          physical_stock: number | null
          variance: number | null
          is_counted: boolean
          counted_at: string | null
          products?: { barcode?: string; name?: string; shelf_location?: string; categories?: { name?: string } | null } | null
          users?: { full_name?: string } | null
        }>).map(item => ({
          id: item.id,
          session_id: item.session_id,
          product_id: item.product_id,
          barcode: item.products?.barcode || '-',
          name: item.products?.name || '-',
          category: item.products?.categories?.name || '-',
          shelf_location: item.products?.shelf_location || '-',
          system_stock: item.system_stock,
          physical_stock: item.physical_stock,
          variance: item.variance,
          is_counted: item.is_counted,
          counted_at: item.counted_at,
          user: item.users?.full_name || '-'
        }))
      }

      // If session exists in Supabase but has no so_items yet, auto-populate from category products
      if (!error && (!data || data.length === 0)) {
        const { data: sessRow } = await supabase
          .from('so_sessions')
          .select('id, category_id')
          .eq('id', resolvedId)
          .maybeSingle()

        if (sessRow && (sessRow as { category_id?: string }).category_id) {
          const catId = (sessRow as { category_id: string }).category_id
          const { data: rawProds } = await supabase
            .from('products')
            .select('id, barcode, name, system_stock, shelf_location, categories:category_id (name)')
            .eq('category_id', catId)

          const prods = (rawProds ?? []) as Array<{
            id: string
            barcode: string
            name: string
            system_stock: number
            shelf_location?: string
            categories?: { name?: string } | null
          }>

          if (prods.length > 0) {
            const toInsert = prods.map(p => ({
              session_id: resolvedId,
              product_id: p.id,
              system_stock: p.system_stock,
              physical_stock: null,
              is_counted: false
            }))
            const { data: inserted } = await (supabase.from('so_items') as any).insert(toInsert).select()
            await (supabase.from('so_sessions') as any).update({ total_items: toInsert.length }).eq('id', resolvedId)

            const insertedList = (inserted ?? []) as Array<{ id: string; product_id: string }>
            return prods.map(p => {
              const matched = insertedList.find(i => i.product_id === p.id)
              return {
                id: matched?.id || p.id,
                session_id: resolvedId,
                product_id: p.id,
                barcode: p.barcode,
                name: p.name,
                category: (p.categories as { name?: string })?.name || '-',
                shelf_location: p.shelf_location || '-',
                system_stock: p.system_stock,
                physical_stock: null,
                variance: null,
                is_counted: false,
                counted_at: null,
                user: '-'
              }
            })
          }
        }
      }
    } catch {
      // Fallback to local
    }

    const localSessions = readLocalActiveSessions()
    const session = localSessions.find(s => s.id === sessionId || s.session_code === sessionId)
    return session ? session.items : []
  }

  /**
   * Create a new SO session
   */
  static async createSession(payload: {
    category_id: string
    category_name?: string
    user_id?: string | null
    officer_name?: string | null
    start_time?: string
    notes?: string
  }): Promise<ActiveSession> {
    const supabase = createClient() as unknown as SupabaseClient

    // 1. Resolve Category
    let categoryId = payload.category_id
    let categoryName = payload.category_name || ''

    try {
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name')
        .or(`id.eq.${payload.category_id},name.eq.${payload.category_name || ''}`)
        .maybeSingle()
      if (catData) {
        categoryId = (catData as { id: string; name: string }).id
        categoryName = (catData as { id: string; name: string }).name
      }
    } catch {
      // Ignore
    }

    if (!categoryName) {
      const localCat = DEFAULT_CATEGORIES.find(c => c.id === categoryId || c.name === payload.category_name)
      categoryName = localCat?.name || payload.category_name || 'Kategori Umum'
    }

    // 2. Resolve Officer (Truly Optional)
    let userId: string | null = null
    let officerName = 'Belum Ditugaskan'
    let officerUsername = '-'

    if (payload.user_id && payload.user_id.trim() !== '') {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, username')
          .eq('id', payload.user_id)
          .maybeSingle()
        if (userData) {
          userId = (userData as { id: string; full_name: string; username: string }).id
          officerName = (userData as { id: string; full_name: string; username: string }).full_name
          officerUsername = (userData as { id: string; full_name: string; username: string }).username
        }
      } catch {
        // Fallback
      }
      if (!userId) {
        const localOff = DEFAULT_OFFICERS.find(o => o.id === payload.user_id)
        if (localOff) {
          userId = localOff.id
          officerName = localOff.full_name
          officerUsername = localOff.username
        }
      }
    }

    // 3. Resolve products for this category
    let productItems: Array<{ id: string; barcode: string; name: string; shelf_location: string; system_stock: number }> = []

    try {
      const { data: dbProds } = await supabase
        .from('products')
        .select('id, barcode, name, shelf_location, system_stock')
        .eq('category_id', categoryId)
      if (dbProds && dbProds.length > 0) {
        productItems = dbProds as typeof productItems
      }
    } catch {
      // Ignore
    }

    if (productItems.length === 0) {
      const sample = SAMPLE_PRODUCTS_BY_CATEGORY[categoryName] || SAMPLE_PRODUCTS_BY_CATEGORY['Makanan Ringan & Biskuit'] || []
      productItems = sample.map((p, idx) => ({
        id: `prod-${Date.now()}-${idx}`,
        barcode: p.barcode,
        name: p.name,
        shelf_location: p.shelf_location,
        system_stock: p.system_stock
      }))
    }

    // 4. Generate session code format: SO-YYYYMMDD-XXXX
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const randStr = Math.floor(1000 + Math.random() * 9000).toString()
    const sessionCode = `SO-${dateStr}-${randStr}`

    // 5. Try Supabase insert
    let dbSession: { id: string; session_code: string } | null = null
    const baseNotes = payload.notes || `Sesi stock opname ${categoryName}`
    let isFallbackUnassigned = false

    try {
      const { data: sessData, error: sessErr } = await supabase
        .from('so_sessions')
        .insert({
          session_code: sessionCode,
          category_id: categoryId,
          user_id: userId,
          status: 'active',
          start_time: payload.start_time || new Date().toISOString(),
          total_items: productItems.length,
          counted_items: 0,
          notes: baseNotes
        })
        .select()
        .single()

      if (sessErr && (sessErr as { code?: string }).code === '23502') {
        // Fallback if public.so_sessions.user_id still has NOT NULL constraint
        const { data: adminUser } = await supabase
          .from('users')
          .select('id, full_name, username')
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle()

        if (adminUser) {
          const fallbackUserId = (adminUser as { id: string }).id
          const taggedNotes = (baseNotes ? baseNotes + ' ' : '') + '[Petugas: Terbuka/Belum Ditugaskan]'
          const { data: retryData, error: retryErr } = await supabase
            .from('so_sessions')
            .insert({
              session_code: sessionCode,
              category_id: categoryId,
              user_id: fallbackUserId,
              status: 'active',
              start_time: payload.start_time || new Date().toISOString(),
              total_items: productItems.length,
              counted_items: 0,
              notes: taggedNotes
            })
            .select()
            .single()

          if (!retryErr && retryData) {
            dbSession = retryData as { id: string; session_code: string }
            isFallbackUnassigned = true
          }
        }
      } else if (!sessErr && sessData) {
        dbSession = sessData as { id: string; session_code: string }
      }
    } catch (e) {
      console.warn('Supabase session insert caught error:', e)
    }

    // 6. Populate so_items in Supabase
    if (dbSession) {
      try {
        if (productItems.length > 0) {
          const soItemsToInsert = productItems.map(p => ({
            session_id: dbSession!.id,
            product_id: p.id,
            system_stock: p.system_stock,
            physical_stock: null,
            is_counted: false
          }))
          await supabase.from('so_items').insert(soItemsToInsert)
        }

        // Log audit
        await supabase.from('audit_logs').insert({
          action: 'SESSION_CREATED',
          entity_type: 'SO_SESSION',
          entity_id: sessionCode,
          after_value: {
            session_code: sessionCode,
            category: categoryName,
            officer: isFallbackUnassigned || !userId ? 'Belum Ditugaskan' : officerName
          }
        })
      } catch (err) {
        console.warn('Error creating so_items in Supabase:', err)
      }
    }

    const finalSessionId = dbSession ? dbSession.id : `sess-${Date.now()}`
    const finalItems: SessionItem[] = productItems.map((p, idx) => ({
      id: `item-${finalSessionId}-${idx}`,
      session_id: finalSessionId,
      product_id: p.id,
      barcode: p.barcode,
      name: p.name,
      category: categoryName,
      shelf_location: p.shelf_location || '-',
      system_stock: p.system_stock,
      physical_stock: null,
      variance: null,
      is_counted: false,
      counted_at: null,
      user: '-'
    }))

    const newSession: ActiveSession = {
      id: finalSessionId,
      session_code: sessionCode,
      category_id: categoryId,
      category_name: categoryName,
      user_id: isFallbackUnassigned ? null : userId,
      officer_name: isFallbackUnassigned || !userId ? 'Belum Ditugaskan' : officerName,
      officer_username: isFallbackUnassigned || !userId ? '-' : officerUsername,
      status: 'active',
      start_time: payload.start_time || new Date().toISOString(),
      total_items: finalItems.length,
      counted_items: 0,
      notes: isFallbackUnassigned ? (baseNotes + ' [Petugas: Terbuka/Belum Ditugaskan]') : baseNotes,
      items: finalItems
    }

    // Save to local store
    const local = readLocalActiveSessions()
    local.unshift(newSession)
    writeLocalActiveSessions(local)

    return newSession
  }

  /**
   * Update physical count of an item in an active session
   */
  static async updateItemScan(sessionId: string, itemId: string, physicalCount: number, officerName = 'Petugas SO') {
    const supabase = createClient() as unknown as SupabaseClient

    // 1. Try finding and updating in Supabase first
    let dbItem: DbItemRecord | null = null

    try {
      const { data } = await supabase
        .from('so_items')
        .select(`
          id, session_id, product_id, system_stock, physical_stock, variance, is_counted,
          products:product_id (barcode, name)
        `)
        .eq('id', itemId)
        .maybeSingle()

      if (data) dbItem = data as unknown as DbItemRecord
    } catch {
      // ignore
    }

    if (dbItem) {
      const variance = physicalCount - dbItem.system_stock
      const countedAt = new Date().toISOString()

      await supabase
        .from('so_items')
        .update({
          physical_stock: physicalCount,
          variance,
          is_counted: true,
          counted_at: countedAt
        })
        .eq('id', dbItem.id)

      const { count: countedCount } = await supabase
        .from('so_items')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', dbItem.session_id)
        .eq('is_counted', true)

      if (countedCount !== null) {
        await supabase
          .from('so_sessions')
          .update({ counted_items: countedCount })
          .eq('id', dbItem.session_id)
      }

      await supabase.from('audit_logs').insert({
        action: 'ITEM_SCANNED',
        entity_type: 'so_items',
        entity_id: dbItem.products?.barcode || dbItem.id,
        after_value: {
          item_id: dbItem.id,
          barcode: dbItem.products?.barcode,
          name: dbItem.products?.name,
          system_stock: dbItem.system_stock,
          physical_stock: physicalCount,
          variance,
          officer: officerName
        }
      })

      // Also sync to local active sessions if exists
      const localSessions = readLocalActiveSessions()
      const locSess = localSessions.find(s => s.id === sessionId || s.session_code === sessionId || s.id === dbItem?.session_id)
      if (locSess) {
        const locItem = locSess.items.find(i => i.id === itemId || i.barcode === dbItem?.products?.barcode)
        if (locItem) {
          locItem.physical_stock = physicalCount
          locItem.variance = variance
          locItem.is_counted = true
          locItem.counted_at = countedAt
          locItem.user = officerName
          locSess.counted_items = locSess.items.filter(i => i.is_counted).length
          writeLocalActiveSessions(localSessions)
        }
      }

      return {
        item: {
          id: dbItem.id,
          session_id: dbItem.session_id,
          name: dbItem.products?.name || 'Item',
          barcode: dbItem.products?.barcode || '',
          system_stock: dbItem.system_stock,
          physical_stock: physicalCount,
          variance,
          is_counted: true,
          counted_at: countedAt,
          user: officerName
        },
        session: { id: dbItem.session_id, counted_items: countedCount ?? 1 }
      }
    }

    // 2. Fall back to local active sessions
    const localSessions = readLocalActiveSessions()
    const session = localSessions.find(s => s.id === sessionId || s.session_code === sessionId)
    if (!session) throw new Error('Sesi tidak ditemukan')

    const item = session.items.find(i => i.id === itemId || i.barcode === itemId)
    if (!item) throw new Error('Item tidak ditemukan pada sesi ini')

    const prevCounted = item.is_counted
    item.physical_stock = physicalCount
    item.variance = physicalCount - item.system_stock
    item.is_counted = true
    item.counted_at = new Date().toISOString()
    item.user = officerName

    if (!prevCounted) {
      session.counted_items = session.items.filter(i => i.is_counted).length
    }

    writeLocalActiveSessions(localSessions)

    return { item, session }
  }

  /**
   * Complete active session and move to completed history
   */
  static async completeSession(sessionId: string) {
    const supabase = createClient() as unknown as SupabaseClient

    // 1. Try finding in Supabase first
    let dbSession: DbSessionRecord | null = null

    try {
      const { data } = await supabase
        .from('so_sessions')
        .select(`
          id, session_code, category_id, user_id, status, start_time, end_time, total_items, counted_items, notes,
          categories:category_id (name),
          users:user_id (full_name)
        `)
        .or(`id.eq.${sessionId},session_code.eq.${sessionId}`)
        .maybeSingle()

      if (data) {
        dbSession = data as unknown as DbSessionRecord
      }
    } catch {
      // Supabase query error
    }

    if (dbSession) {
      const endTime = new Date().toISOString()

      // Update session status in Supabase
      await supabase
        .from('so_sessions')
        .update({ status: 'completed', end_time: endTime })
        .eq('id', dbSession.id)

      // Fetch items for variance and accuracy calculation
      const { data: dbItems } = await supabase
        .from('so_items')
        .select(`
          id, session_id, product_id, system_stock, physical_stock, variance, is_counted, counted_at, counted_by,
          products:product_id (barcode, name, shelf_location, categories:category_id (name)),
          users:counted_by (full_name)
        `)
        .eq('session_id', dbSession.id)

      const items = (dbItems ?? []) as unknown as Array<{
        id: string
        session_id: string
        product_id: string
        system_stock: number
        physical_stock: number | null
        variance: number | null
        is_counted: boolean
        counted_at: string | null
        products?: { barcode?: string; name?: string; shelf_location?: string; categories?: { name?: string } | null } | null
        users?: { full_name?: string } | null
      }>

      const totalUnitsVerified = items.reduce((acc, i) => acc + (i.physical_stock || 0), 0)
      const netVariance = items.reduce((acc, i) => acc + (i.variance || 0), 0)
      const matchedCount = items.filter(i => i.is_counted && i.variance === 0).length
      const accuracyPct = items.length > 0 ? Math.round((matchedCount / items.length) * 100) : 100

      // Log to audit_logs
      await supabase.from('audit_logs').insert({
        action: 'SESSION_COMPLETED',
        entity_type: 'so_sessions',
        entity_id: dbSession.session_code,
        after_value: {
          session_code: dbSession.session_code,
          status: 'completed',
          end_time: endTime,
          total_items: items.length || dbSession.total_items,
          counted_items: dbSession.counted_items,
          accuracy_pct: accuracyPct,
          variance_units: netVariance
        }
      })

      // Also clean up local active sessions if present
      const localSessions = readLocalActiveSessions()
      const localIdx = localSessions.findIndex(s => s.id === sessionId || s.session_code === sessionId)
      if (localIdx !== -1) {
        localSessions.splice(localIdx, 1)
        writeLocalActiveSessions(localSessions)
      }

      // Sync to completed_sessions.json so Riwayat & Audit Trail can display it immediately
      try {
        ensureDataFiles()
        let completed: Record<string, unknown>[] = []
        if (fs.existsSync(COMPLETED_SESSIONS_FILE)) {
          completed = JSON.parse(fs.readFileSync(COMPLETED_SESSIONS_FILE, 'utf-8'))
        }
        completed.unshift({
          id: dbSession.id,
          session_code: dbSession.session_code,
          category_id: dbSession.category_id,
          category_name: dbSession.categories?.name || 'Kategori Umum',
          zone_location: 'Zona Utama',
          status: 'Approved & Closed',
          start_time: dbSession.start_time,
          end_time: endTime,
          formatted_date: new Date(dbSession.start_time).toLocaleDateString('id-ID'),
          duration_str: '45m',
          officers: dbSession.users?.full_name || 'Petugas SO',
          officer_ids: [dbSession.user_id],
          total_sku: items.length || dbSession.total_items,
          counted_sku: dbSession.counted_items,
          accuracy_pct: accuracyPct,
          total_units_verified: totalUnitsVerified,
          variance_units: netVariance,
          variance_type: netVariance === 0 ? 'zero' : netVariance < 0 ? 'deficit' : 'surplus',
          financial_impact: netVariance * 15000,
          notes: dbSession.notes,
          icon_type: netVariance === 0 ? 'green' : netVariance < 0 ? 'red' : 'orange',
          items: items.map(i => ({
            id: i.id,
            barcode: i.products?.barcode || '-',
            product_name: i.products?.name || '-',
            category_name: i.products?.categories?.name || dbSession?.categories?.name || '-',
            shelf_location: i.products?.shelf_location || '-',
            system_stock: i.system_stock,
            physical_stock: i.physical_stock || 0,
            variance: i.variance || 0,
            variance_pct: 0,
            status: (i.variance || 0) === 0 ? 'Match' : (i.variance || 0) < 0 ? 'Defisit' : 'Surplus',
            counted_by: i.users?.full_name || '-',
            counted_at: i.counted_at,
            unit_price: 15000
          }))
        })
        fs.writeFileSync(COMPLETED_SESSIONS_FILE, JSON.stringify(completed, null, 2), 'utf-8')
      } catch (e) {
        console.warn('Could not sync completed_sessions.json:', e)
      }

      return {
        id: dbSession.id,
        session_code: dbSession.session_code,
        category_id: dbSession.category_id,
        category_name: dbSession.categories?.name || 'Kategori Umum',
        user_id: dbSession.user_id,
        officer_name: dbSession.users?.full_name || 'Petugas SO',
        officer_username: 'officer',
        status: 'completed',
        start_time: dbSession.start_time,
        end_time: endTime,
        total_items: items.length || dbSession.total_items,
        counted_items: dbSession.counted_items,
        notes: dbSession.notes,
        items: []
      }
    }

    // 2. Fall back to local active sessions
    const localSessions = readLocalActiveSessions()
    const index = localSessions.findIndex(s => s.id === sessionId || s.session_code === sessionId)
    if (index === -1) throw new Error('Sesi tidak ditemukan')

    const session = localSessions[index]
    session.status = 'completed'
    session.end_time = new Date().toISOString()

    // Remove from active
    localSessions.splice(index, 1)
    writeLocalActiveSessions(localSessions)

    // Calculate stats
    const totalUnitsVerified = session.items.reduce((acc, i) => acc + (i.physical_stock || 0), 0)
    const netVariance = session.items.reduce((acc, i) => acc + (i.variance || 0), 0)
    const matchedCount = session.items.filter(i => i.is_counted && i.variance === 0).length
    const accuracyPct = session.total_items > 0 ? Math.round((matchedCount / session.total_items) * 100) : 100

    // Add to completed_sessions.json
    try {
      ensureDataFiles()
      let completed: Record<string, unknown>[] = []
      if (fs.existsSync(COMPLETED_SESSIONS_FILE)) {
        completed = JSON.parse(fs.readFileSync(COMPLETED_SESSIONS_FILE, 'utf-8'))
      }
      completed.unshift({
        id: session.id,
        session_code: session.session_code,
        category_id: session.category_id,
        category_name: session.category_name,
        zone_location: 'Zona Utama',
        status: 'Approved & Closed',
        start_time: session.start_time,
        end_time: session.end_time,
        formatted_date: new Date(session.start_time).toLocaleDateString('id-ID'),
        duration_str: '1j 15m',
        officers: session.officer_name,
        officer_ids: [session.user_id],
        total_sku: session.total_items,
        counted_sku: session.counted_items,
        accuracy_pct: accuracyPct,
        total_units_verified: totalUnitsVerified,
        variance_units: netVariance,
        variance_type: netVariance === 0 ? 'zero' : netVariance < 0 ? 'deficit' : 'surplus',
        financial_impact: netVariance * 15000,
        notes: session.notes,
        icon_type: netVariance === 0 ? 'green' : netVariance < 0 ? 'red' : 'orange',
        items: session.items.map(i => ({
          id: i.id,
          barcode: i.barcode,
          product_name: i.name,
          category_name: i.category,
          shelf_location: i.shelf_location || '-',
          system_stock: i.system_stock,
          physical_stock: i.physical_stock || 0,
          variance: i.variance || 0,
          variance_pct: 0,
          status: (i.variance || 0) === 0 ? 'Match' : (i.variance || 0) < 0 ? 'Defisit' : 'Surplus',
          counted_by: i.user,
          counted_at: i.counted_at,
          unit_price: 15000
        }))
      })
      fs.writeFileSync(COMPLETED_SESSIONS_FILE, JSON.stringify(completed, null, 2), 'utf-8')
    } catch (e) {
      console.warn('Could not sync to completed_sessions:', e)
    }

    return session
  }

  /**
   * Cancel active session
   */
  static async cancelSession(sessionId: string) {
    const supabase = createClient() as unknown as SupabaseClient

    // 1. Try finding in Supabase first
    let dbSession: { id: string; session_code: string } | null = null
    try {
      const { data } = await supabase
        .from('so_sessions')
        .select('id, session_code')
        .or(`id.eq.${sessionId},session_code.eq.${sessionId}`)
        .maybeSingle()
      if (data) dbSession = data as { id: string; session_code: string }
    } catch {
      // ignore
    }

    if (dbSession) {
      const endTime = new Date().toISOString()
      await supabase
        .from('so_sessions')
        .update({ status: 'cancelled', end_time: endTime })
        .eq('id', dbSession.id)

      await supabase.from('audit_logs').insert({
        action: 'SESSION_CANCELLED',
        entity_type: 'so_sessions',
        entity_id: dbSession.session_code,
        after_value: { session_code: dbSession.session_code, status: 'cancelled', end_time: endTime }
      })

      const localSessions = readLocalActiveSessions()
      const localIdx = localSessions.findIndex(s => s.id === sessionId || s.session_code === sessionId)
      if (localIdx !== -1) {
        localSessions.splice(localIdx, 1)
        writeLocalActiveSessions(localSessions)
      }

      return { id: dbSession.id, session_code: dbSession.session_code, status: 'cancelled' }
    }

    // 2. Check local
    const localSessions = readLocalActiveSessions()
    const index = localSessions.findIndex(s => s.id === sessionId || s.session_code === sessionId)
    if (index === -1) throw new Error('Sesi tidak ditemukan')

    const session = localSessions[index]
    session.status = 'cancelled'
    session.end_time = new Date().toISOString()

    localSessions.splice(index, 1)
    writeLocalActiveSessions(localSessions)

    return session
  }

  /**
   * Get categories options
   */
  static async getCategories(): Promise<MasterCategory[]> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('categories').select('*').order('name')
      if (!error && data && data.length > 0) {
        return data as MasterCategory[]
      }
    } catch {
      // Fallback
    }
    return DEFAULT_CATEGORIES
  }

  /**
   * Get officers options
   */
  static async getOfficers(): Promise<MasterOfficer[]> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('users').select('id, full_name, username, role').order('full_name')
      if (!error && data && data.length > 0) {
        return data as MasterOfficer[]
      }
    } catch {
      // Fallback
    }
    return DEFAULT_OFFICERS
  }
}
