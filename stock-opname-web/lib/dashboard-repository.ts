import { createClient } from './supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// ============================================================
// Types
// ============================================================

export interface DashboardMetrics {
  totalProducts: number
  activeSessions: number
  itemsWithVariance: number
  netVariancePercent: number
  totalCountedItems: number
  totalMatchedItems: number
  accuracyRate: number
}

export interface DailyProgressItem {
  dayKey: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  dayName: string // 'Senin', 'Selasa', ...
  date: string // 'YYYY-MM-DD'
  formattedDate: string // '27 Okt'
  countedItems: number
  targetItems: number
  percentage: number // 0-100
  isToday: boolean
  isPast: boolean
}

export interface DistributionItem {
  id: string
  name: string // e.g. 'Makanan Ringan & Biskuit'
  rack: string // e.g. 'Rak B (B-01 s/d B-04)'
  shortName: string // e.g. 'Rak B'
  totalItems: number
  totalCounted: number
  matchCount: number
  varianceCount: number
  matchPercent: number // 0-100 relative to counted
  variancePercent: number // 0-100 relative to counted
  accuracyRate: number // 0-100
  status: 'perfect' | 'has_variance' | 'uncounted'
}

export interface RecentAuditItem {
  id: string
  barcode: string
  name: string
  category: string
  shelf_location: string
  system_stock: number
  physical_stock: number | null
  variance: number | null
  status: 'Cocok' | 'Surplus' | 'Defisit' | 'Belum Scan'
  user: string
  updated_at: string
}

export interface DashboardOverviewData {
  metrics: DashboardMetrics
  dailyProgress: DailyProgressItem[]
  distribution: DistributionItem[]
  recentItems: RecentAuditItem[]
  categories: { id: string; name: string }[]
  period: {
    label: string
    startDate: string
    endDate: string
    currentSessionCode: string
  }
}

// ============================================================
// Repository
// ============================================================

export class DashboardRepository {
  private static getSupabase(): SupabaseClient {
    return createClient() as unknown as SupabaseClient
  }

