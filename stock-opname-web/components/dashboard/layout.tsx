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
    { icon: FileText, label: 'Rekapitulasi & Laporan', href: '/dashboard/reports' },
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

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
