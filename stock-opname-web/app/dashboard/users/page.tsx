'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Users, 
  Radio, 
  QrCode, 
  Search, 
  Plus, 
  Edit3, 
  UserCheck, 
  MoreVertical, 
  Download, 
  Check, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  Trash2, 
  ShieldCheck, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Layers,
  Clock
} from 'lucide-react'
import { OfficerUser, ActivityLogItem } from '@/lib/users-repository'

export default function UsersPage() {
  // Main state
  const [users, setUsers] = useState<OfficerUser[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStaff: 4,
    activeStaff: 4,
    totalScansToday: 1420
  })
  const [counts, setCounts] = useState({
    all: 5,
    staff: 4,
    admin: 1
  })

  // Search & Filter
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'staff' | 'admin'>('all')

  // Activity Logs state
  const [logs, setLogs] = useState<ActivityLogItem[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [logsLoading, setLogsLoading] = useState(true)

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<OfficerUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<OfficerUser | null>(null)
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    role: 'staff' as 'staff' | 'admin',
    assigned_zone: 'Zona Makanan & Minuman',
    is_active: true
  })

  const dropdownRef = useRef<HTMLDivElement | null>(null)

  // Show Toast Helper
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch Users & Stats
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (activeFilter !== 'all') params.set('role', activeFilter)

      const res = await fetch(`/api/users?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setUsers(json.data)
        if (json.stats) setStats(json.stats)
        if (json.counts) setCounts(json.counts)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }, [search, activeFilter])

  // Fetch Activity Logs
  const fetchLogs = useCallback(async (page: number = 1) => {
    try {
      setLogsLoading(true)
      const res = await fetch(`/api/activity-logs?page=${page}&limit=5`)
      const json = await res.json()
      if (json.success) {
        setLogs(json.data)
        setLogsTotal(json.pagination.total)
        setLogsPage(json.pagination.page)
        setLogsTotalPages(json.pagination.totalPages)
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    fetchLogs(logsPage)
  }, [fetchLogs, logsPage])

  // Handle Add User Submit
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.full_name || !formData.username || !formData.email) {
      showToast('error', 'Semua bidang wajib diisi')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal menambahkan petugas')
      }

      showToast('success', `Petugas "${formData.full_name}" berhasil didaftarkan!`)
      setIsAddModalOpen(false)
      setFormData({
        full_name: '',
        username: '',
        email: '',
        role: 'staff',
        assigned_zone: 'Zona Makanan & Minuman',
        is_active: true
      })
      fetchUsers()
      fetchLogs(1)
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Edit User Submit
  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editingUser.full_name,
          username: editingUser.username,
          email: editingUser.email,
          role: editingUser.role,
          is_active: editingUser.is_active,
          assigned_zone: editingUser.assigned_zone
        })
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal memperbarui akses petugas')
      }

      showToast('success', `Akses untuk "${editingUser.full_name}" berhasil diperbarui!`)
      setEditingUser(null)
      fetchUsers()
      fetchLogs(1)
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Toggle Active Status
  async function handleToggleStatus(user: OfficerUser) {
    try {
      const updatedStatus = !user.is_active
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: updatedStatus })
      })
      const json = await res.json()
      if (json.success) {
        showToast('success', `Status ${user.full_name} diubah menjadi ${updatedStatus ? 'Aktif' : 'Nonaktif'}`)
        setActiveDropdownId(null)
        fetchUsers()
        fetchLogs(1)
      }
    } catch {
      showToast('error', 'Gagal memperbarui status')
    }
  }

  // Handle Delete User
  async function handleDeleteUser() {
    if (!deletingUser) return
    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (json.success) {
        showToast('success', `Petugas "${deletingUser.full_name}" berhasil dihapus`)
        setDeletingUser(null)
        setActiveDropdownId(null)
        fetchUsers()
        fetchLogs(1)
      }
    } catch {
      showToast('error', 'Gagal menghapus petugas')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Download CSV
  function handleDownloadCSV() {
    window.location.href = '/api/activity-logs?format=csv'
  }

  return (
    <div className="space-y-7 pb-12 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border bg-white text-gray-900 border-gray-100 animate-in slide-in-from-bottom-5">
          {toast.type === 'success' ? (
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Manajemen Petugas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola akun pengguna, peran, dan status aktivitas staf lapangan.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-[#FF4D15] hover:bg-[#E6400E] text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
          <span>Tambah Petugas</span>
        </button>
      </div>

      {/* 1. Summary Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Petugas */}
        <div className="bg-white rounded-2xl p-5 border border-gray-150/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Total Petugas</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900">{stats.totalStaff}</span>
              <span className="text-xs font-medium text-gray-400">staf terdaftar</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shadow-xs">
            <svg className="w-6 h-6 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="15" rx="3" />
              <path d="M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1z" />
              <circle cx="12" cy="11.5" r="2.2" />
              <path d="M8.5 17c0-1.8 1.6-3 3.5-3s3.5 1.2 3.5 3" />
            </svg>
          </div>
        </div>

        {/* Card 2: Petugas Aktif */}
        <div className="bg-white rounded-2xl p-5 border border-gray-150/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Petugas Aktif</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#10B981]">{stats.activeStaff}</span>
              <span className="text-xs font-bold text-[#10B981]">sedang bertugas</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-100/80 flex items-center justify-center text-[#10B981] shadow-xs">
            <Radio className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        {/* Card 3: Total Scan Hari Ini */}
        <div className="bg-white rounded-2xl p-5 border border-gray-150/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Total Scan Hari Ini</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900">
                {stats.totalScansToday.toLocaleString('en-US')}
              </span>
              <span className="text-xs font-medium text-gray-400">item</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF4D15] shadow-xs">
            <svg className="w-6 h-6 text-[#FF4D15]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <rect x="7" y="7" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="14.5" y="7" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="7" y="14.5" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="14.5" y="14.5" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Pill Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau username..."
            className="w-full bg-gray-100/80 hover:bg-gray-100 focus:bg-white border-0 rounded-full pl-11 pr-4 py-2.5 text-xs md:text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#FF4D15] text-white shadow-sm shadow-orange-500/20'
                : 'bg-gray-100/90 text-gray-600 hover:bg-gray-200/80'
            }`}
          >
            Semua ({counts.all})
          </button>
          <button
            onClick={() => setActiveFilter('staff')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'staff'
                ? 'bg-[#FF4D15] text-white shadow-sm shadow-orange-500/20'
                : 'bg-gray-100/90 text-gray-600 hover:bg-gray-200/80'
            }`}
          >
            Petugas SO ({counts.staff})
          </button>
          <button
            onClick={() => setActiveFilter('admin')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'admin'
                ? 'bg-[#FF4D15] text-white shadow-sm shadow-orange-500/20'
                : 'bg-gray-100/90 text-gray-600 hover:bg-gray-200/80'
            }`}
          >
            Admin ({counts.admin})
          </button>
        </div>
      </div>

      {/* 3. Grid of Staff Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {users.map((user) => {
          const isDropdownOpen = activeDropdownId === user.id
          return (
            <div
              key={user.id}
              className="bg-white rounded-2xl p-5 border border-gray-150/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Avatar */}
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#FF4D15] text-white font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0">
                        {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Name & Handle */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-nowrap">
                        <h2 className="text-sm font-bold text-gray-900 truncate">{user.full_name}</h2>
                        {user.is_current_user && (
                          <span className="bg-red-50 text-[#FF4D15] text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0">
                            Anda
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">
                        @{user.username} • {user.role === 'admin' ? 'Manager Ops' : 'Petugas SO'}
                      </p>
                    </div>
                  </div>

                  {/* Status / Role Badge */}
                  <div className="shrink-0">
                    {user.role === 'admin' ? (
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        Admin
                      </span>
                    ) : user.is_active ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-[#10B981] text-xs font-bold px-2.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        Nonaktif
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Container */}
                <div className="bg-[#F8FAFC] rounded-xl px-3.5 py-3 my-3.5 flex items-center justify-between border border-gray-100">
                  {user.role === 'admin' ? (
                    <>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400">Hak Akses</p>
                        <p className="text-xs font-bold text-gray-800 mt-0.5">
                          {user.assigned_zone || 'Akses Penuh Manajemen'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-semibold text-gray-400">Sesi Selesai</p>
                        <p className="text-xs font-bold text-gray-700 mt-0.5">
                          {user.session_remaining || '7 jam lagi'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-[10px] font-semibold text-gray-400">Sesi Berjalan</p>
                        <p className="text-xs font-bold text-gray-800 mt-0.5 truncate" title={user.assigned_zone || ''}>
                          {user.assigned_zone || 'Belum Ditugaskan'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-semibold text-gray-400">Scan Hari Ini</p>
                        <p className="text-xs font-bold text-[#FF4D15] mt-0.5">
                          {user.daily_scan_count || 0} item
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between relative">
                {user.role === 'admin' ? (
                  <button
                    onClick={() => setEditingUser(user)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF4D15] hover:text-[#E6400E] cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Kelola Profil</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setEditingUser(user)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF4D15] hover:text-[#E6400E] cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Akses</span>
                  </button>
                )}

                {/* More Options Dropdown Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setActiveDropdownId(isDropdownOpen ? null : user.id)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-0 bottom-full mb-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95"
                    >
                      <button
                        onClick={() => {
                          setEditingUser(user)
                          setActiveDropdownId(null)
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                        Edit Informasi Akses
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5 text-gray-400" />
                        {user.is_active ? 'Nonaktifkan Petugas' : 'Aktifkan Petugas'}
                      </button>
                      {!user.is_current_user && (
                        <button
                          onClick={() => {
                            setDeletingUser(user)
                            setActiveDropdownId(null)
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          Hapus Petugas
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Card 6: "Daftarkan Staf Lapangan" Dashed Card */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="border-2 border-dashed border-gray-200 hover:border-[#FF4D15] bg-white/50 hover:bg-orange-50/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[200px]"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-[#FF4D15] text-gray-400 group-hover:text-white flex items-center justify-center transition-all shadow-xs">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 mt-3 group-hover:text-[#FF4D15] transition-colors">
            Daftarkan Staf Lapangan
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Buat akun untuk petugas baru
          </p>
        </button>
      </div>

      {/* 4. Activity Logs Section ("Log Aktivitas Terbaru") */}
      <div className="bg-white rounded-2xl border border-gray-150/90 shadow-sm overflow-hidden">
        {/* Table Header Area */}
        <div className="p-5 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base md:text-lg font-bold text-gray-900 tracking-tight">
              Log Aktivitas Terbaru
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Catatan aktivitas login dan sesi pemindaian rak petugas hari ini.
            </p>
          </div>
          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Unduh CSV</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-6">WAKTU</th>
                <th className="py-3 px-6">PETUGAS</th>
                <th className="py-3 px-6">AKTIVITAS</th>
                <th className="py-3 px-6">KATEGORI / TARGET RAK</th>
                <th className="py-3 px-6 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {logsLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Memuat log aktivitas...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Belum ada log aktivitas hari ini.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Waktu */}
                    <td className="py-3.5 px-6 font-semibold text-gray-500 whitespace-nowrap">
                      {log.time_display}
                    </td>

                    {/* Petugas */}
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        {log.officer_avatar ? (
                          <img
                            src={log.officer_avatar}
                            alt={log.officer_name}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-100"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-[10px] flex items-center justify-center">
                            {log.officer_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-gray-800">{log.officer_name}</span>
                      </div>
                    </td>

                    {/* Aktivitas */}
                    <td className="py-3.5 px-6 font-semibold text-gray-800 whitespace-nowrap">
                      {log.action}
                    </td>

                    {/* Kategori / Target Rak */}
                    <td className="py-3.5 px-6 text-gray-500 whitespace-nowrap">
                      {log.category_rack}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-[#10B981] font-bold text-xs px-2.5 py-0.5 rounded-full">
                        <Check className="w-3 h-3 stroke-[3]" />
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 md:px-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 font-medium">
          <div>
            Menampilkan {logs.length} dari {logsTotal} aktivitas
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLogsPage(p => Math.max(1, p - 1))}
              disabled={logsPage <= 1}
              className="px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
            >
              Sebelumnya
            </button>

            {Array.from({ length: logsTotalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setLogsPage(p)}
                className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-all cursor-pointer ${
                  p === logsPage
                    ? 'bg-[#FF4D15] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))}
              disabled={logsPage >= logsTotalPages}
              className="px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Tambah Petugas Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tambah Petugas Baru</h3>
                <p className="text-xs text-gray-500">Daftarkan akun staf lapangan atau admin operasi</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Farhan Nugraha"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30 focus:border-[#FF4D15]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">@</span>
                    <input
                      type="text"
                      required
                      placeholder="farhan.so"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30 focus:border-[#FF4D15]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="farhan@stockify.ops"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30 focus:border-[#FF4D15]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Peran Akun</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30"
                  >
                    <option value="staff">Petugas SO</option>
                    <option value="admin">Admin Operasional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Zona / Rak Awal</label>
                  <input
                    type="text"
                    value={formData.assigned_zone}
                    onChange={(e) => setFormData({ ...formData, assigned_zone: e.target.value })}
                    placeholder="Contoh: Zona Makanan & Minuman"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#FF4D15] hover:bg-[#E6400E] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Daftarkan Petugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Akses Petugas */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Akses & Peran</h3>
                <p className="text-xs text-gray-500">Perbarui wewenang atau zona kerja staf lapangan</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Petugas</label>
                <input
                  type="text"
                  required
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30 focus:border-[#FF4D15]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Peran</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30"
                  >
                    <option value="staff">Petugas SO</option>
                    <option value="admin">Admin Operasional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Zona Sesi Berjalan</label>
                <input
                  type="text"
                  value={editingUser.assigned_zone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, assigned_zone: e.target.value })}
                  placeholder="Contoh: Snack & Biskuit Kering"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4D15]/30"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="user_active_toggle"
                  checked={editingUser.is_active}
                  onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-[#FF4D15] focus:ring-[#FF4D15]"
                />
                <label htmlFor="user_active_toggle" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Status Akun Aktif (Dapat Login & Scan)
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#FF4D15] hover:bg-[#E6400E] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Petugas */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Hapus Petugas Ini?</h3>
            <p className="text-xs text-gray-500 mt-1 mb-5">
              Apakah Anda yakin ingin menghapus <strong>{deletingUser.full_name}</strong>? Tindakan ini akan mencabut akses login dan pemindaian.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md shadow-red-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
