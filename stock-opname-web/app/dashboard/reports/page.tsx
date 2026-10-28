'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Calendar, 
  Search, 
  FileText, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Package,
  Info,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react'

interface ReportItem {
  id: string
  barcode: string
  name: string
  category: string
  system_stock: number
  physical_stock: number | null
  variance: number | null
  variance_percent: number | null
  variance_value: number | null
  price: number
}

export default function ReportsPage() {
  const [items, setItems] = useState<ReportItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ReportItem[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const supabase = createClient()

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch categories
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')
      if (catData) setCategories(catData)

      // Fetch items
      const { data, error } = await supabase
        .from('so_items')
        .select(`
          id,
          system_stock,
          physical_stock,
          variance,
          products:product_id (
            barcode, 
            name, 
            system_stock,
            categories:category_id (name)
          )
        `)
        .order('updated_at', { ascending: false })

      if (!error && data) {
        const benchmarkUnitPrice = 150000 // Nilai acuan audit untuk kalkulasi dampak finansial inventaris
        const mapped = data.map((item: any) => {
          const variance = item.variance
          const variancePercent = item.system_stock > 0 && variance !== null 
            ? (variance / item.system_stock) * 100 
            : 0
          const varianceValue = variance !== null ? variance * benchmarkUnitPrice : 0

          return {
            id: item.id,
            barcode: item.products?.barcode || '-',
            name: item.products?.name || '-',
            category: item.products?.categories?.name || '-',
            system_stock: item.system_stock,
            physical_stock: item.physical_stock,
            variance: variance,
            variance_percent: variancePercent,
            variance_value: varianceValue,
            price: benchmarkUnitPrice
          }
        })
        setItems(mapped)
      }
    } catch (err) {
      console.error('Error fetching report data:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  useEffect(() => {
    let result = items

    if (searchQuery) {
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory)
    }

    if (activeTab === 'variance') {
      result = result.filter(item => item.variance !== null && item.variance !== 0)
    } else if (activeTab === 'match') {
      result = result.filter(item => item.variance === 0)
    } else if (activeTab === 'deficit') {
      result = result.filter(item => item.variance !== null && item.variance < 0)
    } else if (activeTab === 'surplus') {
      result = result.filter(item => item.variance !== null && item.variance > 0)
    }

    setFilteredItems(result)
  }, [items, searchQuery, selectedCategory, activeTab])

  // Handle Export Excel
  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/history/export?type=sessions&format=xlsx')
      if (!res.ok) throw new Error('Gagal mengunduh laporan')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Laporan_Rekonsiliasi_Stock_Opname_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(`Gagal mengekspor laporan: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  // Handle Print PDF
  const handlePrintPDF = () => {
    window.print()
  }

  // KPI Calculations
  const totalAudited = items.length
  const matchCount = items.filter(i => i.variance === 0).length
  const matchRate = totalAudited > 0 ? (matchCount / totalAudited) * 100 : 0
  
  const deficitCount = items.filter(i => i.variance !== null && i.variance < 0).length
  const surplusCount = items.filter(i => i.variance !== null && i.variance > 0).length
  
  const netVarianceValue = items.reduce((acc, item) => acc + (item.variance_value || 0), 0)
  
  const totalSystemStock = items.reduce((acc, item) => acc + item.system_stock, 0)
  const totalPhysicalStock = items.reduce((acc, item) => acc + (item.physical_stock || 0), 0)
  const unitAccuracy = totalSystemStock > 0 ? (totalPhysicalStock / totalSystemStock) * 100 : 0

  const tabs = [
    { id: 'all', label: 'Semua SKU' },
    { id: 'variance', label: 'Hanya Selisih / Variance' },
    { id: 'match', label: 'Sesuai / Cocok' },
    { id: 'deficit', label: 'Defisit Saja' },
    { id: 'surplus', label: 'Surplus Saja' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat Laporan Rekonsiliasi...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="font-['Plus_Jakarta_Sans'] pb-12">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Rekapitulasi & Laporan</h1>
          <p className="text-gray-500 text-sm mt-0.5">Laporan hasil audit stok fisik, perbandingan varians, dan rekonsiliasi inventaris</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrintPDF}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-gray-500" />
            Cetak Ringkasan PDF
          </button>
          <button 
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-black text-white rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            {exporting ? 'Mengekspor...' : 'Export Laporan Excel (.xlsx)'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-150 mb-6 flex flex-col md:flex-row gap-4 items-center">
        {/* Category Filter */}
        <div className="relative min-w-[220px]">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2 text-sm font-semibold text-gray-700 pr-9 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Search Bar */}
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari berdasarkan Barcode atau Nama Produk..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
          />
        </div>

        {/* Refresh button */}
        <button
          onClick={() => fetchReportData()}
          className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          title="Segarkan Data Laporan"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Total SKU Diaudit</p>
          <h3 className="text-2xl font-black text-gray-900">{totalAudited}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Match Rate Stok</p>
          <h3 className="text-2xl font-black text-emerald-600">{matchRate.toFixed(1)}%</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">SKU Selisih</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-red-600">{deficitCount + surplusCount}</h3>
            <span className="text-xs text-gray-500 font-medium">({deficitCount} Def / {surplusCount} Sur)</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Est. Dampak Finansial</p>
          <h3 className={`text-2xl font-black ${netVarianceValue < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            Rp {Math.abs(netVarianceValue).toLocaleString('id-ID')}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Akurasi Unit Fisik</p>
          <h3 className="text-2xl font-black text-blue-600">{unitAccuracy.toFixed(1)}%</h3>
        </div>
      </div>

      {/* Quick Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-gray-900 text-white shadow-sm' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Barcode</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Produk</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Sistem</th>
                <th className="px-6 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Fisik</th>
                <th className="px-6 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Selisih</th>
                <th className="px-6 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">% Var</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Est. Nilai Selisih</th>
                <th className="px-6 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 text-sm">
                    Tidak ada data rekonsiliasi yang sesuai dengan kriteria pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-gray-900">
                      {item.barcode}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                    <td className="px-6 py-4 text-center text-sm font-medium">{item.system_stock}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                      {item.physical_stock !== null ? item.physical_stock : '-'}
                    </td>
                    <td className={`px-6 py-4 text-center text-sm font-extrabold ${
                      item.variance === null ? 'text-gray-400' :
                      item.variance === 0 ? 'text-gray-900' :
                      item.variance > 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {item.variance !== null ? (item.variance > 0 ? `+${item.variance}` : item.variance) : '-'}
                    </td>
                    <td className={`px-6 py-4 text-center text-sm font-bold ${
                      item.variance_percent === null ? 'text-gray-400' :
                      item.variance_percent === 0 ? 'text-gray-900' :
                      item.variance_percent > 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {item.variance_percent !== null ? `${item.variance_percent.toFixed(1)}%` : '-'}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-semibold ${
                      item.variance_value === null ? 'text-gray-400' :
                      item.variance_value === 0 ? 'text-gray-900' :
                      item.variance_value > 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {item.variance_value !== null ? `Rp ${Math.abs(item.variance_value).toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.variance === null ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          Belum
                        </span>
                      ) : item.variance === 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Cocok
                        </span>
                      ) : item.variance < 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                          <TrendingDown className="w-3.5 h-3.5 mr-1" /> Defisit
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          <TrendingUp className="w-3.5 h-3.5 mr-1" /> Surplus
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="bg-blue-50 border border-blue-150 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-blue-900">Prosedur Rekonsiliasi & Write-off Inventaris</h4>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            Selisih defisit yang terverifikasi pada sesi ini dapat diekspor langsung ke berkas Excel (.xlsx) untuk diajukan ke bagian akuntansi atau penyesuaian stok sistem.
          </p>
        </div>
      </div>
    </div>
  )
}
