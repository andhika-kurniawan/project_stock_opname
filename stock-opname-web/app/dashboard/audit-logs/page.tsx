'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Layers, 
  User, 
  ArrowUpDown, 
  ExternalLink,
  ClipboardList,
  Flame,
  Sparkles,
  FileText
} from 'lucide-react'
import { CompletedSOSession, AuditTrailLog, SOSessionDetailItem } from '@/lib/history-repository'

export default function AuditLogsPage() {
  // Active Tab: 'sessions' (Riwayat Sesi SO Selesai) or 'audit' (Audit Log Trail)
  const [activeTab, setActiveTab] = useState<'sessions' | 'audit'>('sessions')

  // Date Range filter state
  const [dateRange, setDateRange] = useState('01 Okt 2026 - 15 Okt 2026')
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false)

  // Export dropdown state
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState('Semua Produk')
  const [selectedOfficer, setSelectedOfficer] = useState('Seluruh Tim')
  const [selectedStatus, setSelectedStatus] = useState('Semua Status')
  const [searchQuery, setSearchQuery] = useState('')

  // Completed sessions data state
  const [sessions, setSessions] = useState<CompletedSOSession[]>([])
  const [metrics, setMetrics] = useState({
    total_sessions: '12 Sesi',
    total_sessions_sub: '100% Target Zona Tercakup',
    avg_duration: '2.4 Jam',
    avg_duration_sub: 'Per Sesi SO Terjadwal',
    avg_variance: '2.1%',
    avg_variance_sub: 'Di bawah batas toleransi',
    total_adjustment: '-Rp 13.000',
    total_adjustment_sub: 'Net 3 Sesi Terakhir'
  })
  const [filterOptions, setFilterOptions] = useState<{
    categories: string[]
    officers: string[]
    statuses: string[]
  }>({
    categories: [],
    officers: [],
    statuses: []
  })
  const [loadingSessions, setLoadingSessions] = useState(true)

  // Audit trail state
  const [auditLogs, setAuditLogs] = useState<AuditTrailLog[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotalPages, setAuditTotalPages] = useState(1)
  const [auditActionFilter, setAuditActionFilter] = useState('all')
  const [loadingAudit, setLoadingAudit] = useState(false)

  // Modals state
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<CompletedSOSession | null>(null)
  const [selectedAuditPayload, setSelectedAuditPayload] = useState<AuditTrailLog | null>(null)
  const [itemSearchQuery, setItemSearchQuery] = useState('')

  // Fetch completed sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true)
      const params = new URLSearchParams()
      if (selectedCategory !== 'Semua Produk') params.set('category', selectedCategory)
      if (selectedOfficer !== 'Seluruh Tim') params.set('officer', selectedOfficer)
      if (selectedStatus !== 'Semua Status') params.set('status', selectedStatus)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/history/sessions?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setSessions(json.data)
        if (json.metrics) setMetrics(json.metrics)
        if (json.filter_options) setFilterOptions(json.filter_options)
      }
    } catch (err) {
      console.error('Failed to load completed sessions:', err)
    } finally {
      setLoadingSessions(false)
    }
  }, [selectedCategory, selectedOfficer, selectedStatus, searchQuery])

  // Fetch audit trail logs
  const fetchAuditTrail = useCallback(async (page: number = 1) => {
    try {
      setLoadingAudit(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '10')
      if (auditActionFilter !== 'all') params.set('action', auditActionFilter)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/history/audit-trail?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setAuditLogs(json.data)
        setAuditTotal(json.pagination.total)
        setAuditPage(json.pagination.page)
        setAuditTotalPages(json.pagination.totalPages)
      }
    } catch (err) {
      console.error('Failed to load audit trail:', err)
    } finally {
      setLoadingAudit(false)
    }
  }, [auditActionFilter, searchQuery])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditTrail(auditPage)
    }
  }, [activeTab, fetchAuditTrail, auditPage])

  // Download session excel
  const handleDownloadSessionExcel = (sessionId: string) => {
    window.location.href = `/api/history/export?type=session&id=${sessionId}`
  }

  // Download audit trail
  const handleDownloadAuditTrail = (format: 'xlsx' | 'csv') => {
    setIsExportDropdownOpen(false)
    window.location.href = `/api/history/export?type=audit&format=${format}`
  }

  // Filtered session items inside detail modal
  const filteredDetailItems = useMemo(() => {
    if (!selectedSessionDetail?.items) return []
    if (!itemSearchQuery.trim()) return selectedSessionDetail.items
    const q = itemSearchQuery.toLowerCase()
    return selectedSessionDetail.items.filter(i => 
      i.product_name.toLowerCase().includes(q) ||
      i.barcode.includes(q) ||
      i.shelf_location.toLowerCase().includes(q)
    )
  }, [selectedSessionDetail, itemSearchQuery])

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Riwayat & Audit Trail
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Rekam jejak komprehensif audit fisik inventaris toko, rekonsiliasi selisih stok, dan log mutasi data.
          </p>
        </div>

        {/* Top Right Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200/90 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{dateRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
            </button>

            {isDateDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95">
                {['01 Okt 2026 - 15 Okt 2026', '01 Sep 2026 - 30 Sep 2026', 'Bulan Ini (Okt 2026)', 'Kuartal 3 (Jul - Sep 2026)'].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setDateRange(range)
                      setIsDateDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-gray-50 transition-colors ${
                      dateRange === range ? 'text-[#FF4D15] font-bold bg-orange-50/50' : 'text-gray-700'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Audit Log Button */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="inline-flex items-center gap-2 bg-[#991B1B] hover:bg-[#7F1D1D] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-red-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Export Audit Log (.csv / .xlsx)</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => handleDownloadAuditTrail('xlsx')}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Unduh Format Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleDownloadAuditTrail('csv')}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-gray-100"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Unduh Format CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-150 pb-3">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-orange-50/90 text-[#FF4D15] border border-orange-200/80 shadow-xs'
              : 'bg-white hover:bg-gray-100/80 text-gray-600 border border-transparent'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat Sesi SO Selesai</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
            activeTab === 'sessions' ? 'bg-orange-100 text-[#FF4D15]' : 'bg-gray-100 text-gray-600'
          }`}>
            12
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-orange-50/90 text-[#FF4D15] border border-orange-200/80 shadow-xs'
              : 'bg-white hover:bg-gray-100/80 text-gray-600 border border-transparent'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Audit Log Trail (Immutable)</span>
        </button>
      </div>

      {/* 3. Summary Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sesi Selesai */}
        <div className="bg-white rounded-2xl p-4.5 border border-gray-150/90 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Total Sesi Selesai</p>
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {metrics.total_sessions}
            </h3>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">
              {metrics.total_sessions_sub}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-xs shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Card 2: Rata-rata Durasi */}
        <div className="bg-white rounded-2xl p-4.5 border border-gray-150/90 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Rata-rata Durasi</p>
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {metrics.avg_duration}
            </h3>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">
              {metrics.avg_duration_sub}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-xs shrink-0">
            <Clock className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Card 3: Variansi Rata-rata */}
        <div className="bg-white rounded-2xl p-4.5 border border-gray-150/90 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Variansi Rata-rata</p>
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {metrics.avg_variance}
            </h3>
            <p className="text-[11px] font-bold text-emerald-600 mt-0.5">
              {metrics.avg_variance_sub}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-xs shrink-0">
            <SlidersHorizontal className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Card 4: Total Selisih Penyesuaian */}
        <div className="bg-white rounded-2xl p-4.5 border border-gray-150/90 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Total Selisih Penyesuaian</p>
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {metrics.total_adjustment}
            </h3>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">
              {metrics.total_adjustment_sub}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-xs shrink-0">
            <Receipt className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* 4. Filter Controls & Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-150/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-50 hover:bg-gray-100/80 border border-gray-200/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30 cursor-pointer"
            >
              <option value="Semua Produk">Kategori: Semua Produk</option>
              {filterOptions.categories.map((c) => (
                <option key={c} value={c}>
                  Kategori: {c}
                </option>
              ))}
            </select>
          </div>

          {/* Officer Dropdown */}
          <div className="relative">
            <select
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              className="bg-gray-50 hover:bg-gray-100/80 border border-gray-200/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30 cursor-pointer"
            >
              <option value="Seluruh Tim">Petugas: Seluruh Tim</option>
              {filterOptions.officers.map((o) => (
                <option key={o} value={o}>
                  Petugas: {o}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-gray-50 hover:bg-gray-100/80 border border-gray-200/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30 cursor-pointer"
            >
              <option value="Semua Status">Status: Semua Status</option>
              <option value="Approved & Closed">Status: Approved & Closed</option>
              <option value="Reconciled">Status: Reconciled</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Kode Sesi, Kategori, atau Petugas..."
            className="w-full bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200/80 rounded-xl pl-10 pr-8 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 5. Main Content Area */}
      {activeTab === 'sessions' ? (
        /* ================= Riwayat Sesi SO Selesai ================= */
        <div className="space-y-4">
          {loadingSessions ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-150">
              <div className="w-8 h-8 border-3 border-[#FF4D15] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-semibold text-gray-500">Memuat riwayat sesi stock opname...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-150">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-gray-800">Tidak ada sesi yang cocok</h4>
              <p className="text-xs text-gray-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter yang dipilih.</p>
            </div>
          ) : (
            sessions.map((session) => {
              // Icon style based on icon_type
              const isGreen = session.icon_type === 'green'
              const isRed = session.icon_type === 'red'

              return (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl p-5 border border-gray-150/90 shadow-sm hover:shadow-md transition-all space-y-4"
                >
                  {/* Top Row: Icon + Session Info + Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Left Icon and Session Headers */}
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                          isGreen
                            ? 'bg-emerald-600 text-white'
                            : isRed
                            ? 'bg-indigo-50 text-rose-500 border border-indigo-100'
                            : 'bg-orange-50 text-[#FF4D15] border border-orange-100'
                        }`}
                      >
                        {isGreen ? (
                          <ClipboardList className="w-6 h-6 stroke-[2]" />
                        ) : isRed ? (
                          <Flame className="w-6 h-6 stroke-[2]" />
                        ) : (
                          <Sparkles className="w-6 h-6 stroke-[2]" />
                        )}
                      </div>

                      {/* Header Titles & Badges */}
                      <div>
                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[#FF4D15] font-extrabold bg-orange-50/80 px-2.5 py-0.5 rounded-lg text-xs">
                            #{session.session_code}
                          </span>

                          {session.status === 'Approved & Closed' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full text-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                              Approved & Closed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full text-xs">
                              <History className="w-3 h-3" />
                              Reconciled
                            </span>
                          )}

                          <span className="bg-blue-50/70 text-blue-600 font-semibold px-2.5 py-0.5 rounded-full text-xs">
                            {session.zone_location}
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="text-base font-extrabold text-gray-900 mt-1.5">
                          {session.category_name}
                        </h2>

                        {/* Sub metadata */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {session.formatted_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {session.duration_str}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            Petugas: <strong className="text-gray-700">{session.officers}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                      <button
                        onClick={() => setSelectedSessionDetail(session)}
                        className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200/90 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-gray-500" />
                        <span>Lihat Detail</span>
                      </button>

                      <button
                        onClick={() => handleDownloadSessionExcel(session.id)}
                        className="inline-flex items-center gap-1.5 bg-[#991B1B] hover:bg-[#7F1D1D] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-red-900/15 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Unduh Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Bottom Strip: 4 Metric Columns */}
                  <div className="bg-[#F8FAFC] rounded-xl px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 border border-gray-100">
                    {/* Col 1: Cakupan SKU */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400">Cakupan SKU</p>
                      <p className="text-xs font-extrabold text-gray-900 mt-0.5">
                        {session.counted_sku} / {session.total_sku} SKU
                      </p>
                    </div>

                    {/* Col 2: Akurasi Fisik vs Sistem / Selisih Fisik */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400">
                        {session.variance_units === 0 ? 'Akurasi Fisik vs Sistem' : 'Selisih Fisik'}
                      </p>
                      <p
                        className={`text-xs font-extrabold mt-0.5 ${
                          session.variance_units === 0
                            ? 'text-emerald-600'
                            : session.variance_units < 0
                            ? 'text-red-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {session.variance_units === 0
                          ? `Match ${session.accuracy_pct}%`
                          : `${session.variance_units > 0 ? '+' : ''}${session.variance_units} Pcs (${
                              session.variance_units < 0 ? 'Defisit' : 'Surplus'
                            })`}
                      </p>
                    </div>

                    {/* Col 3: Total Unit Terverifikasi */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400">Total Unit Terverifikasi</p>
                      <p className="text-xs font-extrabold text-gray-900 mt-0.5">
                        {session.total_units_verified.toLocaleString('id-ID')} Pcs
                      </p>
                    </div>

                    {/* Col 4: Nilai Selisih / Dampak Nilai Finansial */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400">
                        {session.financial_impact === 0 ? 'Nilai Selisih' : 'Dampak Nilai Finansial'}
                      </p>
                      <p
                        className={`text-xs font-extrabold mt-0.5 ${
                          session.financial_impact === 0
                            ? 'text-emerald-600'
                            : session.financial_impact < 0
                            ? 'text-red-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {session.financial_impact === 0
                          ? 'Rp 0 (Zero Loss)'
                          : `${session.financial_impact < 0 ? '-' : '+'}Rp ${Math.abs(
                              session.financial_impact
                            ).toLocaleString('id-ID')}`}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        /* ================= Tab 2: Audit Log Trail (Immutable) ================= */
        <div className="bg-white rounded-2xl border border-gray-150/90 shadow-sm overflow-hidden">
          {/* Action Filter Pills for Audit Trail */}
          <div className="p-4 md:p-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#F8FAFC]/50">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Catatan Aktivitas Sistem (Immutable Ledger)</h2>
              <p className="text-xs text-gray-400 mt-0.5">Seluruh peristiwa login, mutasi inventaris, scan rak, dan ekspor laporan tersimpan permanen.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 cursor-pointer"
              >
                <option value="all">Semua Jenis Aksi</option>
                <option value="SESSION_APPROVED">Session Approved</option>
                <option value="SESSION_COMPLETED">Session Completed</option>
                <option value="STOCK_RECONCILED">Stock Reconciled</option>
                <option value="ITEM_SCANNED">Item Scanned</option>
                <option value="REPORT_EXPORTED">Report Exported</option>
                <option value="USER_LOGIN">User Login</option>
              </select>

              <button
                onClick={() => handleDownloadAuditTrail('csv')}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-gray-400" />
                <span>Unduh CSV</span>
              </button>
            </div>
          </div>

          {/* Audit Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-5">WAKTU (WIB)</th>
                  <th className="py-3 px-5">PENGGUNA / PETUGAS</th>
                  <th className="py-3 px-5">TIPE AKSI</th>
                  <th className="py-3 px-5">DESKRIPSI AKTIVITAS</th>
                  <th className="py-3 px-5">ENTITAS TARGET</th>
                  <th className="py-3 px-5">ALAMAT IP & DEVICE</th>
                  <th className="py-3 px-5 text-right">RAW PAYLOAD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {loadingAudit ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Memuat log audit...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Belum ada catatan log aktivitas yang cocok.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Waktu */}
                      <td className="py-3.5 px-5 font-semibold text-gray-500 whitespace-nowrap">
                        {log.formatted_time}
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{log.user_name}</div>
                        <div className="text-[10px] text-gray-400">{log.user_role}</div>
                      </td>

                      {/* Tipe Aksi */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="font-mono text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                          {log.action}
                        </span>
                      </td>

                      {/* Deskripsi */}
                      <td className="py-3.5 px-5 font-semibold text-gray-800">
                        {log.action_label}
                      </td>

                      {/* Entitas */}
                      <td className="py-3.5 px-5 whitespace-nowrap font-mono text-gray-500">
                        {log.entity_id}
                      </td>

                      {/* IP & Perangkat */}
                      <td className="py-3.5 px-5 text-[11px] text-gray-400 whitespace-nowrap">
                        <span className="font-semibold text-gray-600">{log.ip_address}</span>
                      </td>

                      {/* Raw Payload Trigger */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedAuditPayload(log)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF4D15] hover:underline cursor-pointer"
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

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>
              Menampilkan {auditLogs.length} dari {auditTotal} catatan mutasi audit
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                disabled={auditPage <= 1}
                className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Sebelumnya
              </button>
              <span className="px-2 font-bold text-gray-800">
                Halaman {auditPage} dari {auditTotalPages}
              </span>
              <button
                onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                disabled={auditPage >= auditTotalPages}
                className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: LIHAT DETAIL SESI SO ================= */}
      {selectedSessionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 max-h-[90vh] flex flex-col shadow-2xl border border-gray-150 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[#FF4D15] font-extrabold bg-orange-50 px-2 py-0.5 rounded-md text-xs">
                    #{selectedSessionDetail.session_code}
                  </span>
                  <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-xs">
                    {selectedSessionDetail.status}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mt-1">
                  {selectedSessionDetail.category_name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedSessionDetail.zone_location} • Petugas: {selectedSessionDetail.officers} • {selectedSessionDetail.formatted_date}
                </p>
              </div>

              <button
                onClick={() => setSelectedSessionDetail(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Metrics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 my-3.5 bg-[#F8FAFC] rounded-2xl border border-gray-100 shrink-0">
              <div>
                <p className="text-[10px] font-semibold text-gray-400">Total SKU Terhitung</p>
                <p className="text-sm font-extrabold text-gray-900 mt-0.5">
                  {selectedSessionDetail.total_sku} SKU (100%)
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400">Akurasi Fisik</p>
                <p className={`text-sm font-extrabold mt-0.5 ${
                  selectedSessionDetail.variance_units === 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {selectedSessionDetail.accuracy_pct}% ({selectedSessionDetail.variance_units === 0 ? 'Match' : `${selectedSessionDetail.variance_units} Pcs`})
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400">Total Fisik Unit</p>
                <p className="text-sm font-extrabold text-gray-900 mt-0.5">
                  {selectedSessionDetail.total_units_verified.toLocaleString('id-ID')} Pcs
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400">Dampak Finansial</p>
                <p className={`text-sm font-extrabold mt-0.5 ${
                  selectedSessionDetail.financial_impact === 0 ? 'text-emerald-600' : selectedSessionDetail.financial_impact < 0 ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {selectedSessionDetail.financial_impact === 0 
                    ? 'Rp 0 (Zero Loss)' 
                    : `${selectedSessionDetail.financial_impact < 0 ? '-' : '+'}Rp ${Math.abs(selectedSessionDetail.financial_impact).toLocaleString('id-ID')}`}
                </p>
              </div>
            </div>

            {/* Notes if any */}
            {selectedSessionDetail.notes && (
              <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-800 shrink-0">
                <strong>Catatan Rekonsiliasi:</strong> {selectedSessionDetail.notes}
              </div>
            )}

            {/* Item Table Search */}
            <div className="mb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  placeholder="Cari barcode EAN, nama barang, atau rak..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30"
                />
              </div>
            </div>

            {/* Table of items (Scrollable) */}
            <div className="flex-1 overflow-y-auto border border-gray-150 rounded-2xl min-h-[160px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">BARCODE / SKU</th>
                    <th className="py-2.5 px-4">NAMA PRODUK</th>
                    <th className="py-2.5 px-4 text-center">LOKASI RAK</th>
                    <th className="py-2.5 px-4 text-right">SISTEM</th>
                    <th className="py-2.5 px-4 text-right">FISIK</th>
                    <th className="py-2.5 px-4 text-right">SELISIH</th>
                    <th className="py-2.5 px-4 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {filteredDetailItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-400">
                        Tidak ada item yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredDetailItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/60">
                        <td className="py-2.5 px-4 font-mono text-[11px] font-bold text-gray-600">
                          {item.barcode}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-gray-900">
                          {item.product_name}
                        </td>
                        <td className="py-2.5 px-4 text-center text-gray-500">
                          {item.shelf_location}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-gray-600">
                          {item.system_stock}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                          {item.physical_stock}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-extrabold ${
                          item.variance === 0 ? 'text-gray-400' : item.variance < 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {item.variance === 0 ? '0' : `${item.variance > 0 ? '+' : ''}${item.variance}`}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.status === 'Match'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.status === 'Defisit'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-400 font-medium">
                Format laporan siap diunduh dalam bentuk spreadsheet terenkripsi.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedSessionDetail(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={() => handleDownloadSessionExcel(selectedSessionDetail.id)}
                  className="bg-[#991B1B] hover:bg-[#7F1D1D] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-red-900/15"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Unduh Laporan Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RAW PAYLOAD AUDIT TRAIL ================= */}
      {selectedAuditPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-150 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h4 className="text-base font-bold text-gray-900">Detail Payload Mutasi Audit</h4>
                <p className="text-xs text-gray-400">Log ID: {selectedAuditPayload.id} • {selectedAuditPayload.formatted_time}</p>
              </div>
              <button
                onClick={() => setSelectedAuditPayload(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-400 font-semibold block text-[10px]">Aktor / Pengguna</span>
                  <span className="font-bold text-gray-800">{selectedAuditPayload.user_name}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block text-[10px]">Alamat IP</span>
                  <span className="font-mono text-gray-700">{selectedAuditPayload.ip_address}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block text-[10px]">Tipe Aksi</span>
                  <span className="font-mono font-bold text-indigo-600">{selectedAuditPayload.action}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block text-[10px]">Target Entitas</span>
                  <span className="font-mono text-gray-800">{selectedAuditPayload.entity_id}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-500 font-bold block mb-1">Before Value:</span>
                <pre className="bg-[#1E293B] text-emerald-400 p-3 rounded-xl text-[11px] font-mono overflow-x-auto">
                  {JSON.stringify(selectedAuditPayload.before_value, null, 2)}
                </pre>
              </div>

              <div>
                <span className="text-gray-500 font-bold block mb-1">After Value:</span>
                <pre className="bg-[#1E293B] text-amber-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto">
                  {JSON.stringify(selectedAuditPayload.after_value, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-gray-100 text-right">
              <button
                onClick={() => setSelectedAuditPayload(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
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
