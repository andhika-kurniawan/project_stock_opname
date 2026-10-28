'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  CalendarClock, 
  Users, 
  Package, 
  Clock, 
  AlertCircle, 
  Plus, 
  CheckCircle, 
  Activity,
  Layers,
  Search,
  Check,
  X,
  SlidersHorizontal,
  Minus,
  RefreshCw,
  MapPin
} from 'lucide-react'
import { format } from 'date-fns'

interface SessionData {
  id: string
  session_code: string
  category_id?: string
  category_name?: string
  user_id?: string | null
  status: string
  start_time: string
  total_items: number
  counted_items: number
  notes?: string | null
  categories?: { name: string }
  users?: { full_name: string; username: string }
  officer_name?: string
}

interface ScanItem {
  id: string
  session_id?: string
  barcode: string
  name: string
  category: string
  shelf_location?: string | null
  system_stock: number
  physical_stock: number | null
  variance: number | null
  is_counted: boolean
  counted_at: string | null
  user: string
}

interface MasterOption {
  id: string
  name?: string
  full_name?: string
  role?: string
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionItems, setSessionItems] = useState<ScanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Master options for new session
  const [categoryOptions, setCategoryOptions] = useState<MasterOption[]>([])
  const [officerOptions, setOfficerOptions] = useState<MasterOption[]>([])

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)
  const [newSessionForm, setNewSessionForm] = useState({
    category_id: '',
    category_name: '',
    user_id: '',
    officer_name: '',
    start_time: '',
    notes: ''
  })

  const handleOpenCreateModal = useCallback(() => {
    setNewSessionForm(prev => ({
      ...prev,
      start_time: prev.start_time || new Date().toISOString().slice(0, 16)
    }))
    setIsCreateModalOpen(true)
  }, [])

  // Scan/Physical Input Modal State
  const [selectedItemToScan, setSelectedItemToScan] = useState<ScanItem | null>(null)
  const [scanPhysicalValue, setScanPhysicalValue] = useState<number>(0)
  const [submittingScan, setSubmittingScan] = useState(false)

  // Session Action Confirmation Modals
  const [sessionActionModal, setSessionActionModal] = useState<{
    type: 'complete' | 'cancel'
    session: SessionData
  } | null>(null)
  const [processingAction, setProcessingAction] = useState(false)

  // Filter & Sort States
  const [statusFilter, setStatusFilter] = useState<'all' | 'counted' | 'uncounted' | 'match' | 'variance'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'time' | 'name' | 'barcode' | 'variance'>('time')

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text })
    setTimeout(() => {
      setToastMessage(null)
    }, 4500)
  }, [])

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/sessions')
      const json = await res.json()
      if (json.success && json.data) {
        setSessions(json.data)
        if (json.categories) setCategoryOptions(json.categories)
        if (json.officers) setOfficerOptions(json.officers)
      }
      if (selectedSessionId) {
        const itemRes = await fetch(`/api/sessions/${selectedSessionId}`)
        const itemJson = await itemRes.json()
        if (itemJson.success && itemJson.data) {
          setSessionItems(itemJson.data)
        }
      }
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setRefreshing(false)
    }
  }, [selectedSessionId])

  // Initial load
  useEffect(() => {
    let ignore = false
    fetch('/api/sessions')
      .then(res => res.json())
      .then(json => {
        if (ignore) return
        if (json.success && json.data) {
          setSessions(json.data)
          if (json.categories) setCategoryOptions(json.categories)
          if (json.officers) setOfficerOptions(json.officers)
          setSelectedSessionId((prev) => {
            if (prev && json.data.some((s: SessionData) => s.id === prev)) {
              return prev
            }
            return json.data.length > 0 ? json.data[0].id : null
          })
        }
        setLoading(false)
      })
      .catch(err => {
        if (ignore) return
        console.error('Failed to load active sessions:', err)
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  // Fetch items when selectedSessionId changes
  useEffect(() => {
    if (!selectedSessionId) {
      return
    }

    let ignore = false
    fetch(`/api/sessions/${selectedSessionId}`)
      .then(res => res.json())
      .then(json => {
        if (ignore) return
        if (json.success && json.data) {
          setSessionItems(json.data)
        } else {
          setSessionItems([])
        }
        setLoadingItems(false)
      })
      .catch(err => {
        if (ignore) return
        console.error('Failed to load session items:', err)
        setSessionItems([])
        setLoadingItems(false)
      })

    return () => {
      ignore = true
    }
  }, [selectedSessionId])

  // Real-time listener for database updates
  useEffect(() => {
    const channel = supabase
      .channel('sessions-page-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'so_sessions' },
        () => {
          fetch('/api/sessions')
            .then(res => res.json())
            .then(json => {
              if (json.success && json.data) {
                setSessions(json.data)
              }
            })
            .catch(() => {})
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'so_items' },
        () => {
          if (selectedSessionId) {
            fetch(`/api/sessions/${selectedSessionId}`)
              .then(res => res.json())
              .then(json => {
                if (json.success && json.data) {
                  setSessionItems(json.data)
                }
              })
              .catch(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, selectedSessionId])

  // Handle Create Session Submit
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSessionForm.category_id && !newSessionForm.category_name) {
      showToast('Pilih kategori produk terlebih dahulu', 'error')
      return
    }

    setCreatingSession(true)
    try {
      const selectedCat = categoryOptions.find(c => c.id === newSessionForm.category_id)
      const selectedOff = newSessionForm.user_id ? officerOptions.find(o => o.id === newSessionForm.user_id) : null

      const payload = {
        category_id: newSessionForm.category_id,
        category_name: selectedCat?.name || newSessionForm.category_name,
        user_id: newSessionForm.user_id && newSessionForm.user_id.trim() !== '' ? newSessionForm.user_id : null,
        officer_name: selectedOff?.full_name || null,
        start_time: newSessionForm.start_time ? new Date(newSessionForm.start_time).toISOString() : new Date().toISOString(),
        notes: newSessionForm.notes
      }

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()

      if (json.success && json.data) {
        showToast(`Sesi ${json.data.session_code} berhasil dibuat!`)
        setIsCreateModalOpen(false)
        setNewSessionForm({
          category_id: '',
          category_name: '',
          user_id: '',
          officer_name: '',
          start_time: new Date().toISOString().slice(0, 16),
          notes: ''
        })
        const refreshRes = await fetch('/api/sessions')
        const refreshJson = await refreshRes.json()
        if (refreshJson.success && refreshJson.data) {
          setSessions(refreshJson.data)
        }
        setSelectedSessionId(json.data.id)
      } else {
        showToast(json.message || 'Gagal membuat sesi SO baru', 'error')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem'
      showToast(message, 'error')
    } finally {
      setCreatingSession(false)
    }
  }

  // Handle Save Physical Scan
  const handleSaveScan = async () => {
    if (!selectedSessionId || !selectedItemToScan) return
    setSubmittingScan(true)
    try {
      const activeSession = sessions.find(s => s.id === selectedSessionId)
      const officerName = activeSession?.officer_name || activeSession?.users?.full_name || 'Petugas SO'

      const res = await fetch(`/api/sessions/${selectedSessionId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: selectedItemToScan.id,
          physical_stock: scanPhysicalValue,
          officer_name: officerName
        })
      })

      const json = await res.json()
      if (json.success) {
        showToast(`Stok fisik ${selectedItemToScan.name} tersimpan: ${scanPhysicalValue} pcs!`)
        setSelectedItemToScan(null)
        
        // Refresh items and session
        const [itemsRes, sessRes] = await Promise.all([
          fetch(`/api/sessions/${selectedSessionId}`),
          fetch('/api/sessions')
        ])
        const [itemsJson, sessJson] = await Promise.all([itemsRes.json(), sessRes.json()])
        if (itemsJson.success && itemsJson.data) setSessionItems(itemsJson.data)
        if (sessJson.success && sessJson.data) setSessions(sessJson.data)
      } else {
        showToast(json.message || 'Gagal menyimpan hasil scan', 'error')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan data scan'
      showToast(message, 'error')
    } finally {
      setSubmittingScan(false)
    }
  }

  // Handle Session Status Action (Complete or Cancel)
  const handleSessionStatusAction = async () => {
    if (!sessionActionModal) return
    setProcessingAction(true)
    const { type, session } = sessionActionModal
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: type })
      })

      const json = await res.json()
      if (json.success) {
        showToast(
          type === 'complete' 
            ? `Sesi ${session.session_code} berhasil diselesaikan dan dicatat ke Riwayat!` 
            : `Sesi ${session.session_code} telah dibatalkan.`
        )
        setSessionActionModal(null)
        const refreshRes = await fetch('/api/sessions')
        const refreshJson = await refreshRes.json()
        if (refreshJson.success && refreshJson.data) {
          setSessions(refreshJson.data)
          setSelectedSessionId(refreshJson.data.length > 0 ? refreshJson.data[0].id : null)
        }
      } else {
        showToast(json.message || 'Gagal memperbarui status sesi', 'error')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
      showToast(message, 'error')
    } finally {
      setProcessingAction(false)
    }
  }

  // Selected session object
  const selectedSession = useMemo(() => {
    return sessions.find(s => s.id === selectedSessionId) || sessions[0] || null
  }, [sessions, selectedSessionId])

  // Summary Metrics
  const totalActive = sessions.length
  const totalCountedItems = sessions.reduce((acc, s) => acc + s.counted_items, 0)
  const totalItemsCount = sessions.reduce((acc, s) => acc + s.total_items, 0)
  const overallProgress = totalItemsCount > 0 ? Math.round((totalCountedItems / totalItemsCount) * 100) : 0

  // Filtered & Sorted Session Items (Hasil Perbandingan Stok)
  const filteredAndSortedItems = useMemo(() => {
    let result = [...sessionItems]

    // 1. Status Filter
    if (statusFilter === 'counted') {
      result = result.filter(i => i.is_counted)
    } else if (statusFilter === 'uncounted') {
      result = result.filter(i => !i.is_counted)
    } else if (statusFilter === 'match') {
      result = result.filter(i => i.is_counted && i.variance === 0)
    } else if (statusFilter === 'variance') {
      result = result.filter(i => i.is_counted && i.variance !== 0)
    }

    // 2. Search Query (Barcode or Name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(i => 
        i.name.toLowerCase().includes(q) || 
        i.barcode.toLowerCase().includes(q) ||
        (i.shelf_location && i.shelf_location.toLowerCase().includes(q))
      )
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }
      if (sortBy === 'barcode') {
        return a.barcode.localeCompare(b.barcode)
      }
      if (sortBy === 'variance') {
        const varA = a.variance !== null ? Math.abs(a.variance) : -1
        const varB = b.variance !== null ? Math.abs(b.variance) : -1
        return varB - varA
      }
      // Default: Latest scan time
      if (a.counted_at && b.counted_at) {
        return new Date(b.counted_at).getTime() - new Date(a.counted_at).getTime()
      }
      if (a.counted_at) return -1
      if (b.counted_at) return 1
      return 0
    })

    return result
  }, [sessionItems, statusFilter, searchQuery, sortBy])

  // Count breakdown for tabs
  const itemsStats = useMemo(() => {
    const total = sessionItems.length
    const counted = sessionItems.filter(i => i.is_counted).length
    const uncounted = total - counted
    const match = sessionItems.filter(i => i.is_counted && i.variance === 0).length
    const variance = sessionItems.filter(i => i.is_counted && i.variance !== 0).length
    return { total, counted, uncounted, match, variance }
  }, [sessionItems])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 animate-in fade-in duration-300">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat Sesi SO Aktif...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold transition-all transform animate-in slide-in-from-top-4 duration-300 ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-gray-600 ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sesi SO Aktif</h1>
          <p className="text-gray-500 text-sm mt-1">Pantau sesi stock opname yang sedang berjalan secara real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button 
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#FF4D1A] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Sesi Baru</span>
          </button>
        </div>
      </div>

      {/* 2. Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-500 text-sm font-semibold mb-1">Total Sesi Berjalan</p>
            <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">{totalActive} Sesi</h3>
            <p className="text-xs text-gray-400 mt-1">Sesi fisik belum ditutup</p>
          </div>
          <div className="p-3.5 bg-orange-50 border border-orange-100 rounded-2xl text-[#FF6B35]">
            <Activity className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-500 text-sm font-semibold mb-1">Item Terpindai</p>
            <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {totalCountedItems} <span className="text-lg font-bold text-gray-400">/ {totalItemsCount}</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">Total SKU yang sudah dihitung</p>
          </div>
          <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600">
            <CheckCircle className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-500 text-sm font-semibold mb-1">Progress Keseluruhan</p>
            <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">{overallProgress}%</h3>
            <div className="w-28 bg-gray-100 rounded-full h-1.5 mt-2">
              <div 
                className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
          </div>
          <div className="p-3.5 bg-green-50 border border-green-100 rounded-2xl text-green-600">
            <Layers className="w-7 h-7" />
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-12 text-center">
          <CalendarClock className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Tidak Ada Sesi SO yang Berjalan</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Saat ini tidak ada sesi penghitungan fisik aktif. Klik tombol di bawah untuk menjadwalkan atau memulai sesi stock opname baru.
          </p>
          <button 
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-[#FF4D1A] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Mulai Sesi SO Pertama</span>
          </button>
        </div>
      ) : (
        <>
          {/* 3. Active Sessions Grid */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base font-bold text-gray-900">
                Daftar Sesi SO Aktif ({sessions.length})
              </h2>
              <span className="text-xs text-gray-500">Pilih sesi untuk memantau perbandingan fisik</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sessions.map((session) => {
                const progress = session.total_items > 0 
                  ? Math.round((session.counted_items / session.total_items) * 100) 
                  : 0
                const isSelected = session.id === selectedSessionId
                const categoryName = session.category_name || session.categories?.name || 'Kategori Umum'
                const isUnassigned = !session.user_id || session.officer_name === 'Belum Ditugaskan' || (!session.officer_name && !session.users?.full_name)
                const officerName = isUnassigned ? 'Belum Ditugaskan' : (session.officer_name || session.users?.full_name || 'Petugas Lapangan')

                return (
                  <div 
                    key={session.id}
                    onClick={() => {
                      setSelectedSessionId(session.id)
                    }}
                    className={`bg-white rounded-2xl p-5.5 cursor-pointer transition-all border-2 shadow-sm relative ${
                      isSelected 
                        ? 'border-[#FF6B35] ring-4 ring-[#FF6B35]/10 shadow-md' 
                        : 'border-gray-150/90 hover:border-gray-300'
                    }`}
                  >
                    {/* Top Row: Session Code + Active Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono font-extrabold text-xs text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                        #{session.session_code}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Aktif
                      </span>
                    </div>

                    {/* Metadata Items */}
                    <div className="space-y-2 mb-5">
                      <div className="flex items-center gap-2 text-gray-600 text-xs">
                        <Package className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate">Kategori: <strong className="text-gray-900">{categoryName}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-xs">
                        <Users className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate flex items-center gap-1.5">
                          Petugas:{' '}
                          {isUnassigned ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Terbuka (Belum Ditugaskan)
                            </span>
                          ) : (
                            <strong className="text-gray-900">{officerName}</strong>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-xs">
                        <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>Mulai: {session.start_time ? format(new Date(session.start_time), 'dd MMM yyyy, HH:mm') : '-'}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-gray-500">Progress Scan</span>
                        <span className="text-gray-900 font-extrabold">
                          {session.counted_items} / {session.total_items} SKU ({progress}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div 
                          className="bg-[#FF6B35] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Actions if Selected */}
                    {isSelected && (
                      <div className="mt-4 pt-3 border-t border-dashed border-gray-200 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-[#FF6B35]">● Sesi Terpilih</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSessionActionModal({ type: 'complete', session })
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Selesaikan sesi SO dan catat ke riwayat"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Selesaikan</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSessionActionModal({ type: 'cancel', session })
                            }}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-red-600 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title="Batalkan sesi ini"
                          >
                            <span>Batal</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 4. Real-time Scan Detail Table (Hasil Perbandingan Stok) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden">
            {/* Table Header Section */}
            <div className="p-6 border-b border-gray-150 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#F8FAFC]/40">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-lg font-extrabold text-gray-900">
                    Detail Pemindaian Real-Time: <span className="text-[#FF6B35]">#{selectedSession?.session_code}</span>
                  </h3>
                  <span className="bg-orange-100 text-[#FF6B35] px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {selectedSession?.category_name || selectedSession?.categories?.name}
                  </span>
                  {(!selectedSession?.user_id || selectedSession?.officer_name === 'Belum Ditugaskan' || (!selectedSession?.officer_name && !selectedSession?.users?.full_name)) ? (
                    <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      Terbuka (Belum Ditugaskan)
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      Petugas: {selectedSession?.officer_name || selectedSession?.users?.full_name}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-0.5">
                  Hasil pencocokan stok fisik vs stok sistem secara live. Klik tombol aksi untuk memasukkan hasil hitung manual.
                </p>
              </div>

              <div className="flex items-center gap-2.5 self-start lg:self-auto">
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span>Live Stream Aktif</span>
                </div>

                {selectedSession && (
                  <button
                    onClick={() => setSessionActionModal({ type: 'complete', session: selectedSession })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Selesaikan Sesi</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter and Search Bar Controls (PRD Section 3.2.4) */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white">
              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-[#FF6B35] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Semua ({itemsStats.total})
                </button>
                <button
                  onClick={() => setStatusFilter('counted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'counted'
                      ? 'bg-[#FF6B35] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Terpindai ({itemsStats.counted})
                </button>
                <button
                  onClick={() => setStatusFilter('uncounted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'uncounted'
                      ? 'bg-[#FF6B35] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Belum ({itemsStats.uncounted})
                </button>
                <button
                  onClick={() => setStatusFilter('match')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'match'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Match ({itemsStats.match})
                </button>
                <button
                  onClick={() => setStatusFilter('variance')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'variance'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  Selisih ({itemsStats.variance})
                </button>
              </div>

              {/* Search Bar & Sort Dropdown */}
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari barcode / nama..."
                    className="w-full bg-gray-50 focus:bg-white border border-gray-200 rounded-xl pl-9 pr-8 py-1.5 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as 'time' | 'name' | 'barcode' | 'variance')}
                    className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 cursor-pointer"
                  >
                    <option value="time">Urut: Waktu Scan Terkini</option>
                    <option value="variance">Urut: Selisih Terbesar</option>
                    <option value="name">Urut: Nama Produk (A-Z)</option>
                    <option value="barcode">Urut: Barcode (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-[#F8FAFC] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3">BARCODE</th>
                    <th className="px-5 py-3">NAMA PRODUK</th>
                    <th className="px-5 py-3 text-center">LOKASI RAK</th>
                    <th className="px-5 py-3 text-center">STOK SISTEM</th>
                    <th className="px-5 py-3 text-center">STOK FISIK</th>
                    <th className="px-5 py-3 text-center">SELISIH</th>
                    <th className="px-5 py-3 text-center">STATUS</th>
                    <th className="px-5 py-3">PETUGAS</th>
                    <th className="px-5 py-3">WAKTU SCAN</th>
                    <th className="px-5 py-3 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 font-medium text-gray-700">
                  {loadingItems ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                        <div className="w-6 h-6 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Memuat item pemindaian...
                      </td>
                    </tr>
                  ) : filteredAndSortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                        {searchQuery || statusFilter !== 'all' 
                          ? 'Tidak ada item yang cocok dengan filter atau pencarian.' 
                          : 'Belum ada item yang terdaftar pada sesi ini.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedItems.map((item) => {
                      const hasVariance = item.is_counted && item.variance !== 0
                      const isDeficit = hasVariance && (item.variance || 0) < 0
                      const isSurplus = hasVariance && (item.variance || 0) > 0
                      const isMatch = item.is_counted && item.variance === 0

                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-gray-50/70 transition-colors ${
                            isDeficit ? 'bg-red-50/20' : isSurplus ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* Barcode */}
                          <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs font-bold text-gray-900">
                            {item.barcode}
                          </td>

                          {/* Name */}
                          <td className="px-5 py-3.5 font-bold text-gray-900 max-w-xs">
                            <div>{item.name}</div>
                            <div className="text-[10px] text-gray-400 font-normal">{item.category}</div>
                          </td>

                          {/* Shelf Location */}
                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {item.shelf_location || '-'}
                            </span>
                          </td>

                          {/* System Stock */}
                          <td className="px-5 py-3.5 text-center font-bold text-gray-700 whitespace-nowrap">
                            {item.system_stock}
                          </td>

                          {/* Physical Stock */}
                          <td className="px-5 py-3.5 text-center font-extrabold whitespace-nowrap">
                            {item.physical_stock !== null ? (
                              <span className="text-gray-900">{item.physical_stock}</span>
                            ) : (
                              <span className="text-gray-400 font-normal">-</span>
                            )}
                          </td>

                          {/* Variance */}
                          <td className="px-5 py-3.5 text-center font-extrabold whitespace-nowrap">
                            {item.variance === null ? (
                              <span className="text-gray-400 font-normal">-</span>
                            ) : item.variance === 0 ? (
                              <span className="text-emerald-600">0</span>
                            ) : item.variance > 0 ? (
                              <span className="text-amber-600 font-black">+{item.variance}</span>
                            ) : (
                              <span className="text-red-600 font-black">{item.variance}</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            {item.is_counted ? (
                              isMatch ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  Match
                                </span>
                              ) : isDeficit ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800">
                                  <AlertCircle className="w-3 h-3" />
                                  Defisit ({item.variance})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                                  <AlertCircle className="w-3 h-3" />
                                  Surplus (+{item.variance})
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
                                Belum
                              </span>
                            )}
                          </td>

                          {/* User */}
                          <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                            {item.user !== '-' ? item.user : <span className="text-gray-400">-</span>}
                          </td>

                          {/* Counted At */}
                          <td className="px-5 py-3.5 text-gray-400 text-[11px] whitespace-nowrap">
                            {item.counted_at ? format(new Date(item.counted_at), 'HH:mm:ss') : '-'}
                          </td>

                          {/* Action Button */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedItemToScan(item)
                                setScanPhysicalValue(item.physical_stock !== null ? item.physical_stock : item.system_stock)
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-200 text-[#FF6B35] font-bold rounded-lg text-xs shadow-2xs transition-colors cursor-pointer"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                              <span>{item.is_counted ? 'Koreksi' : 'Scan Fisik'}</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-4 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 bg-[#F8FAFC]">
              <div>
                Menampilkan <strong>{filteredAndSortedItems.length}</strong> dari <strong>{sessionItems.length}</strong> total item SKU dalam sesi
              </div>
              <div className="flex items-center gap-4 mt-2 sm:mt-0 font-medium">
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Match: {itemsStats.match}
                </span>
                <span className="flex items-center gap-1 text-red-700">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Defisit/Surplus: {itemsStats.variance}
                </span>
                <span className="flex items-center gap-1 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  Belum: {itemsStats.uncounted}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= MODAL: BUAT SESI SO BARU (PRD Section 3.2.4) ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-150 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Buat Sesi Stock Opname Baru</h3>
                <p className="text-xs text-gray-500 mt-0.5">Jadwalkan sesi penghitungan fisik untuk kategori toko</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 pt-4">
              {/* 1. Pilih Kategori (PRD) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Kategori Produk <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={newSessionForm.category_id}
                  onChange={(e) => {
                    const cat = categoryOptions.find(c => c.id === e.target.value)
                    setNewSessionForm({
                      ...newSessionForm,
                      category_id: e.target.value,
                      category_name: cat?.name || ''
                    })
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 cursor-pointer"
                >
                  <option value="">-- Pilih Kategori Produk --</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Item SKU dalam kategori ini akan otomatis dimuat ke dalam daftar tugas hitung fisik.
                </p>
              </div>

              {/* 2. Assign Petugas (Optional PRD) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Petugas Penanggung Jawab</span>
                  <span className="text-[10px] font-bold text-[#FF6B35] bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60">
                    Opsional
                  </span>
                </label>
                <select
                  value={newSessionForm.user_id}
                  onChange={(e) => {
                    const off = officerOptions.find(o => o.id === e.target.value)
                    setNewSessionForm({
                      ...newSessionForm,
                      user_id: e.target.value,
                      officer_name: off?.full_name || ''
                    })
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 cursor-pointer"
                >
                  <option value="">-- Buka untuk Semua Petugas (Belum Ditugaskan) --</option>
                  {officerOptions.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.full_name} ({off.role === 'admin' ? 'Manager Ops' : 'Petugas SO'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Bila tidak dipilih, sesi akan berstatus terbuka dan langsung muncul di Mobile App untuk dikerjakan petugas shift.
                </p>
              </div>

              {/* 3. Scheduled Date (PRD) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Waktu & Tanggal Pelaksanaan
                </label>
                <input
                  type="datetime-local"
                  value={newSessionForm.start_time}
                  onChange={(e) => setNewSessionForm({ ...newSessionForm, start_time: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                />
              </div>

              {/* 4. Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Catatan Sesi (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={newSessionForm.notes}
                  onChange={(e) => setNewSessionForm({ ...newSessionForm, notes: e.target.value })}
                  placeholder="Misal: Sesi opname rak bagian bawah lorong 2..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                ></textarea>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingSession}
                  className="px-5 py-2 bg-[#FF6B35] hover:bg-[#FF4D1A] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  {creatingSession ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Membuat Sesi...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Buat Sesi Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: INPUT / SCAN FISIK ITEM ================= */}
      {selectedItemToScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-150 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="font-mono text-[10px] font-bold bg-orange-50 text-[#FF6B35] px-2 py-0.5 rounded">
                  {selectedItemToScan.barcode}
                </span>
                <h4 className="text-base font-extrabold text-gray-900 mt-1">
                  {selectedItemToScan.name}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedItemToScan(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">Stok Sistem</span>
                  <span className="font-extrabold text-gray-900 text-base">{selectedItemToScan.system_stock} Pcs</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Lokasi Rak</span>
                  <span className="font-bold text-gray-700 text-base">{selectedItemToScan.shelf_location || '-'}</span>
                </div>
              </div>

              {/* Physical Counter Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 text-center">
                  Jumlah Hitung Fisik (Pcs)
                </label>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setScanPhysicalValue(prev => Math.max(0, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-lg cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    value={scanPhysicalValue}
                    onChange={(e) => setScanPhysicalValue(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-28 text-center bg-gray-50 border-2 border-[#FF6B35] rounded-xl py-2 text-2xl font-black text-gray-900 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setScanPhysicalValue(prev => prev + 1)}
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Live Variance Calculation Preview */}
              {(() => {
                const diff = scanPhysicalValue - selectedItemToScan.system_stock
                return (
                  <div className={`p-3 rounded-2xl border text-center text-xs font-bold ${
                    diff === 0 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : diff > 0 
                      ? 'bg-amber-50 border-amber-200 text-amber-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    {diff === 0 ? (
                      <span>Hasil: Sesuai (Zero Variance)</span>
                    ) : diff > 0 ? (
                      <span>Hasil: Surplus +{diff} Pcs</span>
                    ) : (
                      <span>Hasil: Defisit {diff} Pcs</span>
                    )}
                  </div>
                )
              })()}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedItemToScan(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submittingScan}
                onClick={handleSaveScan}
                className="px-5 py-2 bg-[#FF6B35] hover:bg-[#FF4D1A] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-1.5"
              >
                {submittingScan ? 'Menyimpan...' : 'Simpan Hasil Scan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: KONFIRMASI AKSI SESI ================= */}
      {sessionActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-150 animate-in zoom-in-95 text-center">
            <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
              sessionActionModal.type === 'complete' 
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              {sessionActionModal.type === 'complete' ? (
                <Check className="w-6 h-6 stroke-[3]" />
              ) : (
                <AlertCircle className="w-6 h-6 stroke-[2]" />
              )}
            </div>

            <h3 className="text-base font-extrabold text-gray-900 mb-1">
              {sessionActionModal.type === 'complete' ? 'Selesaikan Sesi SO?' : 'Batalkan Sesi SO?'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {sessionActionModal.type === 'complete'
                ? `Sesi #${sessionActionModal.session.session_code} akan ditutup dan seluruh data selisih fisik akan disimpan ke Riwayat & Audit Trail.`
                : `Sesi #${sessionActionModal.session.session_code} akan dihentikan dan ditandai sebagai dibatalkan.`}
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setSessionActionModal(null)}
                disabled={processingAction}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Kembali
              </button>
              <button
                onClick={handleSessionStatusAction}
                disabled={processingAction}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer ${
                  sessionActionModal.type === 'complete'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-700/20'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-700/20'
                }`}
              >
                {processingAction ? 'Memproses...' : sessionActionModal.type === 'complete' ? 'Ya, Selesaikan' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
