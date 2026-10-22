'use client'

import { useState, useEffect } from 'react'
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
  TrendingDown,
  AlertTriangle,
  Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userProfile, setUserProfile] = useState<{ full_name: string; role: string; email: string } | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('full_name, role, email')
          .eq('id', user.id)
          .single()
        if (data) setUserProfile(data)
      }
    }
    loadUser()
  }, [supabase])

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
    window.location.href = '/login'
  }

  const initials = userProfile?.full_name 
    ? userProfile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0 min-h-screen">
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

        <nav className="flex-1 px-4 overflow-y-auto">
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

        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-colors cursor-pointer"
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-gray-900"
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
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{userProfile?.full_name || 'Memuat...'}</p>
                  <p className="text-sm text-gray-500 capitalize">{userProfile?.role || '-'}</p>
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
