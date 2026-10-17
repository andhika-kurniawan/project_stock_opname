'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  CalendarClock, 
  FileText, 
  Package, 
  Users,
  History,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard Overview', href: '/dashboard' },
    { icon: CalendarClock, label: 'Sesi SO Aktif', href: '/dashboard/sessions' },
    { icon: FileText, label: 'Rekap & Laporan', href: '/dashboard/reports' },
    { icon: Package, label: 'Master Stok', href: '/dashboard/products' },
    { icon: Users, label: 'Manajemen Petugas', href: '/dashboard/users' },
    { icon: History, label: 'Riwayat', href: '/dashboard/audit-logs' },
    { icon: Settings, label: 'Pengaturan', href: '/dashboard/settings' },
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const metrics = [
    { label: 'Total Item', value: '3,840', change: '+12%', icon: Package, color: 'bg-blue-500' },
    { label: 'Sesi SO Aktif', value: '2', change: '-1', icon: CalendarClock, color: 'bg-orange-500' },
    { label: 'Item Selisih', value: '124', change: '+8%', icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Net Variance', value: '-4.2%', change: '-0.8%', icon: TrendingDown, color: 'bg-purple-500' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#FF6B35] rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">STOCK OPNAME</h1>
              <p className="text-xs text-gray-500">Enterprise Suite</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors ${
                  isActive
                    ? 'bg-[#FF6B35] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Keluar Sesi
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="search"
                  placeholder="Cari SKU, produk, atau sesi..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live Sync</span>
              </div>

              <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-6 h-6 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF6B35] rounded-full flex items-center justify-center text-white font-semibold">
                  AR
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Aditya R.</p>
                  <p className="text-sm text-gray-500">Manager Ops</p>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard content */}
        <main className="flex-1 p-6">
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
              <button className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white rounded-xl hover:bg-[#FF4D1A]">
                <Plus className="w-4 h-4" />
                Sesi Baru
              </button>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric) => {
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
                  <h3 className="text-lg font-semibold text-gray-900">Daftar Audit SKU</h3>
                  <p className="text-gray-500 text-sm">3.840 item • Terakhir diupdate 17/10/2024 14:30</p>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Produk</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Sistem</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fisik</th>
                    <th className="px6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selisih</th>
                    <th className="px6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Petugas</th>
                    <th className="px6 py3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { sku: 'SKU-001', name: 'Speaker BT JBL Go', system: 45, physical: 45, diff: 0, status: 'Cocok', user: 'Andi' },
                    { sku: 'SKU-002', name: 'Mouse Wireless Logitech', system: 32, physical: 30, diff: -2, status: 'Deficit', user: 'Budi' },
                    { sku: 'SKU-003', name: 'Kabel USB-C 2m', system: 150, physical: 152, diff: +2, status: 'Surplus', user: 'Cici' },
                    { sku: 'SKU-004', name: 'Powerbank 20.000 mAh', system: 28, physical: 28, diff: 0, status: 'Cocok', user: 'Dedi' },
                    { sku: 'SKU-005', name: 'Headphone Gaming', system: 19, physical: 18, diff: -1, status: 'Deficit', user: 'Eva' },
                  ].map((item) => (
                    <tr key={item.sku} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.sku}</td>
                      <td className="px-6 py-4">{item.name}</td>
                      <td className="px-6 py-4">{item.system}</td>
                      <td className="px-6 py-4">{item.physical}</td>
                      <td className={`px-6 py-4 font-medium ${item.diff === 0 ? 'text-gray-900' : item.diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.diff > 0 ? '+' : ''}{item.diff}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === 'Cocok' ? 'bg-green-100 text-green-800' :
                          item.status === 'Deficit' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {item.status === 'Cocok' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{item.user}</td>
                      <td className="px-6 py-4">
                        <button className="text-[#FF6B35] hover:text-[#FF4D1A] text-sm font-medium">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Menampilkan 5 dari 3.840 item
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">←</button>
                <span className="px-3 py-1 bg-[#FF6B35] text-white rounded">1</span>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">3</button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">...</button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">→</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
