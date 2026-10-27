'use client'

import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import {
  History,
  ShieldCheck,
  Calendar,
  Download,
  ChevronDown,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  Receipt,
  Search,
  FileSpreadsheet,
  Eye,
  X,
  Check,
  AlertTriangle,
  User,
  ClipboardList,
  TrendingDown,
  TrendingUp,
  Ban,
  RotateCcw,
  FileText
} from 'lucide-react'
import type {
  CompletedSOSession,
  AuditTrailLog,
  SessionDetail,
  HistoryMetrics,
  FilterOption
} from '@/lib/history-repository'

// ============================================================
// Date range helpers (all ranges are calendar days in WIB)
// ============================================================

type RangePreset = 'all' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom'

const PRESET_LABEL: Record<Exclude<RangePreset, 'custom'>, string> = {
  all: 'Semua Waktu',
  last7: '7 Hari Terakhir',
  last30: '30 Hari Terakhir',
  thisMonth: 'Bulan Ini',
  lastMonth: 'Bulan Lalu'
}

function todayWib() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
}

function shiftDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

function presetRange(preset: RangePreset, custom: { from: string; to: string }) {
  const today = todayWib()
  const [y, m] = today.split('-').map(Number)
  switch (preset) {
    case 'last7':
      return { from: shiftDays(today, -6), to: today }
    case 'last30':
      return { from: shiftDays(today, -29), to: today }
    case 'thisMonth':
      return { from: `${today.slice(0, 7)}-01`, to: today }
    case 'lastMonth': {
      const first = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10)
      const last = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10)
      return { from: first, to: last }
    }
    case 'custom':
      return { from: custom.from, to: custom.to }
    default:
      return { from: '', to: '' }
  }
}

function formatYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('id-ID', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

// ============================================================
// Formatting helpers
// ============================================================

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatSessionWindow(s: Pick<CompletedSOSession, 'start_time' | 'end_time'>) {
  const end = s.end_time ? ` - ${formatTime(s.end_time)}` : ''
  return `${formatDate(s.start_time)} (${formatTime(s.start_time)}${end} WIB)`
}

function formatTimestamp(iso: string) {
  return (
    new Date(iso).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' WIB'
  )
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return '-'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}j ${m}m` : `${m}m`
}

function formatAvgDuration(minutes: number | null) {
  if (minutes === null) return '-'
  if (minutes < 60) return `${minutes} Menit`
  return `${(minutes / 60).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jam`
}

function formatPct(n: number | null, digits = 2) {
  return n === null ? '-' : `${n.toLocaleString('id-ID', { maximumFractionDigits: digits })}%`
}

function signed(n: number) {
  return `${n > 0 ? '+' : ''}${n.toLocaleString('id-ID')}`
}

function rackLabel(shelves: string[]) {
  if (!shelves.length) return null
  if (shelves.length === 1) return `Rak ${shelves[0]}`
  return `Rak ${shelves[0]} s/d ${shelves[shelves.length - 1]}`
}

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/** Fetches a file and triggers a browser download; throws with the API message on failure. */
async function downloadFile(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    let message = `Gagal mengunduh (HTTP ${res.status})`
    try {
      message = (await res.json()).message || message
    } catch {
      // non-JSON body
    }
    throw new Error(message)
  }
  const blob = await res.blob()
  const match = /filename="?([^"]+)"?/.exec(res.headers.get('Content-Disposition') || '')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = match?.[1] || 'download'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

const EMPTY_METRICS: HistoryMetrics = {
  total_sessions: 0,
  completed_sessions: 0,
  cancelled_sessions: 0,
  avg_duration_minutes: null,
  avg_variance_pct: null,
  net_variance_units: 0,
  deficit_units: 0,
  surplus_units: 0
}

const selectClass =
  'bg-gray-50 hover:bg-gray-100/80 border border-gray-200/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40 cursor-pointer'

// ============================================================
// Page
// ============================================================

export default function AuditLogsPage() {
  const [activeTab, setActiveTab] = useState<'sessions' | 'audit'>('sessions')

  // Date range
  const [rangePreset, setRangePreset] = useState<RangePreset>('all')
  const [customRange, setCustomRange] = useState({ from: '', to: '' })
  const [draftCustom, setDraftCustom] = useState({ from: '', to: '' })
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false)
  const dateRef = useRef<HTMLDivElement>(null)

  // Export dropdown
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedOfficer, setSelectedOfficer] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounced(searchQuery, 350)

  // Sessions
  const [sessions, setSessions] = useState<CompletedSOSession[]>([])
  const [metrics, setMetrics] = useState<HistoryMetrics>(EMPTY_METRICS)
  const [filterOptions, setFilterOptions] = useState<{
    categories: FilterOption[]
    officers: FilterOption[]
    statuses: FilterOption[]
  }>({ categories: [], officers: [], statuses: [] })
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  // Audit trail
  const [auditLogs, setAuditLogs] = useState<AuditTrailLog[]>([])
  const [auditTotal, setAuditTotal] = useState<number | null>(null)
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotalPages, setAuditTotalPages] = useState(1)
  const [auditActionFilter, setAuditActionFilter] = useState('all')
  const [auditActionOptions, setAuditActionOptions] = useState<FilterOption[]>([])
  const [loadingAudit, setLoadingAudit] = useState(true)
  const [auditError, setAuditError] = useState<string | null>(null)

  // Modals
  const [detailTarget, setDetailTarget] = useState<CompletedSOSession | null>(null)
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedAuditPayload, setSelectedAuditPayload] = useState<AuditTrailLog | null>(null)
  const [itemSearchQuery, setItemSearchQuery] = useState('')

  // Downloads
  const [downloading, setDownloading] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const range = useMemo(() => presetRange(rangePreset, customRange), [rangePreset, customRange])
  const rangeLabel =
    rangePreset === 'custom'
      ? range.from && range.to
        ? `${formatYmd(range.from)} - ${formatYmd(range.to)}`
        : 'Rentang Kustom'
      : rangePreset === 'all'
      ? PRESET_LABEL.all
      : `${PRESET_LABEL[rangePreset]} (${formatYmd(range.from)} - ${formatYmd(range.to)})`

  // ---------- Data fetching ----------

  const sessionParams = useMemo(() => {
    const p = new URLSearchParams()
    if (selectedCategory !== 'all') p.set('category', selectedCategory)
    if (selectedOfficer !== 'all') p.set('officer', selectedOfficer)
    if (selectedStatus !== 'all') p.set('status', selectedStatus)
    if (debouncedSearch.trim()) p.set('search', debouncedSearch.trim())
    if (range.from) p.set('from', range.from)
    if (range.to) p.set('to', range.to)
    return p.toString()
  }, [selectedCategory, selectedOfficer, selectedStatus, debouncedSearch, range])

  const auditFilterParams = useMemo(() => {
    const p = new URLSearchParams()
    if (auditActionFilter !== 'all') p.set('action', auditActionFilter)
    if (debouncedSearch.trim()) p.set('search', debouncedSearch.trim())
    if (range.from) p.set('from', range.from)
    if (range.to) p.set('to', range.to)
    return p.toString()
  }, [auditActionFilter, debouncedSearch, range])

  const fetchSessions = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`/api/history/sessions?${sessionParams}`, { signal })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`)
        setSessions(json.data)
        setMetrics(json.metrics)
        setFilterOptions(json.filter_options)
        setSessionsError(null)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setSessionsError((err as Error).message)
        setSessions([])
        setMetrics(EMPTY_METRICS)
      } finally {
        if (!signal?.aborted) setLoadingSessions(false)
      }
    },
    [sessionParams]
  )

  const fetchAuditTrail = useCallback(
    async (page: number, signal?: AbortSignal) => {
      try {
        const res = await fetch(`/api/history/audit-trail?page=${page}&limit=10&${auditFilterParams}`, { signal })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`)
        setAuditLogs(json.data)
        setAuditTotal(json.pagination.total)
        setAuditTotalPages(json.pagination.totalPages)
        setAuditActionOptions(json.action_options ?? [])
        setAuditError(null)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setAuditError((err as Error).message)
        setAuditLogs([])
      } finally {
        if (!signal?.aborted) setLoadingAudit(false)
      }
    },
    [auditFilterParams]
  )

  useEffect(() => {
    let ignore = false
    const ctrl = new AbortController()
    fetch(`/api/history/sessions?${sessionParams}`, { signal: ctrl.signal })
      .then(res => res.json().then(json => ({ ok: res.ok, status: res.status, json })))
      .then(({ ok, status, json }) => {
        if (ignore) return
        if (!ok || !json.success) throw new Error(json.message || `HTTP ${status}`)
        setSessions(json.data)
        setMetrics(json.metrics)
        setFilterOptions(json.filter_options)
        setSessionsError(null)
        setLoadingSessions(false)
      })
      .catch(err => {
        if (ignore || err.name === 'AbortError') return
        setSessionsError(err.message)
        setSessions([])
        setMetrics(EMPTY_METRICS)
        setLoadingSessions(false)
      })
    return () => {
      ignore = true
      ctrl.abort()
    }
  }, [sessionParams])

  // Audit is fetched on load and whenever auditFilterParams or auditPage changes
  useEffect(() => {
    let ignore = false
    const ctrl = new AbortController()
    fetch(`/api/history/audit-trail?page=${auditPage}&limit=10&${auditFilterParams}`, { signal: ctrl.signal })
      .then(res => res.json().then(json => ({ ok: res.ok, status: res.status, json })))
      .then(({ ok, status, json }) => {
        if (ignore) return
        if (!ok || !json.success) throw new Error(json.message || `HTTP ${status}`)
        setAuditLogs(json.data)
        setAuditTotal(json.pagination.total)
        setAuditTotalPages(json.pagination.totalPages)
        setAuditActionOptions(json.action_options ?? [])
        setAuditError(null)
        setLoadingAudit(false)
      })
      .catch(err => {
        if (ignore || err.name === 'AbortError') return
        setAuditError(err.message)
        setAuditLogs([])
        setLoadingAudit(false)
      })
    return () => {
      ignore = true
      ctrl.abort()
    }
  }, [auditFilterParams, auditPage])

  // ---------- Detail modal ----------

  const openDetail = useCallback(async (session: CompletedSOSession) => {
    setDetailTarget(session)
    setDetail(null)
    setDetailError(null)
    setItemSearchQuery('')
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/history/sessions/${encodeURIComponent(session.id)}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`)
      setDetail(json.data)
    } catch (err) {
      setDetailError((err as Error).message)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetail = useCallback(() => {
    setDetailTarget(null)
    setDetail(null)
  }, [])

  const filteredDetailItems = useMemo(() => {
    if (!detail) return []
    const q = itemSearchQuery.trim().toLowerCase()
    if (!q) return detail.items
    return detail.items.filter(
      i =>
        i.product_name.toLowerCase().includes(q) ||
        i.barcode.toLowerCase().includes(q) ||
        (i.shelf_location ?? '').toLowerCase().includes(q)
    )
  }, [detail, itemSearchQuery])

  // ---------- Downloads ----------

  const runDownload = useCallback(
    async (key: string, url: string, successText: string) => {
      setDownloading(key)
      setNotice(null)
      try {
        await downloadFile(url)
        setNotice({ type: 'success', text: successText })
        // The export itself is written to audit_logs, so refresh the trail
        fetchAuditTrail(auditPage)
      } catch (err) {
        setNotice({ type: 'error', text: (err as Error).message })
      } finally {
        setDownloading(null)
      }
    },
    [fetchAuditTrail, auditPage]
  )

  const handleDownloadSessionExcel = (session: Pick<CompletedSOSession, 'id' | 'session_code'>) =>
    runDownload(
      `session-${session.id}`,
      `/api/history/export?type=session&id=${encodeURIComponent(session.id)}`,
      `Laporan ${session.session_code} berhasil diunduh.`
    )

  const handleDownloadAuditTrail = (format: 'xlsx' | 'csv') => {
    setIsExportDropdownOpen(false)
    runDownload(
      `audit-${format}`,
      `/api/history/export?type=audit&format=${format}&${auditFilterParams}`,
      `Audit trail (.${format}) berhasil diunduh sesuai filter aktif.`
    )
  }

  // ---------- Dropdown / modal dismissal ----------

  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setIsDateDropdownOpen(false)
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setIsExportDropdownOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setIsDateDropdownOpen(false)
      setIsExportDropdownOpen(false)
      setSelectedAuditPayload(null)
      closeDetail()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [closeDetail])

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedOfficer !== 'all' ||
    selectedStatus !== 'all' ||
    searchQuery !== '' ||
    rangePreset !== 'all' ||
    auditActionFilter !== 'all'

  const resetFilters = () => {
    setSelectedCategory('all')
    setSelectedOfficer('all')
    setSelectedStatus('all')
    setSearchQuery('')
    setRangePreset('all')
    setCustomRange({ from: '', to: '' })
    setAuditActionFilter('all')
  }

  const customValid = draftCustom.from && draftCustom.to && draftCustom.from <= draftCustom.to

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Riwayat &amp; Audit Trail</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Rekam jejak sesi stock opname yang sudah ditutup, selisih stok, dan log perubahan data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range */}
          <div className="relative" ref={dateRef}>
            <button
              id="date-range-button"
              onClick={() => {
                setDraftCustom(customRange)
                setIsDateDropdownOpen(o => !o)
              }}
              aria-haspopup="true"
              aria-expanded={isDateDropdownOpen}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200/90 text-gray-700 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="max-w-[260px] truncate">{rangeLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
            </button>

            {isDateDropdownOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95">
                {(Object.keys(PRESET_LABEL) as Exclude<RangePreset, 'custom'>[]).map(p => (
                  <button
                    key={p}
                    onClick={() => {
                      setRangePreset(p)
                      setIsDateDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-gray-50 transition-colors focus:outline-none focus-visible:bg-gray-100 ${
                      rangePreset === p ? 'text-[#FF4D15] font-bold bg-orange-50/50' : 'text-gray-700'
                    }`}
                  >
                    {PRESET_LABEL[p]}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1.5 pt-2.5 px-3.5 pb-2 space-y-2">
                  <p className="text-[11px] font-bold text-gray-500">Rentang kustom</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-semibold text-gray-500">
                      Dari
                      <input
                        type="date"
                        value={draftCustom.from}
                        max={draftCustom.to || undefined}
                        onChange={e => setDraftCustom(d => ({ ...d, from: e.target.value }))}
                        className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40"
                      />
                    </label>
                    <label className="text-[10px] font-semibold text-gray-500">
                      Sampai
                      <input
                        type="date"
                        value={draftCustom.to}
                        min={draftCustom.from || undefined}
                        onChange={e => setDraftCustom(d => ({ ...d, to: e.target.value }))}
                        className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40"
                      />
                    </label>
                  </div>
                  <button
                    disabled={!customValid}
                    onClick={() => {
                      setCustomRange(draftCustom)
                      setRangePreset('custom')
                      setIsDateDropdownOpen(false)
                    }}
                    className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-1.5 text-xs font-bold cursor-pointer"
                  >
                    Terapkan Rentang
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export Audit Log */}
          <div className="relative" ref={exportRef}>
            <button
              id="export-audit-button"
              onClick={() => setIsExportDropdownOpen(o => !o)}
              disabled={downloading?.startsWith('audit')}
              aria-haspopup="true"
              aria-expanded={isExportDropdownOpen}
              className="inline-flex items-center gap-2 bg-[#991B1B] hover:bg-[#7F1D1D] disabled:opacity-60 text-white px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold shadow-md shadow-red-900/20 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#991B1B]"
            >
              {downloading?.startsWith('audit') ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>Export Audit Log (.csv / .xlsx)</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95">
                <p className="px-3.5 pt-1 pb-2 text-[10px] text-gray-500">
                  Mengikuti filter aktif: rentang tanggal, jenis aksi, dan kata kunci.
                </p>
                <button
                  onClick={() => handleDownloadAuditTrail('xlsx')}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer focus:outline-none focus-visible:bg-gray-100"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Unduh Format Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleDownloadAuditTrail('csv')}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-gray-100 focus:outline-none focus-visible:bg-gray-100"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Unduh Format CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Download feedback */}
      {notice && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs font-semibold ${
            notice.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Tutup notifikasi" className="shrink-0 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Navigation Tabs */}
      <div role="tablist" className="flex flex-wrap items-center gap-2 border-b border-gray-150 pb-3">
        <button
          id="tab-sessions"
          role="tab"
          aria-selected={activeTab === 'sessions'}
          onClick={() => setActiveTab('sessions')}
          className={`inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40 ${
            activeTab === 'sessions'
              ? 'bg-orange-50/90 text-[#C2410C] border border-orange-200/80 shadow-xs'
              : 'bg-white hover:bg-gray-100/80 text-gray-600 border border-transparent'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat Sesi SO Selesai</span>
          <span
            className={`px-1.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'sessions' ? 'bg-orange-100 text-[#C2410C]' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {loadingSessions ? '…' : metrics.total_sessions}
          </span>
        </button>

        <button
          id="tab-audit"
          role="tab"
          aria-selected={activeTab === 'audit'}
          onClick={() => setActiveTab('audit')}
          className={`inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40 ${
            activeTab === 'audit'
              ? 'bg-orange-50/90 text-[#C2410C] border border-orange-200/80 shadow-xs'
              : 'bg-white hover:bg-gray-100/80 text-gray-600 border border-transparent'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Audit Log Trail</span>
          <span
            className={`px-1.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'audit' ? 'bg-orange-100 text-[#C2410C]' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {auditTotal === null ? '…' : auditTotal.toLocaleString('id-ID')}
          </span>
        </button>
      </div>

      {/* 3. Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Sesi Selesai"
          value={`${metrics.completed_sessions.toLocaleString('id-ID')} Sesi`}
          sub={
            metrics.cancelled_sessions
              ? `${metrics.cancelled_sessions} sesi dibatalkan`
              : rangePreset === 'all'
              ? 'Sepanjang waktu'
              : 'Dalam rentang terpilih'
          }
          icon={<CheckCircle2 className="w-5 h-5 stroke-[2]" />}
          loading={loadingSessions}
        />
        <MetricCard
          label="Rata-rata Durasi"
          value={formatAvgDuration(metrics.avg_duration_minutes)}
          sub="Mulai sampai sesi ditutup"
          icon={<Clock className="w-5 h-5 stroke-[2]" />}
          loading={loadingSessions}
        />
        <MetricCard
          label="Variansi Rata-rata"
          value={formatPct(metrics.avg_variance_pct)}
          sub="Selisih absolut / stok sistem"
          icon={<SlidersHorizontal className="w-5 h-5 stroke-[2]" />}
          loading={loadingSessions}
        />
        <MetricCard
          label="Total Selisih Penyesuaian"
          value={`${signed(metrics.net_variance_units)} Pcs`}
          valueClass={
            metrics.net_variance_units < 0 ? 'text-red-700' : metrics.net_variance_units > 0 ? 'text-amber-700' : undefined
          }
          sub={`Defisit ${metrics.deficit_units.toLocaleString('id-ID')} · Surplus ${metrics.surplus_units.toLocaleString('id-ID')} pcs`}
          icon={<Receipt className="w-5 h-5 stroke-[2]" />}
          loading={loadingSessions}
        />
      </div>

      {/* 4. Filter Controls & Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-150/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === 'sessions' ? (
            <>
              <select
                id="filter-category"
                aria-label="Filter kategori"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className={selectClass}
              >
                <option value="all">Kategori: Semua Produk</option>
                {filterOptions.categories.map(c => (
                  <option key={c.value} value={c.value}>
                    Kategori: {c.label}
                  </option>
                ))}
              </select>

              <select
                id="filter-officer"
                aria-label="Filter petugas"
                value={selectedOfficer}
                onChange={e => setSelectedOfficer(e.target.value)}
                className={selectClass}
              >
                <option value="all">Petugas: Seluruh Tim</option>
                {filterOptions.officers.map(o => (
                  <option key={o.value} value={o.value}>
                    Petugas: {o.label}
                  </option>
                ))}
              </select>

              <select
                id="filter-status"
                aria-label="Filter status"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className={selectClass}
              >
                <option value="all">Status: Semua Status</option>
                {filterOptions.statuses.map(s => (
                  <option key={s.value} value={s.value}>
                    Status: {s.label}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <select
              id="filter-audit-action"
              aria-label="Filter jenis aksi"
              value={auditActionFilter}
              onChange={e => {
                setAuditActionFilter(e.target.value)
                setAuditPage(1)
              }}
              className={selectClass}
            >
              <option value="all">Aksi: Semua Jenis</option>
              {auditActionOptions.map(o => (
                <option key={o.value} value={o.value}>
                  Aksi: {o.label}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              id="reset-filters"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 px-2.5 py-2 rounded-xl hover:bg-gray-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          )}
        </div>

        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="history-search"
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Cari"
            placeholder={
              activeTab === 'sessions'
                ? 'Cari kode sesi, kategori, petugas, barcode, atau produk...'
                : 'Cari pengguna, kode sesi, aksi, atau IP...'
            }
            className="w-full bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200/80 rounded-xl pl-10 pr-8 py-2 min-h-[40px] text-xs font-medium text-gray-800 placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 5. Main Content */}
      {activeTab === 'sessions' ? (
        <div className="space-y-4" role="tabpanel" aria-labelledby="tab-sessions">
          {loadingSessions ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-150">
              <div className="w-8 h-8 border-3 border-[#FF4D15] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-gray-500">Memuat riwayat sesi stock opname...</p>
            </div>
          ) : sessionsError ? (
            <ErrorState message={sessionsError} onRetry={() => fetchSessions()} />
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-150">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h2 className="text-sm font-bold text-gray-800">
                {hasActiveFilters ? 'Tidak ada sesi yang cocok' : 'Belum ada sesi SO yang ditutup'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {hasActiveFilters
                  ? 'Ubah rentang tanggal, filter, atau kata kunci pencarian.'
                  : 'Sesi akan muncul di sini setelah petugas menyelesaikan atau membatalkan sesi di halaman Sesi SO Aktif.'}
              </p>
            </div>
          ) : (
            sessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onDetail={() => openDetail(session)}
                onDownload={() => handleDownloadSessionExcel(session)}
                downloading={downloading === `session-${session.id}`}
              />
            ))
          )}
        </div>
      ) : (
        <div
          role="tabpanel"
          aria-labelledby="tab-audit"
          className="bg-white rounded-2xl border border-gray-150/90 shadow-sm overflow-hidden"
        >
          <div className="p-4 md:p-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#F8FAFC]/50">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Catatan Aktivitas Sistem</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Dicatat otomatis oleh trigger database saat sesi dan item SO berubah, serta setiap kali laporan diekspor.
              </p>
            </div>
            <button
              id="audit-download-csv"
              onClick={() => handleDownloadAuditTrail('csv')}
              disabled={downloading === 'audit-csv'}
              className="bg-white hover:bg-gray-50 disabled:opacity-60 border border-gray-200 text-gray-700 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Unduh CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[11px] font-bold text-gray-500">
                <tr>
                  <th className="py-3 px-5">Waktu (WIB)</th>
                  <th className="py-3 px-5">Pengguna</th>
                  <th className="py-3 px-5">Tipe Aksi</th>
                  <th className="py-3 px-5">Deskripsi Aktivitas</th>
                  <th className="py-3 px-5">Target</th>
                  <th className="py-3 px-5">Alamat IP</th>
                  <th className="py-3 px-5 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {loadingAudit ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-500">
                      <div className="w-6 h-6 border-2 border-[#FF4D15] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Memuat log audit...
                    </td>
                  </tr>
                ) : auditError ? (
                  <tr>
                    <td colSpan={7} className="p-4">
                      <ErrorState message={auditError} onRetry={() => fetchAuditTrail(auditPage)} compact />
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-500">
                      {hasActiveFilters
                        ? 'Tidak ada catatan audit yang cocok dengan filter.'
                        : 'Belum ada catatan audit. Akun non-admin tidak dapat membaca audit log (RLS).'}
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-gray-600 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{log.user_name}</div>
                        {log.user_role && <div className="text-[10px] text-gray-500">{log.user_role}</div>}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="font-mono text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                          {log.action}
                        </span>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">{log.entity_type}</div>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-gray-800 min-w-[220px]">{log.description}</td>
                      <td className="py-3.5 px-5 text-gray-600 max-w-[240px] truncate" title={log.entity_label}>
                        {log.entity_label}
                      </td>
                      <td className="py-3.5 px-5 text-[11px] whitespace-nowrap font-mono text-gray-600">
                        {log.ip_address ?? '-'}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedAuditPayload(log)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C2410C] hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40 rounded"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-gray-600">
            <div>
              Menampilkan {auditLogs.length} dari {(auditTotal ?? 0).toLocaleString('id-ID')} catatan audit
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                disabled={auditPage <= 1 || loadingAudit}
                className="px-3 py-1.5 min-h-[36px] rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Sebelumnya
              </button>
              <span className="px-2 font-bold text-gray-800">
                Halaman {auditPage} dari {auditTotalPages}
              </span>
              <button
                onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                disabled={auditPage >= auditTotalPages || loadingAudit}
                className="px-3 py-1.5 min-h-[36px] rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DETAIL SESI ================= */}
      {detailTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200"
          onMouseDown={e => e.target === e.currentTarget && closeDetail()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 max-h-[90vh] flex flex-col shadow-2xl border border-gray-150 animate-in zoom-in-95"
          >
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100 shrink-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[#C2410C] font-extrabold bg-orange-50 px-2 py-0.5 rounded-md text-xs">
                    #{detailTarget.session_code}
                  </span>
                  <StatusBadge status={detailTarget.status} />
                </div>
                <h3 id="detail-title" className="text-xl font-extrabold text-gray-900 mt-1">
                  {detailTarget.category_name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[rackLabel(detailTarget.shelf_locations), `Petugas: ${detailTarget.officer_names.join(', ') || '-'}`, formatSessionWindow(detailTarget)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <button
                onClick={closeDetail}
                aria-label="Tutup detail"
                autoFocus
                className="w-9 h-9 shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 my-3.5 bg-[#F8FAFC] rounded-2xl border border-gray-100 shrink-0">
              <MiniStat label="SKU Terhitung" value={`${detailTarget.counted_sku} / ${detailTarget.total_sku} SKU`} />
              <MiniStat
                label="Akurasi Fisik"
                value={detailTarget.accuracy_pct === null ? '-' : `${formatPct(detailTarget.accuracy_pct, 1)} match`}
                tone={detailTarget.accuracy_pct === 100 ? 'good' : undefined}
              />
              <MiniStat
                label="Total Fisik / Sistem"
                value={`${detailTarget.total_physical_units.toLocaleString('id-ID')} / ${detailTarget.total_system_units.toLocaleString('id-ID')} Pcs`}
              />
              <MiniStat
                label="Selisih Bersih"
                value={`${signed(detailTarget.variance_units)} Pcs`}
                tone={detailTarget.variance_units < 0 ? 'bad' : detailTarget.variance_units > 0 ? 'warn' : 'good'}
              />
            </div>

            {detailTarget.notes && (
              <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 shrink-0">
                <strong>Catatan Sesi:</strong> {detailTarget.notes}
              </div>
            )}

            <div className="mb-2 shrink-0 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={itemSearchQuery}
                onChange={e => setItemSearchQuery(e.target.value)}
                aria-label="Cari item"
                placeholder="Cari barcode, nama barang, atau rak..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40"
              />
            </div>

            <div className="flex-1 overflow-auto border border-gray-150 rounded-2xl min-h-[160px]">
              {detailLoading ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  <div className="w-6 h-6 border-2 border-[#FF4D15] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Memuat item sesi...
                </div>
              ) : detailError ? (
                <div className="p-4">
                  <ErrorState message={detailError} onRetry={() => openDetail(detailTarget)} compact />
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[10px] font-bold text-gray-500 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4">Barcode</th>
                      <th className="py-2.5 px-4">Nama Produk</th>
                      <th className="py-2.5 px-4 text-center">Rak</th>
                      <th className="py-2.5 px-4 text-right">Sistem</th>
                      <th className="py-2.5 px-4 text-right">Fisik</th>
                      <th className="py-2.5 px-4 text-right">Selisih</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4">Dihitung Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {filteredDetailItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-gray-500">
                          {detail?.items.length ? 'Tidak ada item yang cocok.' : 'Sesi ini tidak memiliki item.'}
                        </td>
                      </tr>
                    ) : (
                      filteredDetailItems.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50/60">
                          <td className="py-2.5 px-4 font-mono text-[11px] font-bold text-gray-600">{item.barcode}</td>
                          <td className="py-2.5 px-4 font-bold text-gray-900">
                            {item.product_name}
                            {item.brand && <span className="block text-[10px] font-medium text-gray-500">{item.brand}</span>}
                          </td>
                          <td className="py-2.5 px-4 text-center text-gray-600">{item.shelf_location ?? '-'}</td>
                          <td className="py-2.5 px-4 text-right font-semibold text-gray-600">{item.system_stock}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-gray-900">{item.physical_stock ?? '-'}</td>
                          <td
                            className={`py-2.5 px-4 text-right font-extrabold ${
                              !item.variance ? 'text-gray-500' : item.variance < 0 ? 'text-red-700' : 'text-amber-700'
                            }`}
                          >
                            {item.variance === null ? '-' : signed(item.variance)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap ${
                                item.status === 'Match'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'Defisit'
                                  ? 'bg-red-100 text-red-800'
                                  : item.status === 'Surplus'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">
                            {item.counted_by_name ?? '-'}
                            {item.counted_at && (
                              <span className="block text-[10px] text-gray-500">{formatTimestamp(item.counted_at)}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-gray-500 font-medium">
                {detail ? `${detail.items.length} item, diurutkan dari selisih terbesar.` : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeDetail}
                  className="px-4 py-2 min-h-[40px] rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={() => handleDownloadSessionExcel(detailTarget)}
                  disabled={downloading === `session-${detailTarget.id}`}
                  className="bg-[#991B1B] hover:bg-[#7F1D1D] disabled:opacity-60 text-white px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-red-900/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#991B1B]"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Unduh Laporan Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PAYLOAD AUDIT ================= */}
      {selectedAuditPayload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200"
          onMouseDown={e => e.target === e.currentTarget && setSelectedAuditPayload(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payload-title"
            className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-150 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="min-w-0">
                <h4 id="payload-title" className="text-base font-bold text-gray-900">
                  Detail Payload Audit
                </h4>
                <p className="text-xs text-gray-500 truncate">
                  {formatTimestamp(selectedAuditPayload.timestamp)} · ID {selectedAuditPayload.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedAuditPayload(null)}
                aria-label="Tutup payload"
                autoFocus
                className="w-9 h-9 shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <PayloadField label="Pengguna" value={selectedAuditPayload.user_name} sub={selectedAuditPayload.user_email} />
                <PayloadField label="Alamat IP" value={selectedAuditPayload.ip_address ?? '-'} mono />
                <PayloadField label="Tipe Aksi" value={`${selectedAuditPayload.action} · ${selectedAuditPayload.entity_type}`} mono />
                <PayloadField label="Target" value={selectedAuditPayload.entity_label} sub={selectedAuditPayload.entity_id} />
                {selectedAuditPayload.user_agent && (
                  <div className="col-span-2">
                    <PayloadField label="Perangkat" value={selectedAuditPayload.user_agent} />
                  </div>
                )}
              </div>

              <div>
                <span className="text-gray-600 font-bold block mb-1">Before Value</span>
                <pre className="bg-[#1E293B] text-emerald-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56">
                  {JSON.stringify(selectedAuditPayload.before_value, null, 2) ?? 'null'}
                </pre>
              </div>
              <div>
                <span className="text-gray-600 font-bold block mb-1">After Value</span>
                <pre className="bg-[#1E293B] text-amber-200 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56">
                  {JSON.stringify(selectedAuditPayload.after_value, null, 2) ?? 'null'}
                </pre>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-gray-100 text-right">
              <button
                onClick={() => setSelectedAuditPayload(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function MetricCard(props: {
  label: string
  value: string
  sub: string
  icon: ReactNode
  loading: boolean
  valueClass?: string
}) {
  return (
    <div className="bg-white rounded-2xl p-4.5 border border-gray-150/90 shadow-sm flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 mb-1">{props.label}</p>
        {props.loading ? (
          <div className="h-7 w-24 bg-gray-100 rounded-md animate-pulse" aria-label="Memuat" />
        ) : (
          <h3 className={`text-2xl font-extrabold tracking-tight ${props.valueClass ?? 'text-gray-900'}`}>{props.value}</h3>
        )}
        <p className="text-[11px] font-medium text-gray-500 mt-0.5 truncate">{props.loading ? '\u00A0' : props.sub}</p>
      </div>
      <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-xs shrink-0">
        {props.icon}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: CompletedSOSession['status'] }) {
  return status === 'completed' ? (
    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-xs">
      <Check className="w-3 h-3 stroke-[3]" />
      Selesai
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full text-xs">
      <Ban className="w-3 h-3" />
      Dibatalkan
    </span>
  )
}

function SessionCard({
  session,
  onDetail,
  onDownload,
  downloading
}: {
  session: CompletedSOSession
  onDetail: () => void
  onDownload: () => void
  downloading: boolean
}) {
  const cancelled = session.status === 'cancelled'
  const deficit = session.variance_units < 0
  const surplus = session.variance_units > 0
  const rack = rackLabel(session.shelf_locations)

  // Icon communicates the outcome: clean count, net loss, net gain, or cancelled
  const iconBox = cancelled
    ? 'bg-slate-100 text-slate-500 border border-slate-200'
    : deficit
    ? 'bg-red-50 text-red-600 border border-red-100'
    : surplus
    ? 'bg-amber-50 text-amber-700 border border-amber-100'
    : 'bg-emerald-600 text-white'
  const Icon = cancelled ? Ban : deficit ? TrendingDown : surplus ? TrendingUp : ClipboardList

  return (
    <article className="bg-white rounded-2xl p-5 border border-gray-150/90 shadow-sm hover:shadow-md transition-all space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${iconBox}`}>
            <Icon className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#C2410C] font-extrabold bg-orange-50/80 px-2.5 py-0.5 rounded-lg text-xs">
                #{session.session_code}
              </span>
              <StatusBadge status={session.status} />
              {rack && (
                <span className="bg-blue-50/70 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full text-xs">{rack}</span>
              )}
            </div>
            <h2 className="text-base font-extrabold text-gray-900 mt-1.5">{session.category_name}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 font-medium mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {formatSessionWindow(session)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {formatDuration(session.duration_minutes)}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-400" />
                Petugas: <strong className="text-gray-800">{session.officer_names.join(' & ') || '-'}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start shrink-0">
          <button
            onClick={onDetail}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200/90 text-gray-700 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D15]/40"
          >
            <Eye className="w-3.5 h-3.5 text-gray-500" />
            <span>Lihat Detail</span>
          </button>
          <button
            onClick={onDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 bg-[#991B1B] hover:bg-[#7F1D1D] disabled:opacity-60 text-white px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold shadow-md shadow-red-900/15 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#991B1B]"
          >
            {downloading ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span>Unduh Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-[#F8FAFC] rounded-xl px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 border border-gray-100">
        <MiniStat label="Cakupan SKU" value={`${session.counted_sku} / ${session.total_sku} SKU`} />
        <MiniStat
          label={session.variance_units === 0 ? 'Akurasi Fisik vs Sistem' : 'Selisih Fisik'}
          value={
            session.variance_units === 0
              ? session.accuracy_pct === null
                ? 'Belum ada hitungan'
                : `Match ${formatPct(session.accuracy_pct, 1)}`
              : `${signed(session.variance_units)} Pcs (${deficit ? 'Defisit' : 'Surplus'})`
          }
          tone={session.variance_units === 0 ? (session.accuracy_pct === null ? undefined : 'good') : deficit ? 'bad' : 'warn'}
        />
        <MiniStat label="Total Unit Terverifikasi" value={`${session.total_physical_units.toLocaleString('id-ID')} Pcs`} />
        <MiniStat
          label="Variansi"
          value={
            session.variance_pct === null
              ? '-'
              : `${formatPct(session.variance_pct)} (-${session.deficit_units} / +${session.surplus_units})`
          }
          tone={session.variance_pct === 0 ? 'good' : undefined}
        />
      </div>
    </article>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'warn' }) {
  const color =
    tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : tone === 'warn' ? 'text-amber-700' : 'text-gray-900'
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-gray-500">{label}</p>
      <p className={`text-xs font-extrabold mt-0.5 ${color}`}>{value}</p>
    </div>
  )
}

function PayloadField({ label, value, sub, mono }: { label: string; value: string; sub?: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="text-gray-500 font-semibold block text-[10px]">{label}</span>
      <span className={`font-bold text-gray-800 break-words ${mono ? 'font-mono' : ''}`}>{value}</span>
      {sub && <span className="block text-[10px] text-gray-500 font-mono break-all">{sub}</span>}
    </div>
  )
}

function ErrorState({ message, onRetry, compact }: { message: string; onRetry: () => void; compact?: boolean }) {
  const unauth = /login/i.test(message)
  return (
    <div
      role="alert"
      className={`bg-red-50 border border-red-200 rounded-2xl text-center ${compact ? 'p-5' : 'p-10'}`}
    >
      <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
      <h2 className="text-sm font-bold text-red-900">Data tidak dapat dimuat</h2>
      <p className="text-xs text-red-800 mt-1 break-words">{message}</p>
      <div className="mt-3 flex items-center justify-center gap-2">
        {unauth ? (
          <a
            href="/login"
            className="inline-flex items-center px-4 py-2 min-h-[40px] rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold"
          >
            Login Ulang
          </a>
        ) : (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-white border border-red-200 text-red-800 hover:bg-red-100 text-xs font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Coba Lagi
          </button>
        )}
      </div>
    </div>
  )
}
