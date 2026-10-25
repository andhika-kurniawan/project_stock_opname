'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Radio, 
  FileSpreadsheet, 
  CloudUpload, 
  Users,
  History,
  Settings,
  LogOut,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  ArrowLeftRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const supabase = createClient()
  const [userProfile, setUserProfile] = useState<{ full_name: string; role: string; email: string } | null>({
    full_name: 'Aditya R.',
    role: 'Manager Ops',
    email: 'aditya.admin@stockify.ops'
  })

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await (supabase as any)
            .from('users')
            .select('full_name, role, email')
            .eq('id', user.id)
            .single()
          if (data) {
            const name = (data as any).full_name
            setUserProfile({
              full_name: (name && name !== 'Administrator') ? name : 'Aditya R.',
              role: (data as any).role === 'admin' ? 'Manager Ops' : 'Petugas SO',
              email: (data as any).email
            })
          }
        }
      } catch {
        // Fallback to default reference profile
      }
    }
    loadUser()
  }, [supabase])

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore
    }
    window.location.href = '/login'
  }

  const menuSections = [
    {
      title: 'MENU UTAMA',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard Overview', href: '/dashboard' },
        { 
          icon: Radio, 
          label: 'Sesi SO Aktif', 
          href: '/dashboard/sessions',
          badge: <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ml-auto"></span>
        },
        { icon: FileSpreadsheet, label: 'Rekapitulasi & Laporan', href: '/dashboard/reports' },
      ]
    },
    {
      title: 'MASTER & AUDIT',
      items: [
        { icon: CloudUpload, label: 'Master Stok & Import', href: '/dashboard/products' },
        { icon: Users, label: 'Manajemen Petugas', href: '/dashboard/users' },
        { icon: History, label: 'Riwayat & Audit Trail', href: '/dashboard/audit-logs' },
      ]
    },
    {
      title: 'SISTEM',
      items: [
        { icon: Settings, label: 'Pengaturan', href: '/dashboard/settings' },
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-gray-800 font-sans antialiased">
      {/* Left Sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] bg-white border-r border-gray-150 shrink-0 min-h-screen z-20">
        {/* Brand Header */}
        <div className="px-6 py-6 border-b border-gray-100/60">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#FF4D15] flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <ArrowLeftRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-xl font-extrabold text-gray-900 tracking-tight">Stockify</span>
                <span className="text-xl font-extrabold text-[#FF4D15]">.</span>
              </div>
              <p className="text-[10px] tracking-wider font-bold text-gray-400 uppercase">INVENTORY OPS</p>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-4 py-5 overflow-y-auto space-y-6">
          {menuSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 text-[11px] font-bold text-gray-400 tracking-wider uppercase mb-2">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || (item.href === '/dashboard/users' && pathname?.startsWith('/dashboard/users'))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-[#FF4D15] text-white shadow-md shadow-orange-500/25 font-bold'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Logout in SISTEM */}
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#FF4D15] bg-orange-50/70 hover:bg-orange-100/70 transition-all cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5 text-[#FF4D15]" />
              <span>Keluar Sesi</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-150 px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari SKU, Barcode EAN, atau Lokasi Rak"
                className="w-full bg-gray-50 border border-gray-200/80 rounded-xl pl-10 pr-14 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30 focus:border-[#FF4D15] focus:bg-white transition-all"
              />
              <div className="absolute right-3 px-1.5 py-0.5 rounded bg-gray-200/80 text-[10px] font-semibold text-gray-500">
                ⌘ K
              </div>
            </div>
          </div>

          {/* Right Header Badges */}
          <div className="flex items-center gap-3.5">
            {/* Notification Bell */}
            <button className="relative w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200/70 flex items-center justify-center text-gray-500 transition-colors cursor-pointer">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>

            {/* Help Button */}
            <button className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200/70 flex items-center justify-center text-gray-500 transition-colors cursor-pointer">
              <HelpCircle className="w-4.5 h-4.5" />
            </button>

            {/* User Profile Dropdown Pill */}
            <div className="flex items-center gap-3 pl-2 py-1 pr-2 rounded-full hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200/60">
              <div className="w-8 h-8 rounded-full bg-[#FF4D15] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                AR
              </div>
              <div className="text-left hidden sm:block leading-tight">
                <p className="text-xs font-bold text-gray-900 leading-none">{userProfile?.full_name || 'Aditya R.'}</p>
                <p className="text-[11px] font-medium text-gray-400 mt-0.5">{userProfile?.role || 'Manager Ops'}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
