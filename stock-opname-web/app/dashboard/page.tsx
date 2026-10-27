'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  CalendarClock, 
  Package, 
  AlertTriangle, 
  TrendingDown,
  TrendingUp,
  ChevronDown,
  CheckCircle,
  AlertTriangle as AlertTriangleIcon,
  RefreshCw,
  Download
} from 'lucide-react'
import type { 
  DashboardMetrics, 
  DailyProgressItem, 
  DistributionItem, 
  RecentAuditItem 
} from '@/lib/dashboard-repository'

export default function DashboardOverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProducts: 17,
    activeSessions: 1,
    itemsWithVariance: 0,
    netVariancePercent: 0,
    totalCountedItems: 0,
    totalMatchedItems: 0,
    accuracyRate: 100
  })

  const [dailyProgress, setDailyProgress] = useState<DailyProgressItem[]>([])
  const [distribution, setDistribution] = useState<DistributionItem[]>([])
  const [recentItems, setRecentItems] = useState<RecentAuditItem[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all')
  const [periodInfo, setPeriodInfo] = useState({
    label: 'Gudang Utama • Rak 12-15',
    startDate: '',
    endDate: '',
    currentSessionCode: 'S03-P24'
  })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false)
  const [selectedPeriodPreset, setSelectedPeriodPreset] = useState<'7days' | '30days' | 'month'>('7days')

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (isSilent) setRefreshing(true)

    try {
      const url = selectedCategoryFilter !== 'all' 
        ? `/api/dashboard/overview?category=${encodeURIComponent(selectedCategoryFilter)}`
        : '/api/dashboard/overview'

      const res = await fetch(url)
      const json = await res.json()

      if (json.success && json.data) {
        setMetrics(json.data.metrics)
        setDailyProgress(json.data.dailyProgress)
        setDistribution(json.data.distribution)
        setRecentItems(json.data.recentItems)
        setCategories(json.data.categories)
        if (json.data.period) {
          setPeriodInfo(json.data.period)
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard overview:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedCategoryFilter])

  useEffect(() => {
    let isMounted = true
    const url = selectedCategoryFilter !== 'all' 
      ? `/api/dashboard/overview?category=${encodeURIComponent(selectedCategoryFilter)}`
      : '/api/dashboard/overview'

    fetch(url)
      .then(res => res.json())
      .then(json => {
        if (isMounted && json.success && json.data) {
          setMetrics(json.data.metrics)
          setDailyProgress(json.data.dailyProgress)
          setDistribution(json.data.distribution)
          setRecentItems(json.data.recentItems)
          setCategories(json.data.categories)
          if (json.data.period) setPeriodInfo(json.data.period)
          setLoading(false)
        }
      })
      .catch(err => {
        console.error(err)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedCategoryFilter])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/history/export?type=sessions&format=xlsx')
      if (!res.ok) throw new Error('Gagal mengekspor laporan')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Rekap_Stock_Opname_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export error:', e)
    } finally {
      setExporting(false)
    }
  }

  const metricCards = [
    { 
      label: 'Total Item Terdaftar', 
      value: metrics.totalProducts.toLocaleString('id-ID'), 
      change: '+12%', 
      sublabel: 'SKU dalam master database',
      icon: Package, 
      color: 'bg-blue-500',
      lightBg: 'bg-blue-50 text-blue-600 border-blue-100'
    },
    { 
      label: 'Sesi SO Aktif', 
      value: metrics.activeSessions.toString(), 
      change: metrics.activeSessions > 0 ? 'Sedang Berjalan' : 'Selesai', 
      sublabel: `${metrics.totalCountedItems} item telah diverifikasi`,
      icon: CalendarClock, 
      color: 'bg-[#FF6B35]',
      lightBg: 'bg-orange-50 text-[#FF6B35] border-orange-100'
    },
    { 
      label: 'Item Selisih', 
      value: metrics.itemsWithVariance.toString(), 
      change: metrics.itemsWithVariance === 0 ? '0 Selisih (Akurat)' : `${metrics.itemsWithVariance} Perlu Ditinjau`, 
      sublabel: metrics.itemsWithVariance === 0 ? 'Semua SKU cocok sempurna' : 'Ditemukan selisih stok fisik',
      icon: AlertTriangle, 
      color: metrics.itemsWithVariance === 0 ? 'bg-emerald-500' : 'bg-red-500',
      lightBg: metrics.itemsWithVariance === 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
    },
    { 
      label: 'Net Variance', 
      value: `${metrics.netVariancePercent.toFixed(1)}%`, 
      change: metrics.netVariancePercent === 0 ? '0.0% Sempurna' : `±${metrics.netVariancePercent.toFixed(1)}%`, 
      sublabel: `Tingkat Akurasi: ${metrics.accuracyRate}%`,
      icon: TrendingDown, 
      color: 'bg-purple-500',
      lightBg: 'bg-purple-50 text-purple-600 border-purple-100'
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold text-sm">Memuat data real-time dashboard...</p>
          <p className="text-gray-400 text-xs mt-1">Menghubungkan ke PostgreSQL database</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Stock Opname Overview</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-600">
            <span className="font-medium text-gray-700">{periodInfo.label}</span>
            <span className="text-gray-300">•</span>
            <span className="bg-orange-50 text-[#FF6B35] font-semibold px-2 py-0.5 rounded-md border border-orange-200/60">
              Sesi: #{periodInfo.currentSessionCode}
            </span>
            <span className="text-gray-300">•</span>
            <span>Tanggal: {periodInfo.startDate} – {periodInfo.endDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200/90 bg-white hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Segarkan data dari database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? 'animate-spin text-[#FF6B35]' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Segarkan'}</span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 border border-gray-200/90 bg-white hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 shadow-sm transition-all cursor-pointer"
            >
              <span>
                {selectedPeriodPreset === '7days' ? '7 Hari Terakhir' : selectedPeriodPreset === '30days' ? '30 Hari Terakhir' : 'Bulan Ini'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isPeriodDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-150 rounded-xl shadow-lg p-1.5 z-20 text-xs">
                <button 
                  onClick={() => { setSelectedPeriodPreset('7days'); setIsPeriodDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium cursor-pointer ${selectedPeriodPreset === '7days' ? 'bg-orange-50 text-[#FF6B35] font-bold' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  7 Hari Terakhir (Mingguan)
                </button>
                <button 
                  onClick={() => { setSelectedPeriodPreset('30days'); setIsPeriodDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium cursor-pointer ${selectedPeriodPreset === '30days' ? 'bg-orange-50 text-[#FF6B35] font-bold' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  30 Hari Terakhir
                </button>
                <button 
                  onClick={() => { setSelectedPeriodPreset('month'); setIsPeriodDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium cursor-pointer ${selectedPeriodPreset === 'month' ? 'bg-orange-50 text-[#FF6B35] font-bold' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  Bulan Ini (Oktober 2026)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="bg-white rounded-2xl shadow-sm border border-gray-150/90 p-5.5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3.5">
                <div className={`p-3 ${metric.color} rounded-xl text-white shadow-sm`}>
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${metric.lightBg}`}>
                  {metric.change}
                </span>
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{metric.value}</h3>
              <p className="text-xs font-bold text-gray-700 mt-0.5">{metric.label}</p>
              <p className="text-[11px] text-gray-400 mt-1">{metric.sublabel}</p>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Progress Opname Harian */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-150/90 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Progress Opname Harian</h3>
                <span className="bg-orange-50 text-[#FF6B35] text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200/60">
                  Live DB
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Rata-rata penyelesaian pemindaian SKU per hari</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-400">Target harian: 25 SKU</span>
            </div>
          </div>

          {/* Chart Graphic Container */}
          <div className="h-60 w-full flex items-end justify-between gap-2.5 pt-6 pb-2 px-1 border-b border-gray-100">
            {dailyProgress.map((day) => {
              const hasCount = day.countedItems > 0
              // Calculate actual height in px for container of height 170px
              const barHeightPx = hasCount ? Math.min(170, Math.max(36, Math.round((day.percentage / 100) * 160))) : 8

              return (
                <div key={day.dayKey} className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[11px] font-medium py-1 px-2.5 rounded-lg pointer-events-none whitespace-nowrap shadow-md z-30">
                    <span className="font-bold text-orange-400">{day.dayName} ({day.formattedDate})</span>: {day.countedItems} SKU terverifikasi
                  </div>

                  {/* Top value badge */}
                  {hasCount ? (
                    <span className={`text-[11px] font-extrabold mb-1.5 transition-transform group-hover:-translate-y-0.5 ${day.isToday ? 'text-[#FF6B35]' : 'text-gray-700'}`}>
                      {day.countedItems}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-gray-300 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      0
                    </span>
                  )}

                  {/* Bar Graphic */}
                  <div className="w-full flex items-end justify-center h-44">
                    <div
                      className={`w-full max-w-[34px] rounded-t-xl transition-all duration-500 ease-out ${
                        day.isToday
                          ? 'bg-gradient-to-t from-[#FF4D1A] to-[#FF8C61] shadow-md shadow-orange-500/30'
                          : hasCount
                          ? 'bg-gradient-to-t from-gray-300 to-gray-200 group-hover:from-orange-300 group-hover:to-orange-200'
                          : 'bg-gray-100 group-hover:bg-gray-200 rounded-b-md'
                      }`}
                      style={{ height: `${barHeightPx}px` }}
                    ></div>
                  </div>

                  {/* Day and Date Labels */}
                  <div className="mt-3 text-center">
                    <span className={`block text-xs font-bold leading-tight ${day.isToday ? 'text-[#FF6B35]' : 'text-gray-600'}`}>
                      {day.dayKey}
                    </span>
                    <span className="block text-[10px] font-medium text-gray-400 mt-0.5">
                      {day.formattedDate}
                    </span>
                    {day.isToday && (
                      <span className="inline-block w-1.5 h-1.5 bg-[#FF6B35] rounded-full mt-1"></span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-3 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#FF6B35]"></span>
              <span className="font-semibold text-gray-700">Hari Ini (Aktif)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-300"></span>
              <span>Hari Sebelumnya</span>
            </span>
          </div>
        </div>

        {/* Chart 2: Distribusi Akurasi / Selisih */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-150/90 p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Distribusi Akurasi</h3>
                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Kategori & Rak
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Komparasi kesesuaian fisik vs sistem per area</p>
            </div>

            {/* Legend with active counts */}
            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-500 rounded-md shadow-xs"></div>
                <span className="text-gray-700">Cocok ({metrics.totalMatchedItems})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-rose-500 rounded-md shadow-xs"></div>
                <span className="text-gray-700">Selisih ({metrics.itemsWithVariance})</span>
              </div>
            </div>
          </div>

          {/* Distribution Graphic Container */}
          <div className="h-60 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-1 border-b border-gray-100">
            {distribution.map((item) => {
              const isUncounted = item.status === 'uncounted'
              const isPerfect = item.status === 'perfect'
              const hasVariance = item.status === 'has_variance'

              return (
                <div key={item.id} className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[11px] font-medium py-1.5 px-3 rounded-lg pointer-events-none whitespace-nowrap shadow-md z-30">
                    <p className="font-bold text-orange-400">{item.name}</p>
                    <p className="text-gray-300">
                      {isUncounted ? (
                        'Belum ada penghitungan fisik'
                      ) : (
                        `Cocok: ${item.matchCount} SKU (${item.matchPercent}%) • Selisih: ${item.varianceCount} SKU (${item.variancePercent}%)`
                      )}
                    </p>
                  </div>

                  {/* Status Tag Header */}
                  <div className="mb-2">
                    {isPerfect && (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-1.5 py-0.5 rounded border border-emerald-200">
                        100%
                      </span>
                    )}
                    {hasVariance && (
                      <span className="bg-rose-50 text-rose-700 text-[10px] font-black px-1.5 py-0.5 rounded border border-rose-200">
                        {item.matchPercent}%
                      </span>
                    )}
                    {isUncounted && (
                      <span className="text-[10px] font-bold text-gray-400">
                        0 SKU
                      </span>
                    )}
                  </div>

                  {/* Stacked Graphic Bar Area */}
                  <div className="w-full flex items-end justify-center h-44">
                    {isUncounted ? (
                      /* Empty State: Rak belum dihitung */
                      <div className="w-full max-w-[34px] h-32 rounded-xl border-2 border-dashed border-gray-200/90 bg-gray-50/70 flex flex-col items-center justify-center gap-1 group-hover:border-gray-300 transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                        <span className="text-[9px] font-bold text-gray-400">N/A</span>
                      </div>
                    ) : isPerfect ? (
                      /* Zero Variance / 100% Cocok: Full Emerald Bar */
                      <div className="w-full max-w-[34px] h-[150px] bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400 rounded-xl shadow-sm shadow-emerald-500/25 group-hover:brightness-105 transition-all"></div>
                    ) : (
                      /* Has Variance: Stacked Selisih (Red) on top of Cocok (Green) */
                      <div className="w-full max-w-[34px] h-[150px] flex flex-col justify-end gap-1">
                        {item.variancePercent > 0 && (
                          <div 
                            className="w-full bg-gradient-to-t from-rose-600 to-rose-500 rounded-t-xl transition-all shadow-xs"
                            style={{ height: `${Math.max(16, Math.round((item.variancePercent / 100) * 140))}px` }}
                          ></div>
                        )}
                        {item.matchPercent > 0 && (
                          <div 
                            className="w-full bg-gradient-to-t from-emerald-600 to-emerald-500 rounded-b-xl transition-all shadow-xs"
                            style={{ height: `${Math.max(16, Math.round((item.matchPercent / 100) * 140))}px` }}
                          ></div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Labels */}
                  <div className="mt-3 text-center">
                    <span className="block text-xs font-bold text-gray-700 leading-tight">
                      {item.shortName}
                    </span>
                    <span className="block text-[10px] font-medium text-gray-400 mt-0.5 truncate max-w-[65px]" title={item.name}>
                      {item.name.split(' ')[0]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-3 pt-1">
            <span className="text-gray-400 font-medium">Kategori Rak 12–16</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Akurasi Rata-rata: {metrics.accuracyRate}%
            </span>
          </div>
        </div>

      </div>

      {/* Data Table: Recent SKU Audits */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-150/90 overflow-hidden">
        <div className="p-6 border-b border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Daftar Audit SKU Terbaru</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {recentItems.length} produk terbaru diverifikasi • Terhubung langsung ke database
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <select 
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="border border-gray-200/90 bg-gray-50 hover:bg-gray-100/70 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/40 cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Export Button */}
            <button 
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200/90 bg-white hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>{exporting ? 'Mengunduh...' : 'Export Excel'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-150 bg-gray-50/75 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3.5">Barcode / SKU</th>
                <th className="px-6 py-3.5">Nama Produk</th>
                <th className="px-6 py-3.5">Kategori & Rak</th>
                <th className="px-6 py-3.5 text-center">Stok Sistem</th>
                <th className="px-6 py-3.5 text-center">Stok Fisik</th>
                <th className="px-6 py-3.5 text-center">Selisih</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5">Petugas SO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-medium">
                    Tidak ada item yang sesuai dengan filter kategori
                  </td>
                </tr>
              ) : (
                recentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      {item.barcode}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900 block">{item.name}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="block font-medium">{item.category}</span>
                      <span className="text-[10px] text-gray-400 font-mono">Rak: {item.shelf_location}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-800">
                      {item.system_stock}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900">
                      {item.physical_stock !== null ? item.physical_stock : '-'}
                    </td>
                    <td className={`px-6 py-4 text-center font-black ${
                      item.variance === null ? 'text-gray-300' :
                      item.variance === 0 ? 'text-emerald-600' : 
                      item.variance > 0 ? 'text-blue-600' : 'text-rose-600'
                    }`}>
                      {item.variance !== null ? (item.variance > 0 ? `+${item.variance}` : item.variance) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        item.status === 'Cocok' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        item.status === 'Defisit' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        item.status === 'Surplus' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {item.status === 'Cocok' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                        {item.status === 'Defisit' && <AlertTriangleIcon className="w-3 h-3 text-rose-600" />}
                        {item.status === 'Surplus' && <TrendingUp className="w-3 h-3 text-blue-600" />}
                        <span>{item.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">
                      {item.user}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3.5 bg-gray-50/50 border-t border-gray-150 flex items-center justify-between text-xs text-gray-500">
          <span>Menampilkan {recentItems.length} SKU terbaru</span>
          <span className="font-semibold text-gray-600">Sinkronisasi otomatis dengan sesi aktif</span>
        </div>
      </div>
    </div>
  )
}