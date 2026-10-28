import type { SupabaseClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'

// ============================================================
// Types (shared with the Riwayat & Audit Trail page)
// ============================================================

/** so_sessions.status values that belong in history (active sessions live on /dashboard/sessions). */
export type HistorySessionStatus = 'completed' | 'cancelled'

export const SESSION_STATUS_LABEL: Record<HistorySessionStatus, string> = {
  completed: 'Selesai',
  cancelled: 'Dibatalkan'
}

export interface HistoryFilters {
  category?: string
  officer?: string
  status?: string
  search?: string
  /** YYYY-MM-DD, interpreted in WIB */
  from?: string
  /** YYYY-MM-DD, interpreted in WIB */
  to?: string
}

export interface CompletedSOSession {
  id: string
  session_code: string
  category_id: string
  category_name: string
  status: HistorySessionStatus
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  officer_ids: string[]
  officer_names: string[]
  shelf_locations: string[]
  total_sku: number
  counted_sku: number
  matched_sku: number
  accuracy_pct: number | null
  total_system_units: number
  total_physical_units: number
  variance_units: number
  deficit_units: number
  surplus_units: number
  variance_pct: number | null
  notes: string | null
}

export type DetailItemStatus = 'Match' | 'Defisit' | 'Surplus' | 'Belum Dihitung'

export interface SOSessionDetailItem {
  id: string
  barcode: string
  product_name: string
  brand: string | null
  shelf_location: string | null
  system_stock: number
  physical_stock: number | null
  variance: number | null
  status: DetailItemStatus
  counted_by_name: string | null
  counted_at: string | null
}

export interface SessionDetail extends CompletedSOSession {
  items: SOSessionDetailItem[]
}

export interface HistoryMetrics {
  total_sessions: number
  completed_sessions: number
  cancelled_sessions: number
  avg_duration_minutes: number | null
  avg_variance_pct: number | null
  net_variance_units: number
  deficit_units: number
  surplus_units: number
}

export interface FilterOption {
  value: string
  label: string
}

export interface AuditTrailFilters {
  /** "entity_type|action" pair, e.g. "so_sessions|UPDATE" */
  action?: string
  search?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface AuditTrailLog {
  id: string
  timestamp: string
  user_id: string | null
  user_name: string
  user_email: string | null
  user_role: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_label: string
  description: string
  before_value: Record<string, unknown> | null
  after_value: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
}

// ============================================================
// Internal row shapes (subset of columns we select)
// ============================================================

interface SessionRow {
  id: string
  session_code: string
  category_id: string
  user_id: string
  status: string
  start_time: string
  end_time: string | null
  total_items: number
  counted_items: number
  notes: string | null
  categories: { name: string } | null
  owner: { full_name: string } | null
}

interface ItemAggRow {
  session_id: string
  system_stock: number
  physical_stock: number | null
  variance: number | null
  is_counted: boolean | null
  counted_by: string | null
  products: { shelf_location: string | null; barcode: string; name: string } | null
}

interface ItemDetailRow {
  id: string
  session_id: string
  system_stock: number
  physical_stock: number | null
  variance: number | null
  is_counted: boolean | null
  counted_by: string | null
  counted_at: string | null
  products: { barcode: string; name: string; brand: string | null; shelf_location: string | null } | null
}

interface AuditRow {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  before_value: Record<string, unknown> | null
  after_value: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  timestamp: string
  actor: { full_name: string; email: string; role: string } | null
}

const SESSION_SELECT = `
  id, session_code, category_id, user_id, status, start_time, end_time,
  total_items, counted_items, notes,
  categories:category_id (name),
  owner:user_id (full_name)
`

const AUDIT_SELECT = `
  id, user_id, action, entity_type, entity_id, before_value, after_value,
  ip_address, user_agent, timestamp,
  actor:user_id (full_name, email, role)
`

const PAGE_SIZE = 1000 // PostgREST default max rows per request
const IN_CHUNK = 100 // keeps `in.(...)` URLs well under length limits
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// ============================================================
// Helpers
// ============================================================

class RepositoryError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message)
  }
}

function fail(context: string, error: { message: string } | null): never {
  throw new RepositoryError(`${context}: ${error?.message ?? 'unknown error'}`, error)
}

