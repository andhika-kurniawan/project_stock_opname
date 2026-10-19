'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  CalendarClock, 
  Package, 
  AlertTriangle, 
  TrendingDown,
  TrendingUp,
  Plus,
  ChevronDown,
  FileText,
  CheckCircle,
  AlertTriangle as AlertTriangleIcon 
} from 'lucide-react'

interface DashboardMetrics {
  totalProducts: number
  activeSessions: number
  itemsWithVariance: number
  netVariancePercent: number
}

interface RecentItem {
  id: string
  barcode: string
  name: string
  category: string
  system_stock: number
  physical_stock: number | null
  variance: number | null
  status: string
  user: string
  updated_at: string
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProducts: 0,
    activeSessions: 0,
    itemsWithVariance: 0,
    netVariancePercent: 0
  })
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    const [productsRes, sessionsRes, itemsRes] = await Promise.all([
      supabase.from('products').select('id, system_stock', { count: 'exact' }),
      supabase.from('so_sessions').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('so_items').select(`
        id,
        system_stock,
        physical_stock,
        variance,
        is_counted,
        updated_at,
        products:product_id (barcode, name, categories:category_id (name)),
        users:counted_by (full_name)
      `).order('updated_at', { ascending: false }).limit(5)
    ])

    const totalProducts = productsRes.count || 0
    const activeSessions = sessionsRes.count || 0

    let itemsWithVariance = 0
    let totalVariance = 0
    let totalSystemStock = 0

    if (itemsRes.data) {
      itemsRes.data.forEach((item: any) => {
        if (item.variance !== null && item.variance !== 0) {
          itemsWithVariance++
        }
        if (item.variance !== null) {
          totalVariance += item.variance
          totalSystemStock += item.system_stock
        }
      })
    }

    const netVariancePercent = totalSystemStock > 0 
      ? ((totalVariance / totalSystemStock) * 100) 
      : 0

    setMetrics({
      totalProducts,
      activeSessions,
      itemsWithVariance,
      netVariancePercent
    })

    if (itemsRes.data) {
      setRecentItems(itemsRes.data.map((item: any) => ({
        id: item.id,
        barcode: item.products?.barcode || '-',
        name: item.products?.name || '-',
        category: item.products?.categories?.name || '-',
        system_stock: item.system_stock,
        physical_stock: item.physical_stock,
        variance: item.variance,
        status: item.variance === null ? 'Belum scan' : item.variance === 0 ? 'Cocok' : item.variance > 0 ? 'Surplus' : 'Deficit',
        user: item.users?.full_name || '-',
        updated_at: item.updated_at
      })))
    }

    setLoading(false)
  }

  const metricCards = [
    { 
      label: 'Total Item', 
      value: metrics.totalProducts.toLocaleString(), 
      change: '+12%', 
      icon: Package, 
      color: 'bg-blue-500' 
    },
    { 
      label: 'Sesi SO Aktif', 
      value: metrics.activeSessions.toString(), 
      change: '-1', 
      icon: CalendarClock, 
      color: 'bg-orange-500' 
    },
    { 
      label: 'Item Selisih', 
      value: metrics.itemsWithVariance.toString(), 
      change: '+8%', 
      icon: AlertTriangle, 
      color: 'bg-red-500' 
    },
    { 
      label: 'Net Variance', 
      value: `${metrics.netVariancePercent.toFixed(1)}%`, 
      change: '-0.8%', 
      icon: TrendingDown, 
      color: 'bg-purple-500' 
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Stock Opname Overview</h1>
          <div className="flex items-center gap-2 text-gray-600">
            <span>Gudang Utama • Rak 12-15</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm bg-gray-100 px-2 py-1 rounded">Sesi: S03-P24</span>
            <span className="text-gray-300">|</span>
            <span>Tanggal: 17-24 Okt 2026</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">
            <span>Filter Periode</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metricCards.map((metric) => {
          const Icon = metric.icon
          const isPositive = metric.change.startsWith('+')
          return (
            <div key={metric.label} className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 ${metric.color} rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {metric.change}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
              <p className="text-gray-500">{metric.label}</p>
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Progress chart */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Progress Opname Harian</h3>
              <p className="text-gray-500 text-sm">Rata-rata penyelesaian per hari</p>
            </div>
            <button className="text-[#FF6B35] text-sm font-medium">Detail</button>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const height = [65, 80, 45, 90, 70, 55, 85][i]
              return (
                <div key={day} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-lg ${i === 3 ? 'bg-[#FF6B35]' : 'bg-gray-200'}`}
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="mt-2 text-sm text-gray-500">{day}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Distribution chart */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Distribusi Akurasi</h3>
              <p className="text-gray-500 text-sm">Kategori berdasarkan selisih</p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Cocok</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Selisih</span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {['Rak 12', 'Rak 13', 'Rak 14', 'Rak 15', 'Rak 16'].map((rack, i) => {
              const match = [70, 85, 60, 90, 75][i]
              const diff = [30, 15, 40, 10, 25][i]
              return (
                <div key={rack} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col gap-1">
                    <div
                      className="w-full bg-green-500 rounded-lg"
                      style={{ height: `${match}%` }}
                    ></div>
                    <div
                      className="w-full bg-red-500 rounded-lg"
                      style={{ height: `${diff}%` }}
                    ></div>
                  </div>
                  <span className="mt-2 text-sm text-gray-500">{rack}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Data table */}
      <div className="bg-white rounded-2xl shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Daftar Audit SKU Terbaru</h3>
              <p className="text-gray-500 text-sm">{recentItems.length} item terbaru • Data real-time</p>
            </div>
            <div className="flex items-center gap-3">
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option>Filter Kategori</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <FileText className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Produk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Sistem</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fisik</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selisih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Belum ada data audit SKU
                  </td>
                </tr>
              ) : (
                recentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{item.barcode}</td>
                    <td className="px-6 py-4">{item.name}</td>
                    <td className="px-6 py-4">{item.category}</td>
                    <td className="px-6 py-4 text-center">{item.system_stock}</td>
                    <td className="px-6 py-4 text-center">
                      {item.physical_stock !== null ? item.physical_stock : '-'}
                    </td>
                    <td className={`px-6 py-4 text-center font-medium ${
                      item.variance === null ? 'text-gray-400' :
                      item.variance === 0 ? 'text-gray-900' : 
                      item.variance > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.variance !== null ? (item.variance > 0 ? `+${item.variance}` : item.variance) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'Cocok' ? 'bg-green-100 text-green-800' :
                        item.status === 'Deficit' ? 'bg-red-100 text-red-800' :
                        item.status === 'Surplus' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.status === 'Cocok' ? <CheckCircle className="w-3 h-3 mr-1" /> : 
                         item.status === 'Belum scan' ? null :
                         <AlertTriangleIcon className="w-3 h-3 mr-1" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{item.user}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Menampilkan {recentItems.length} item terbaru
          </div>
        </div>
      </div>
    </>
  )
}