  /**
   * Mengambil semua data ringkasan dashboard overview
   */
  static async getOverview(categoryFilter?: string): Promise<DashboardOverviewData> {
    const supabase = this.getSupabase()

    // 1. Fetch Parallel Data from Supabase
    let productsCount = 0
    let activeSessionsCount = 0
    let itemsRows: Array<{
      id: string
      session_id: string
      product_id: string
      system_stock: number
      physical_stock: number | null
      variance: number | null
      is_counted: boolean
      counted_at: string | null
      updated_at?: string
      products?: {
        barcode?: string
        name?: string
        shelf_location?: string
        category_id?: string
        categories?: { id?: string; name?: string } | null
      } | null
      users?: { full_name?: string } | null
    }> = []

    let categoryList: Array<{ id: string; name: string }> = []
    let activeSessionCode = 'S03-P24'

    try {
      const [prodRes, sessRes, itemsRes, catRes, activeSessRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('so_sessions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase
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
            updated_at,
            products:product_id (barcode, name, shelf_location, category_id, categories:category_id (id, name)),
            users:counted_by (full_name)
          `)
          .order('updated_at', { ascending: false }),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('so_sessions').select('session_code').eq('status', 'active').limit(1).maybeSingle()
      ])

      productsCount = prodRes.count ?? 0
      activeSessionsCount = sessRes.count ?? 0
      if (activeSessRes.data?.session_code) {
        activeSessionCode = activeSessRes.data.session_code
      }

      if (itemsRes.data && itemsRes.data.length > 0) {
        itemsRows = itemsRes.data as unknown as typeof itemsRows
      }

      if (catRes.data && catRes.data.length > 0) {
        categoryList = catRes.data as { id: string; name: string }[]
      }
    } catch (e) {
      console.warn('DashboardRepository query fallback:', e)
    }

    // Fallback if database had empty rows (e.g. before initial database seeding)
    if (itemsRows.length === 0) {
      const fallback = this.loadLocalFallback()
      itemsRows = fallback.items
      if (productsCount === 0) productsCount = fallback.productsCount
      if (activeSessionsCount === 0) activeSessionsCount = fallback.activeSessionsCount
      if (categoryList.length === 0) categoryList = fallback.categories
    }

    // 2. Compute Summary Metrics
    let itemsWithVariance = 0
    let totalVarianceUnits = 0
    let totalSystemStock = 0
    let totalCounted = 0
    let totalMatched = 0

    itemsRows.forEach(item => {
      if (item.is_counted) {
        totalCounted++
        const v = item.variance ?? (item.physical_stock !== null ? item.physical_stock - item.system_stock : 0)
        if (v !== 0) {
          itemsWithVariance++
          totalVarianceUnits += Math.abs(v)
        } else {
          totalMatched++
        }
        totalSystemStock += item.system_stock || 0
      }
    })

    const netVariancePercent = totalSystemStock > 0 
      ? Number(((totalVarianceUnits / totalSystemStock) * 100).toFixed(1))
      : 0

    const accuracyRate = totalCounted > 0 
      ? Math.round((totalMatched / totalCounted) * 100)
      : 100

    const metrics: DashboardMetrics = {
      totalProducts: productsCount || itemsRows.length || 17,
      activeSessions: activeSessionsCount,
      itemsWithVariance,
      netVariancePercent,
      totalCountedItems: totalCounted,
      totalMatchedItems: totalMatched,
      accuracyRate
    }

    // 3. Compute Progress Opname Harian (Mon–Sun)
    const dailyProgress = this.calculateDailyProgress(itemsRows)

    // 4. Compute Distribusi Akurasi / Selisih (Kategori / Rak)
    const distribution = this.calculateDistribution(itemsRows)

    // 5. Recent SKU Items
    let filteredItems = itemsRows
    if (categoryFilter && categoryFilter !== 'all' && categoryFilter !== 'Filter Kategori') {
      filteredItems = filteredItems.filter(i => 
        i.products?.category_id === categoryFilter || 
        i.products?.categories?.name === categoryFilter ||
        i.products?.categories?.id === categoryFilter
      )
    }

    const recentItems: RecentAuditItem[] = filteredItems.slice(0, 10).map(item => {
      const v = item.variance
      let status: RecentAuditItem['status'] = 'Belum Scan'
      if (item.is_counted) {
        if (v === 0) status = 'Cocok'
        else if (v !== null && v > 0) status = 'Surplus'
        else if (v !== null && v < 0) status = 'Defisit'
      }

      return {
        id: item.id,
        barcode: item.products?.barcode || '-',
        name: item.products?.name || 'Produk SKU',
        category: item.products?.categories?.name || 'Umum',
        shelf_location: item.products?.shelf_location || '-',
        system_stock: item.system_stock,
        physical_stock: item.physical_stock,
        variance: item.variance,
        status,
        user: item.users?.full_name || 'Petugas Lapangan',
        updated_at: item.counted_at || item.updated_at || new Date().toISOString()
      }
    })

    // 6. Period Label
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(now.getDate() - 7)
    const period = {
      label: 'Gudang Utama • Rak 12-15',
      startDate: startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      endDate: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      currentSessionCode: activeSessionCode
    }

    return {
      metrics,
      dailyProgress,
      distribution,
      recentItems,
      categories: categoryList,
      period
    }
  }

  /**
   * Menghitung progress opname harian 7 hari (Mon - Sun)
   */
  private static calculateDailyProgress(items: Array<{ is_counted: boolean; counted_at: string | null }>): DailyProgressItem[] {
    const daysMeta: Array<{ key: DailyProgressItem['dayKey']; name: string; dayIndex: number }> = [
      { key: 'Mon', name: 'Senin', dayIndex: 1 },
      { key: 'Tue', name: 'Selasa', dayIndex: 2 },
      { key: 'Wed', name: 'Rabu', dayIndex: 3 },
      { key: 'Thu', name: 'Kamis', dayIndex: 4 },
      { key: 'Fri', name: 'Jumat', dayIndex: 5 },
      { key: 'Sat', name: 'Sabtu', dayIndex: 6 },
      { key: 'Sun', name: 'Minggu', dayIndex: 0 },
    ]

    const now = new Date()
    const todayDayIndex = now.getDay() // 0 = Sun, 1 = Mon, ...
    
    // Find the Monday of current week
    const currentMonday = new Date(now)
    const distanceToMonday = (todayDayIndex + 6) % 7
    currentMonday.setDate(now.getDate() - distanceToMonday)
    currentMonday.setHours(0, 0, 0, 0)

    // Aggregate counts by YYYY-MM-DD (local calendar date)
    const countsByDate = new Map<string, number>()
    const toDateKey = (dateObj: Date) => {
      const y = dateObj.getFullYear()
      const m = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    items.forEach(item => {
      if (item.is_counted && item.counted_at) {
        const itemDate = toDateKey(new Date(item.counted_at))
        countsByDate.set(itemDate, (countsByDate.get(itemDate) || 0) + 1)
      }
    })

    // Also count if item was verified today without counted_at
    const todayStr = toDateKey(now)
    const countedWithoutDate = items.filter(i => i.is_counted && !i.counted_at).length
    if (countedWithoutDate > 0) {
      countsByDate.set(todayStr, (countsByDate.get(todayStr) || 0) + countedWithoutDate)
    }

    // Build the 7 days
    const dailyList: DailyProgressItem[] = daysMeta.map((dm, idx) => {
      const d = new Date(currentMonday)
      d.setDate(currentMonday.getDate() + idx)
      const dateStr = toDateKey(d)
      const count = countsByDate.get(dateStr) || 0
      const isToday = d.toDateString() === now.toDateString()
      const isPast = d < now && !isToday

      // Formatted date string (e.g. "27 Okt")
      const formattedDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

      return {
        dayKey: dm.key,
        dayName: dm.name,
        date: dateStr,
        formattedDate,
        countedItems: count,
        targetItems: 25, // target opname harian
        percentage: 0,
        isToday,
        isPast
      }
    })

    // Calculate relative percentage
    const maxCount = Math.max(...dailyList.map(d => d.countedItems), 1)
    dailyList.forEach(d => {
      if (d.countedItems > 0) {
        // Proportionate height: minimum 30% for visibility, up to 95%
        d.percentage = Math.min(100, Math.max(30, Math.round((d.countedItems / maxCount) * 85) + 10))
      } else {
        d.percentage = 0
      }
    })

    return dailyList
  }

  /**
   * Menghitung distribusi akurasi / selisih berdasarkan Kategori / Rak
   */
  private static calculateDistribution(
    items: Array<{
      system_stock: number
      physical_stock: number | null
      variance: number | null
      is_counted: boolean
      products?: {
        name?: string
        shelf_location?: string
        category_id?: string
        categories?: { id?: string; name?: string } | null
      } | null
    }>
  ): DistributionItem[] {
    // Standard Racks / Categories
    const defaultRacks = [
      { id: 'rack-b', name: 'Makanan Ringan & Biskuit', rack: 'Rak B (B-01..)', shortName: 'Rak 12' },
      { id: 'rack-d', name: 'Minuman & Dairy Chiller', rack: 'Rak D (D-01..)', shortName: 'Rak 13' },
      { id: 'rack-a', name: 'Sembako & Minyak Goreng', rack: 'Rak A (A-01..)', shortName: 'Rak 14' },
      { id: 'rack-c', name: 'Bumbu Dapur & Saus', rack: 'Rak C (C-01..)', shortName: 'Rak 15' },
      { id: 'rack-e', name: 'Perawatan Tubuh & Sabun', rack: 'Rak E (E-01..)', shortName: 'Rak 16' },
    ]

    return defaultRacks.map(rackMeta => {
      // Find matching items by category name or shelf location
      const matchedItems = items.filter(i => {
        const catName = i.products?.categories?.name || ''
        const loc = i.products?.shelf_location || ''
        return (
          catName.toLowerCase().includes(rackMeta.name.toLowerCase().slice(0, 5)) ||
          loc.toUpperCase().startsWith(rackMeta.rack.charAt(4)) ||
          loc.includes(rackMeta.shortName)
        )
      })

      const totalItems = matchedItems.length
      const countedItems = matchedItems.filter(i => i.is_counted)
      const totalCounted = countedItems.length

      let matchCount = 0
      let varianceCount = 0

      countedItems.forEach(i => {
        const v = i.variance ?? (i.physical_stock !== null ? i.physical_stock - i.system_stock : 0)
        if (v === 0) {
          matchCount++
        } else {
          varianceCount++
        }
      })

      let matchPercent = 0
      let variancePercent = 0
      let accuracyRate = 100
      let status: DistributionItem['status'] = 'uncounted'

      if (totalCounted > 0) {
        matchPercent = Math.round((matchCount / totalCounted) * 100)
        variancePercent = 100 - matchPercent
        accuracyRate = matchPercent
        status = varianceCount > 0 ? 'has_variance' : 'perfect'
      }

      return {
        id: rackMeta.id,
        name: rackMeta.name,
        rack: rackMeta.rack,
        shortName: rackMeta.shortName,
        totalItems,
        totalCounted,
        matchCount,
        varianceCount,
        matchPercent,
        variancePercent,
        accuracyRate,
        status
      }
    })
  }

  /**
   * Local fallback data when Supabase is initializing or offline
   */
  private static loadLocalFallback() {
    const items: Array<{
      id: string
      session_id: string
      product_id: string
      system_stock: number
      physical_stock: number | null
      variance: number | null
      is_counted: boolean
      counted_at: string | null
      products?: {
        barcode?: string
        name?: string
        shelf_location?: string
        category_id?: string
        categories?: { id?: string; name?: string } | null
      } | null
      users?: { full_name?: string } | null
    }> = []
    const productsCount = 17
    let activeSessionsCount = 1
    const categories: Array<{ id: string; name: string }> = [
      { id: 'cat-001', name: 'Makanan Ringan & Biskuit' },
      { id: 'cat-002', name: 'Minuman & Dairy Chiller' },
      { id: 'cat-003', name: 'Sembako & Minyak Goreng' },
      { id: 'cat-004', name: 'Bumbu Dapur & Saus Kemasan' },
      { id: 'cat-005', name: 'Perawatan Tubuh & Sabun Mandi' }
    ]

    try {
      const activeFile = path.join(process.cwd(), '.data', 'active_sessions.json')
      if (fs.existsSync(activeFile)) {
        const raw = JSON.parse(fs.readFileSync(activeFile, 'utf-8')) as Array<{
          id: string
          category_id: string
          category_name: string
          officer_name?: string
          items?: Array<{
            id: string
            barcode?: string
            name?: string
            shelf_location?: string
            system_stock?: number
            physical_stock?: number | null
            variance?: number | null
            is_counted?: boolean
            counted_at?: string | null
            user?: string
          }>
        }>
        activeSessionsCount = raw.length
        raw.forEach(s => {
          if (s.items && Array.isArray(s.items)) {
            items.push(...s.items.map(i => ({
              id: i.id,
              session_id: s.id,
              product_id: i.id,
              system_stock: i.system_stock || 100,
              physical_stock: i.physical_stock ?? null,
              variance: i.variance ?? null,
              is_counted: Boolean(i.is_counted),
              counted_at: i.counted_at ?? null,
              products: {
                barcode: i.barcode,
                name: i.name,
                shelf_location: i.shelf_location || 'A-01-01',
                category_id: s.category_id,
                categories: { id: s.category_id, name: s.category_name }
              },
              users: { full_name: i.user || s.officer_name }
            })))
          }
        })
      }
    } catch {}

    return { items, productsCount, activeSessionsCount, categories }
  }
}