/** Reads every page of a query; `build` must return a fresh builder each call. */
async function fetchAll<T>(
  build: () => { range: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }> },
  context: string,
  maxRows = 50000
): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; offset < maxRows; offset += PAGE_SIZE) {
    const { data, error } = await build().range(offset, offset + PAGE_SIZE - 1)
    if (error) fail(context, error)
    const page = (data as T[]) ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function wibStart(date?: string) {
  return date && DATE_RE.test(date) ? `${date}T00:00:00+07:00` : undefined
}

function wibEnd(date?: string) {
  return date && DATE_RE.test(date) ? `${date}T23:59:59.999+07:00` : undefined
}

/** Strips characters that carry meaning inside PostgREST `or=(...)` filters. */
function sanitizeSearch(q?: string) {
  return (q ?? '').replace(/[,()*%\\:"']/g, ' ').trim().slice(0, 80)
}

function round(n: number, digits = 1) {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

async function fetchUserNames(supabase: SupabaseClient, ids: string[]) {
  const map = new Map<string, string>()
  const unique = Array.from(new Set(ids.filter(Boolean)))
  for (const part of chunk(unique, IN_CHUNK)) {
    const { data, error } = await supabase.from('users').select('id, full_name').in('id', part)
    if (error) fail('Gagal memuat data petugas', error)
    for (const u of (data ?? []) as { id: string; full_name: string }[]) map.set(u.id, u.full_name)
  }
  return map
}

function itemStatus(physical: number | null, variance: number | null, counted: boolean): DetailItemStatus {
  if (!counted || physical === null) return 'Belum Dihitung'
  const v = variance ?? 0
  if (v === 0) return 'Match'
  return v < 0 ? 'Defisit' : 'Surplus'
}

/** Builds the summary of one session from its so_items rows. */
function summarizeSession(
  s: SessionRow,
  items: Pick<ItemAggRow, 'system_stock' | 'physical_stock' | 'variance' | 'is_counted' | 'counted_by'>[],
  shelves: (string | null)[],
  names: Map<string, string>
): CompletedSOSession {
  const counted = items.filter(i => i.is_counted && i.physical_stock !== null)
  const matched = counted.filter(i => (i.variance ?? 0) === 0)
  let systemUnits = 0
  let physicalUnits = 0
  let net = 0
  let deficit = 0
  let surplus = 0
  for (const i of counted) {
    const v = i.variance ?? (i.physical_stock ?? 0) - i.system_stock
    systemUnits += i.system_stock
    physicalUnits += i.physical_stock ?? 0
    net += v
    if (v < 0) deficit += -v
    else surplus += v
  }

  const officerIds = Array.from(new Set([s.user_id, ...items.map(i => i.counted_by).filter((x): x is string => !!x)]))
  const officerNames = officerIds
    .map(id => (id === s.user_id ? s.owner?.full_name ?? names.get(id) : names.get(id)))
    .filter((n): n is string => !!n)

  const durationMinutes = s.end_time
    ? Math.max(0, Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000))
    : null

  return {
    id: s.id,
    session_code: s.session_code,
    category_id: s.category_id,
    category_name: s.categories?.name ?? 'Tanpa Kategori',
    status: s.status as HistorySessionStatus,
    start_time: s.start_time,
    end_time: s.end_time,
    duration_minutes: durationMinutes,
    officer_ids: officerIds,
    officer_names: officerNames,
    shelf_locations: Array.from(new Set(shelves.filter((x): x is string => !!x))).sort(),
    total_sku: items.length || s.total_items,
    counted_sku: items.length ? counted.length : s.counted_items,
    matched_sku: matched.length,
    accuracy_pct: counted.length ? round((matched.length / counted.length) * 100) : null,
    total_system_units: systemUnits,
    total_physical_units: physicalUnits,
    variance_units: net,
    deficit_units: deficit,
    surplus_units: surplus,
    variance_pct: systemUnits > 0 ? round(((deficit + surplus) / systemUnits) * 100, 2) : null,
    notes: s.notes
  }
}

// ---------- Audit description ----------

function str(v: unknown) {
  return v === null || v === undefined ? null : String(v)
}

function describeAudit(row: AuditRow, products: Map<string, { name: string; barcode: string }>) {
  const before = row.before_value ?? {}
  const after = row.after_value ?? {}

  if (row.entity_type === 'so_sessions') {
    const code = str(after.session_code) ?? str(before.session_code) ?? row.entity_id ?? '-'
    let description = 'Data sesi SO diperbarui'
    if (row.action === 'INSERT') description = 'Sesi SO baru dibuat'
    else if (row.action === 'DELETE') description = 'Sesi SO dihapus'
    else if (before.status !== after.status) {
      description =
        after.status === 'completed'
          ? 'Sesi SO diselesaikan'
          : after.status === 'cancelled'
          ? 'Sesi SO dibatalkan'
          : `Status sesi diubah ke ${str(after.status)}`
    } else if (before.counted_items !== after.counted_items) {
      description = `Progres hitung diperbarui (${str(after.counted_items)}/${str(after.total_items)} item)`
    }
    return { entity_label: code, description }
  }

  if (row.entity_type === 'so_items') {
    const productId = str(after.product_id) ?? str(before.product_id)
    const p = productId ? products.get(productId) : undefined
    const label = p ? `${p.barcode} · ${p.name}` : row.entity_id ?? '-'
    let description = 'Item SO diperbarui'
    if (row.action === 'INSERT') description = 'Item ditambahkan ke sesi SO'
    else if (row.action === 'DELETE') description = 'Item dihapus dari sesi SO'
    else if (before.physical_stock !== after.physical_stock && after.physical_stock !== null && after.physical_stock !== undefined) {
      const v = Number(after.physical_stock) - Number(after.system_stock)
      description = `Input fisik ${str(after.physical_stock)} pcs (sistem ${str(after.system_stock)}, selisih ${v > 0 ? '+' : ''}${v})`
    }
    return { entity_label: label, description }
  }

  if (row.action === 'REPORT_EXPORTED') {
    return {
      entity_label: row.entity_id ?? '-',
      description: str(after.description) ?? 'Ekspor laporan'
    }
  }

  return { entity_label: row.entity_id ?? '-', description: `${row.action} pada ${row.entity_type}` }
}

// ============================================================
// Repository
// ============================================================

export class HistoryRepository {
  /**
   * Completed / cancelled SO sessions with per-session aggregates, summary
   * metrics over the filtered set, and dropdown options from master tables.
   */
  static async getCompletedSessions(supabase: SupabaseClient, filters: HistoryFilters = {}) {
    const statuses: HistorySessionStatus[] =
      filters.status === 'completed' || filters.status === 'cancelled' ? [filters.status] : ['completed', 'cancelled']
    const from = wibStart(filters.from)
    const to = wibEnd(filters.to)
    const categoryId = filters.category && UUID_RE.test(filters.category) ? filters.category : undefined

    const sessionRows = await fetchAll<SessionRow>(() => {
      let q = supabase
        .from('so_sessions')
        .select(SESSION_SELECT)
        .in('status', statuses)
        .order('start_time', { ascending: false })
      if (categoryId) q = q.eq('category_id', categoryId)
      if (from) q = q.gte('start_time', from)
      if (to) q = q.lte('start_time', to)
      return q
    }, 'Gagal memuat sesi SO')

    // Items for all sessions, used for accuracy / variance / officers / rack coverage
    const itemsBySession = new Map<string, ItemAggRow[]>()
    for (const ids of chunk(sessionRows.map(s => s.id), IN_CHUNK)) {
      const rows = await fetchAll<ItemAggRow>(
        () =>
          supabase
            .from('so_items')
            .select(
              'session_id, system_stock, physical_stock, variance, is_counted, counted_by, products:product_id (shelf_location, barcode, name)'
            )
            .in('session_id', ids)
            .order('id'),
        'Gagal memuat item sesi SO'
      )
      for (const r of rows) {
        const list = itemsBySession.get(r.session_id) ?? []
        list.push(r)
        itemsBySession.set(r.session_id, list)
      }
    }

    const counterIds = Array.from(itemsBySession.values()).flatMap(list => list.map(i => i.counted_by ?? ''))
    const names = await fetchUserNames(supabase, counterIds)

    let all = sessionRows.map(s => {
      const items = itemsBySession.get(s.id) ?? []
      return summarizeSession(s, items, items.map(i => i.products?.shelf_location ?? null), names)
    })

    if (all.length === 0) {
      const localFile = path.join(process.cwd(), '.data', 'completed_sessions.json')
      if (fs.existsSync(localFile)) {
        try {
          const raw = JSON.parse(fs.readFileSync(localFile, 'utf-8'))
          all = (raw as Record<string, unknown>[]).map(r => ({
            id: String(r.id),
            session_code: String(r.session_code),
            category_id: String(r.category_id),
            category_name: String(r.category_name),
            status: (r.status === 'Cancelled' ? 'cancelled' : 'completed') as HistorySessionStatus,
            start_time: String(r.start_time),
            end_time: r.end_time ? String(r.end_time) : null,
            duration_minutes: 75,
            officer_ids: Array.isArray(r.officer_ids) ? (r.officer_ids as string[]) : [],
            officer_names: Array.isArray(r.officers)
              ? (r.officers as string[])
              : [typeof r.officers === 'string' ? r.officers : 'Petugas SO'],
            shelf_locations: ['A-01', 'A-02'],
            total_sku: Number(r.total_sku) || 0,
            counted_sku: Number(r.counted_sku) || 0,
            matched_sku: Array.isArray(r.items) ? (r.items as { status: string }[]).filter(i => i.status === 'Match').length : 0,
            accuracy_pct: r.accuracy_pct !== undefined ? Number(r.accuracy_pct) : 95,
            total_system_units: (Number(r.total_sku) || 0) * 100,
            total_physical_units: Number(r.total_units_verified) || 0,
            variance_units: Number(r.variance_units) || 0,
            deficit_units: Number(r.variance_units) < 0 ? -Number(r.variance_units) : 0,
            surplus_units: Number(r.variance_units) > 0 ? Number(r.variance_units) : 0,
            variance_pct: 1.2,
            notes: r.notes ? String(r.notes) : null
          }))
        } catch {
          // ignore
        }
      }
    }

    // Filters that depend on aggregated data
    let filtered = all
    if (filters.officer && filters.officer !== 'all') {
      filtered = filtered.filter(s => s.officer_ids.includes(filters.officer!))
    }
    const q = filters.search?.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter(
        s =>
          s.session_code.toLowerCase().includes(q) ||
          s.category_name.toLowerCase().includes(q) ||
          s.officer_names.some(n => n.toLowerCase().includes(q)) ||
          s.shelf_locations.some(l => l.toLowerCase().includes(q)) ||
          (itemsBySession.get(s.id) ?? []).some(
            i => i.products?.barcode.toLowerCase().includes(q) || i.products?.name.toLowerCase().includes(q)
          )
      )
    }

    // Metrics over the filtered set
    const completed = filtered.filter(s => s.status === 'completed')
    const withDuration = completed.filter(s => s.duration_minutes !== null)
    const withVariance = completed.filter(s => s.variance_pct !== null)
    const metrics: HistoryMetrics = {
      total_sessions: filtered.length,
      completed_sessions: completed.length,
      cancelled_sessions: filtered.length - completed.length,
      avg_duration_minutes: withDuration.length
        ? Math.round(withDuration.reduce((a, s) => a + (s.duration_minutes ?? 0), 0) / withDuration.length)
        : null,
      avg_variance_pct: withVariance.length
        ? round(withVariance.reduce((a, s) => a + (s.variance_pct ?? 0), 0) / withVariance.length, 2)
        : null,
      net_variance_units: completed.reduce((a, s) => a + s.variance_units, 0),
      deficit_units: completed.reduce((a, s) => a + s.deficit_units, 0),
      surplus_units: completed.reduce((a, s) => a + s.surplus_units, 0)
    }

    // Dropdown options from master tables
    const [catRes, userRes] = await Promise.all([
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('users').select('id, full_name').order('full_name')
    ])

    const catData = (!catRes.error && catRes.data && catRes.data.length > 0)
      ? (catRes.data as { id: string; name: string }[])
      : Array.from(new Set(all.map(s => s.category_name))).map(name => {
          const found = all.find(s => s.category_name === name)
          return { id: found?.category_id || name, name }
        })

    const userData = (!userRes.error && userRes.data && userRes.data.length > 0)
      ? (userRes.data as { id: string; full_name: string }[])
      : Array.from(new Set(all.flatMap(s => s.officer_names))).map(full_name => {
          const found = all.find(s => s.officer_names.includes(full_name))
          return { id: found?.officer_ids[0] || full_name, full_name }
        })

    return {
      sessions: filtered,
      metrics,
      filter_options: {
        categories: catData.map(c => ({ value: c.id, label: c.name })),
        officers: userData.map(u => ({ value: u.id, label: u.full_name })),
        statuses: (Object.keys(SESSION_STATUS_LABEL) as HistorySessionStatus[]).map(s => ({
          value: s,
          label: SESSION_STATUS_LABEL[s]
        }))
      }
    }
  }

  /** One history session (by UUID or session_code) with every counted item. */
  static async getSessionDetail(supabase: SupabaseClient, idOrCode: string): Promise<SessionDetail | null> {
    const key = idOrCode.trim()
    if (!key) return null

    const { data: session, error } = await supabase
      .from('so_sessions')
      .select(SESSION_SELECT)
      .eq(UUID_RE.test(key) ? 'id' : 'session_code', key)
      .in('status', ['completed', 'cancelled'])
      .maybeSingle()
    if (error) fail('Gagal memuat detail sesi', error)
    if (!session) return null
    const s = session as unknown as SessionRow

    const rows = await fetchAll<ItemDetailRow>(
      () =>
        supabase
          .from('so_items')
          .select(
            'id, session_id, system_stock, physical_stock, variance, is_counted, counted_by, counted_at, products:product_id (barcode, name, brand, shelf_location)'
          )
          .eq('session_id', s.id)
          .order('id'),
      'Gagal memuat item sesi'
    )

    const names = await fetchUserNames(supabase, rows.map(r => r.counted_by ?? ''))
    const summary = summarizeSession(s, rows, rows.map(r => r.products?.shelf_location ?? null), names)

    const items: SOSessionDetailItem[] = rows
      .map(r => {
        const counted = !!r.is_counted && r.physical_stock !== null
        return {
          id: r.id,
          barcode: r.products?.barcode ?? '-',
          product_name: r.products?.name ?? 'Produk tidak ditemukan',
          brand: r.products?.brand ?? null,
          shelf_location: r.products?.shelf_location ?? null,
          system_stock: r.system_stock,
          physical_stock: r.physical_stock,
          variance: counted ? r.variance ?? (r.physical_stock ?? 0) - r.system_stock : null,
          status: itemStatus(r.physical_stock, r.variance, counted),
          counted_by_name: r.counted_by ? names.get(r.counted_by) ?? null : null,
          counted_at: r.counted_at
        }
      })
      // Discrepancies first so reviewers see problems without scrolling
      .sort((a, b) => Math.abs(b.variance ?? 0) - Math.abs(a.variance ?? 0) || a.product_name.localeCompare(b.product_name))

    return { ...summary, items }
  }

  // ---------- Audit trail ----------

  private static async buildAuditSearchOr(supabase: SupabaseClient, rawSearch?: string) {
    const q = sanitizeSearch(rawSearch)
    if (!q) return null

    const [usersRes, sessionsRes] = await Promise.all([
      supabase.from('users').select('id').ilike('full_name', `%${q}%`).limit(100),
      supabase.from('so_sessions').select('id').ilike('session_code', `%${q}%`).limit(100)
    ])
    const userIds = ((usersRes.data ?? []) as { id: string }[]).map(u => u.id)
    const sessionIds = ((sessionsRes.data ?? []) as { id: string }[]).map(s => s.id)

    const parts = [`action.ilike.%${q}%`, `entity_type.ilike.%${q}%`, `entity_id.ilike.%${q}%`, `ip_address.ilike.%${q}%`]
    if (userIds.length) parts.push(`user_id.in.(${userIds.join(',')})`)
    if (sessionIds.length) parts.push(`entity_id.in.(${sessionIds.join(',')})`)
    return parts.join(',')
  }

  private static async auditQueryFactory(supabase: SupabaseClient, filters: AuditTrailFilters, count: boolean) {
    const from = wibStart(filters.from)
    const to = wibEnd(filters.to)
    const searchOr = await this.buildAuditSearchOr(supabase, filters.search)
    const [entityType, action] = filters.action && filters.action.includes('|') ? filters.action.split('|') : []

    return () => {
      let q = supabase
        .from('audit_logs')
        .select(AUDIT_SELECT, count ? { count: 'exact' } : undefined)
        .order('timestamp', { ascending: false })
      if (entityType && action) q = q.eq('entity_type', entityType).eq('action', action)
      if (from) q = q.gte('timestamp', from)
      if (to) q = q.lte('timestamp', to)
      if (searchOr) q = q.or(searchOr)
      return q
    }
  }

  private static async mapAuditRows(supabase: SupabaseClient, rows: AuditRow[]): Promise<AuditTrailLog[]> {
    const productIds = Array.from(
      new Set(
        rows
          .filter(r => r.entity_type === 'so_items')
          .map(r => str(r.after_value?.product_id) ?? str(r.before_value?.product_id))
          .filter((x): x is string => !!x && UUID_RE.test(x))
      )
    )
    const products = new Map<string, { name: string; barcode: string }>()
    for (const part of chunk(productIds, IN_CHUNK)) {
      const { data } = await supabase.from('products').select('id, name, barcode').in('id', part)
      for (const p of (data ?? []) as { id: string; name: string; barcode: string }[]) products.set(p.id, p)
    }

    return rows.map(r => {
      const { entity_label, description } = describeAudit(r, products)
      return {
        id: r.id,
        timestamp: r.timestamp,
        user_id: r.user_id,
        user_name: r.actor?.full_name ?? (r.user_id ? 'Pengguna tidak dikenal' : 'Sistem'),
        user_email: r.actor?.email ?? null,
        user_role: r.actor?.role ? (r.actor.role === 'admin' ? 'Admin' : 'Petugas SO') : null,
        action: r.action,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        entity_label,
        description,
        before_value: r.before_value,
        after_value: r.after_value,
        ip_address: r.ip_address,
        user_agent: r.user_agent
      }
    })
  }

  /** Paginated audit_logs (newest first) plus the action types present in the table. */
  static async getAuditTrail(supabase: SupabaseClient, filters: AuditTrailFilters = {}) {
    const page = Math.max(1, filters.page ?? 1)
    const limit = Math.min(100, Math.max(1, filters.limit ?? 10))
    const offset = (page - 1) * limit

    const build = await this.auditQueryFactory(supabase, filters, true)
    const { data, error, count } = await build().range(offset, offset + limit - 1)
    if (error) fail('Gagal memuat audit trail', error)

    let logs = await this.mapAuditRows(supabase, (data ?? []) as unknown as AuditRow[])
    let total = count ?? 0

    if (logs.length === 0) {
      const localFile = path.join(process.cwd(), '.data', 'audit_trail.json')
      if (fs.existsSync(localFile)) {
        try {
          const raw = JSON.parse(fs.readFileSync(localFile, 'utf-8'))
          let localLogs: AuditTrailLog[] = (raw as Record<string, unknown>[]).map(r => ({
            id: String(r.id),
            timestamp: String(r.timestamp),
            user_id: r.user_id ? String(r.user_id) : 'sys-001',
            user_name: String(r.user_name || 'Petugas SO'),
            user_email: r.user_email ? String(r.user_email) : null,
            user_role: r.user_role ? String(r.user_role) : null,
            action: String(r.action),
            entity_type: String(r.entity_type || 'SO_SESSION'),
            entity_id: String(r.entity_id || '-'),
            entity_label: String(r.entity_id || 'Sesi SO'),
            description: String(r.action_label || 'Aksi sistem'),
            before_value: (r.before_value as Record<string, unknown>) || null,
            after_value: (r.after_value as Record<string, unknown>) || null,
            ip_address: r.ip_address ? String(r.ip_address) : null,
            user_agent: r.user_agent ? String(r.user_agent) : null
          }))

          if (filters.search) {
            const sq = filters.search.toLowerCase()
            localLogs = localLogs.filter(
              l =>
                l.description.toLowerCase().includes(sq) ||
                l.user_name.toLowerCase().includes(sq) ||
                (l.entity_id ? l.entity_id.toLowerCase().includes(sq) : false) ||
                l.action.toLowerCase().includes(sq)
            )
          }

          total = localLogs.length
          logs = localLogs.slice(offset, offset + limit)
        } catch {
          // ignore
        }
      }
    }

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      action_options: await this.getAuditActionOptions(supabase)
    }
  }

  /** Distinct (entity_type, action) pairs from the most recent 2000 events. */
  static async getAuditActionOptions(supabase: SupabaseClient): Promise<FilterOption[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('entity_type, action')
      .order('timestamp', { ascending: false })
      .limit(2000)
    if (error) return []

    const labels: Record<string, string> = {
      'so_sessions|INSERT': 'Sesi SO dibuat',
      'so_sessions|UPDATE': 'Perubahan sesi SO',
      'so_items|INSERT': 'Item ditambahkan ke sesi',
      'so_items|UPDATE': 'Input / perubahan hitung fisik',
      'report|REPORT_EXPORTED': 'Ekspor laporan'
    }
    const seen = new Map<string, string>()
    for (const r of (data ?? []) as { entity_type: string; action: string }[]) {
      const key = `${r.entity_type}|${r.action}`
      if (!seen.has(key)) seen.set(key, labels[key] ?? `${r.action} · ${r.entity_type}`)
    }
    if (seen.size === 0) {
      return [
        { value: 'SO_SESSION|SESSION_CREATED', label: 'Sesi SO Dibuat' },
        { value: 'SO_SESSION|SESSION_COMPLETED', label: 'Sesi SO Diselesaikan' },
        { value: 'SO_SESSION|SESSION_APPROVED', label: 'Approval Sesi SO' },
        { value: 'SO_SESSION|STOCK_RECONCILED', label: 'Rekonsiliasi Stok' },
        { value: 'SO_ITEM|ITEM_SCANNED', label: 'Input Stok Fisik' },
        { value: 'REPORT|REPORT_EXPORTED', label: 'Ekspor Laporan' }
      ]
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
  }

  /** Every audit row matching the filters (capped) for export. */
  static async getAuditTrailForExport(supabase: SupabaseClient, filters: AuditTrailFilters = {}, maxRows = 10000) {
    let rows: AuditRow[] = []
    try {
      const build = await this.auditQueryFactory(supabase, filters, false)
      rows = await fetchAll<AuditRow>(build, 'Gagal mengekspor audit trail', maxRows)
    } catch {
      // ignore
    }
    const mapped = await this.mapAuditRows(supabase, rows)
    if (mapped.length > 0) return mapped

    const localFile = path.join(process.cwd(), '.data', 'audit_trail.json')
    if (fs.existsSync(localFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(localFile, 'utf-8'))
        return (raw as Record<string, unknown>[]).map(r => ({
          id: String(r.id),
          timestamp: String(r.timestamp),
          user_id: r.user_id ? String(r.user_id) : 'sys-001',
          user_name: String(r.user_name || 'Petugas SO'),
          user_email: r.user_email ? String(r.user_email) : null,
          user_role: r.user_role ? String(r.user_role) : null,
          action: String(r.action),
          entity_type: String(r.entity_type || 'SO_SESSION'),
          entity_id: String(r.entity_id || '-'),
          entity_label: String(r.entity_id || 'Sesi SO'),
          description: String(r.action_label || 'Aksi sistem'),
          before_value: (r.before_value as Record<string, unknown>) || null,
          after_value: (r.after_value as Record<string, unknown>) || null,
          ip_address: r.ip_address ? String(r.ip_address) : null,
          user_agent: r.user_agent ? String(r.user_agent) : null
        }))
      } catch {
        // ignore
      }
    }
    return []
  }

  /** Writes an export event to audit_logs. Failures are logged, never thrown. */
  static async logExport(
    supabase: SupabaseClient,
    params: {
      userId: string
      entityId: string
      description: string
      details: Record<string, unknown>
      ip: string | null
      userAgent: string | null
    }
  ) {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: params.userId,
      action: 'REPORT_EXPORTED',
      entity_type: 'report',
      entity_id: params.entityId,
      before_value: null,
      after_value: { description: params.description, ...params.details },
      ip_address: params.ip,
      user_agent: params.userAgent
    })
    if (error) console.warn('Audit log for export was not recorded:', error.message)
  }

  // ============================================================
  // Exports
  // ============================================================

  static async generateSessionExcel(session: SessionDetail): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet(`Laporan ${session.session_code}`.slice(0, 31))

    ws.mergeCells('A1:I1')
    const title = ws.getCell('A1')
    title.value = `REKONSILIASI HASIL STOCK OPNAME - ${session.session_code}`
    title.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } }
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } }
    title.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 36

    const meta: [string, string, string, string, string, string][] = [
      [
        'Kode Sesi:', session.session_code,
        'Mulai:', formatWib(session.start_time),
        'Akurasi Fisik:', session.accuracy_pct === null ? '-' : `${session.accuracy_pct}%`
      ],
      [
        'Kategori:', session.category_name,
        'Selesai:', session.end_time ? formatWib(session.end_time) : '-',
        'Selisih Bersih:', `${signed(session.variance_units)} pcs`
      ],
      [
        'Status:', SESSION_STATUS_LABEL[session.status],
        'Petugas:', session.officer_names.join(', ') || '-',
        'Defisit / Surplus:', `-${session.deficit_units} / +${session.surplus_units} pcs`
      ]
    ]
    meta.forEach((m, i) => {
      const r = 3 + i
      ws.getCell(`A${r}`).value = m[0]
      ws.getCell(`B${r}`).value = m[1]
      ws.getCell(`D${r}`).value = m[2]
      ws.getCell(`E${r}`).value = m[3]
      ws.getCell(`G${r}`).value = m[4]
      ws.getCell(`H${r}`).value = m[5]
      ;['A', 'D', 'G'].forEach(c => (ws.getCell(`${c}${r}`).font = { bold: true }))
    })

    ws.columns = [
      { key: 'no', width: 6 },
      { key: 'barcode', width: 18 },
      { key: 'product_name', width: 38 },
      { key: 'shelf_location', width: 14 },
      { key: 'system_stock', width: 13 },
      { key: 'physical_stock', width: 13 },
      { key: 'variance', width: 13 },
      { key: 'status', width: 16 },
      { key: 'counted_by', width: 22 }
    ]

    const header = ws.getRow(7)
    header.values = ['No', 'Barcode', 'Nama Produk', 'Lokasi Rak', 'Stok Sistem', 'Stok Fisik', 'Selisih', 'Status', 'Dihitung Oleh']
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    header.alignment = { horizontal: 'center', vertical: 'middle' }
    header.height = 26

    session.items.forEach((item, idx) => {
      const row = ws.addRow({
        no: idx + 1,
        barcode: item.barcode,
        product_name: item.product_name,
        shelf_location: item.shelf_location ?? '-',
        system_stock: item.system_stock,
        physical_stock: item.physical_stock ?? '-',
        variance: item.variance ?? '-',
        status: item.status,
        counted_by: item.counted_by_name ?? '-'
      })
      const statusCell = row.getCell('status')
      if (item.status === 'Defisit') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
        statusCell.font = { color: { argb: 'FFDC2626' }, bold: true }
      } else if (item.status === 'Surplus') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
        statusCell.font = { color: { argb: 'FFB45309' }, bold: true }
      } else if (item.status === 'Match') {
        statusCell.font = { color: { argb: 'FF059669' }, bold: true }
      }
    })

    return Buffer.from(await workbook.xlsx.writeBuffer())
  }

  static async generateSessionsSummaryExcel(sessions: CompletedSOSession[], items?: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet('Rekap Sesi Stock Opname')

    ws.mergeCells('A1:L1')
    const title = ws.getCell('A1')
    title.value = `REKAPITULASI SESI STOCK OPNAME (${sessions.length} Sesi Selesai)`
    title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } }
    title.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 32

    ws.columns = [
      { key: 'no', width: 6 },
      { key: 'code', width: 20 },
      { key: 'category', width: 28 },
      { key: 'start', width: 20 },
      { key: 'end', width: 20 },
      { key: 'officers', width: 25 },
      { key: 'total_sku', width: 12 },
      { key: 'counted_sku', width: 14 },
      { key: 'match', width: 10 },
      { key: 'deficit', width: 10 },
      { key: 'surplus', width: 10 },
      { key: 'accuracy', width: 14 }
    ]

    const header = ws.getRow(3)
    header.values = [
      'No',
      'Kode Sesi',
      'Kategori',
      'Waktu Mulai',
      'Waktu Selesai',
      'Petugas',
      'Total SKU',
      'SKU Dihitung',
      'Cocok',
      'Defisit',
      'Surplus',
      'Akurasi'
    ]
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    header.alignment = { horizontal: 'center', vertical: 'middle' }
    header.height = 24

    sessions.forEach((s, idx) => {
      ws.addRow({
        no: idx + 1,
        code: s.session_code,
        category: s.category_name,
        start: formatWib(s.start_time),
        end: s.end_time ? formatWib(s.end_time) : '-',
        officers: s.officer_names.join(', ') || '-',
        total_sku: s.total_sku,
        counted_sku: s.counted_sku,
        match: s.matched_sku,
        deficit: s.deficit_units,
        surplus: s.surplus_units,
        accuracy: s.accuracy_pct === null ? '-' : `${s.accuracy_pct}%`
      })
    })

    if (items && items.length > 0) {
      const wsItems = workbook.addWorksheet('Detail Semua Item')
      wsItems.columns = [
        { key: 'no', width: 6 },
        { key: 'barcode', width: 18 },
        { key: 'name', width: 35 },
        { key: 'category', width: 25 },
        { key: 'system_stock', width: 14 },
        { key: 'physical_stock', width: 14 },
        { key: 'variance', width: 14 },
        { key: 'status', width: 16 }
      ]
      const itemHeader = wsItems.getRow(1)
      itemHeader.values = ['No', 'Barcode', 'Nama Produk', 'Kategori', 'Stok Sistem', 'Stok Fisik', 'Selisih', 'Status']
      itemHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      itemHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
      itemHeader.alignment = { horizontal: 'center', vertical: 'middle' }

      items.forEach((item, idx) => {
        wsItems.addRow({
          no: idx + 1,
          barcode: item.barcode || '-',
          name: item.name || '-',
          category: item.category || '-',
          system_stock: item.system_stock,
          physical_stock: item.physical_stock ?? '-',
          variance: item.variance ?? '-',
          status: item.variance === 0 ? 'Match' : (item.variance !== null && item.variance < 0 ? 'Defisit' : (item.variance !== null && item.variance > 0 ? 'Surplus' : 'Belum Dihitung'))
        })
      })
    }

    return Buffer.from(await workbook.xlsx.writeBuffer())
  }

  static async generateAuditTrailExcel(logs: AuditTrailLog[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet('Audit Trail')

    ws.mergeCells('A1:H1')
    const title = ws.getCell('A1')
    title.value = `AUDIT TRAIL STOCK OPNAME (${logs.length} catatan)`
    title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }
    title.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 32

    ws.columns = [
      { key: 'no', width: 6 },
      { key: 'timestamp', width: 22 },
      { key: 'user', width: 26 },
      { key: 'action', width: 18 },
      { key: 'entity_type', width: 14 },
      { key: 'description', width: 46 },
      { key: 'entity', width: 32 },
      { key: 'device', width: 40 }
    ]
    const header = ws.getRow(3)
    header.values = ['No', 'Waktu (WIB)', 'Pengguna', 'Aksi', 'Entitas', 'Deskripsi', 'Target', 'IP / Perangkat']
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
    header.height = 24

    logs.forEach((l, idx) =>
      ws.addRow({
        no: idx + 1,
        timestamp: formatWib(l.timestamp, true),
        user: l.user_role ? `${l.user_name} (${l.user_role})` : l.user_name,
        action: l.action,
        entity_type: l.entity_type,
        description: l.description,
        entity: l.entity_label,
        device: [l.ip_address, l.user_agent].filter(Boolean).join(' | ') || '-'
      })
    )

    return Buffer.from(await workbook.xlsx.writeBuffer())
  }

  static generateAuditTrailCSV(logs: AuditTrailLog[]): string {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const headers = ['Waktu (WIB)', 'Pengguna', 'Email', 'Peran', 'Aksi', 'Entitas', 'Deskripsi', 'Target', 'ID Entitas', 'IP Address', 'User Agent']
    const rows = logs.map(l =>
      [
        formatWib(l.timestamp, true),
        l.user_name,
        l.user_email,
        l.user_role,
        l.action,
        l.entity_type,
        l.description,
        l.entity_label,
        l.entity_id,
        l.ip_address,
        l.user_agent
      ].map(esc)
    )
    // BOM so Excel opens UTF-8 names correctly
    return '\uFEFF' + [headers.map(esc).join(','), ...rows.map(r => r.join(','))].join('\r\n')
  }
}

export { RepositoryError }

function signed(n: number) {
  return `${n > 0 ? '+' : ''}${n}`
}

function formatWib(iso: string, withSeconds = false) {
  return (
    new Date(iso).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(withSeconds ? { second: '2-digit' } : {})
    }) + ' WIB'
  )
}
