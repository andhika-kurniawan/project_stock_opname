'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  CalendarClock, 
  Eye, 
  Users, 
  Package, 
  Clock, 
  AlertCircle, 
  Plus, 
  CheckCircle, 
  AlertTriangle,
  Activity,
  Layers,
  CheckCheck
} from 'lucide-react'
import { format } from 'date-fns'

interface SessionData {
  id: string
  session_code: string
  status: string
  start_time: string
  total_items: number
  counted_items: number
  categories: { name: string }
  users: { full_name: string; username: string }
}

interface ScanItem {
  id: string
  barcode: string
  name: string
  category: string
  system_stock: number
  physical_stock: number | null
  variance: number | null
  is_counted: boolean
  counted_at: string | null
  user: string
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionItems, setSessionItems] = useState<ScanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchActiveSessions()

    const channel = supabase
      .channel('sessions-page-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'so_sessions' },
        () => fetchActiveSessions()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'so_items' },
        () => {
          if (selectedSessionId) {
            fetchSessionItems(selectedSessionId)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedSessionId])

  async function fetchActiveSessions() {
    const { data, error } = await supabase
      .from('so_sessions')
      .select(`
        id,
        session_code,
        status,
        start_time,
        total_items,
        counted_items,
        categories:category_id (name),
        users:user_id (full_name, username)
      `)
      .eq('status', 'active')
      .order('start_time', { ascending: false })

    if (!error && data) {
      const mapped = data as unknown as SessionData[]
      setSessions(mapped)
      if (mapped.length > 0 && !selectedSessionId) {
        setSelectedSessionId(mapped[0].id)
        fetchSessionItems(mapped[0].id)
      }
    }
    setLoading(false)
  }

  async function fetchSessionItems(sessionId: string) {
    setLoadingItems(true)
    const { data, error } = await supabase
      .from('so_items')
      .select(`
        id,
        system_stock,
        physical_stock,
        variance,
        is_counted,
        counted_at,
        products:product_id (barcode, name, categories:category_id (name)),
        users:counted_by (full_name)
      `)
      .eq('session_id', sessionId)
      .order('counted_at', { ascending: false })

    if (!error && data) {
      setSessionItems(data.map((item: any) => ({
        id: item.id,
        barcode: item.products?.barcode || '-',
        name: item.products?.name || '-',
        category: item.products?.categories?.name || '-',
        system_stock: item.system_stock,
        physical_stock: item.physical_stock,
        variance: item.variance,
        is_counted: item.is_counted,
        counted_at: item.counted_at,
        user: item.users?.full_name || '-'
      })))
    }
    setLoadingItems(false)
  }

  const selectedSession = sessions.find(s => s.id === selectedSessionId) || sessions[0]

  const totalActive = sessions.length
  const totalCountedItems = sessions.reduce((acc, s) => acc + s.counted_items, 0)
  const totalItemsCount = sessions.reduce((acc, s) => acc + s.total_items, 0)
  const overallProgress = totalItemsCount > 0 ? Math.round((totalCountedItems / totalItemsCount) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat Sesi SO Aktif...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sesi SO Aktif</h1>
          <p className="text-gray-600">Pantau sesi stock opname yang sedang berjalan secara real-time</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white rounded-xl hover:bg-[#FF4D1A] transition-colors">
          <Plus className="w-4 h-4" />
          Sesi Baru
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm mb-1">Total Sesi Berjalan</p>
            <h3 className="text-3xl font-bold text-gray-900">{totalActive} Sesi</h3>
          </div>
          <div className="p-3 bg-orange-100 rounded-2xl text-[#FF6B35]">
            <Activity className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm mb-1">Item Terpindai</p>
            <h3 className="text-3xl font-bold text-gray-900">{totalCountedItems} / {totalItemsCount}</h3>
          </div>
          <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
            <CheckCheck className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm mb-1">Progress Keseluruhan</p>
            <h3 className="text-3xl font-bold text-gray-900">{overallProgress}%</h3>
          </div>
          <div className="p-3 bg-green-100 rounded-2xl text-green-600">
            <Layers className="w-8 h-8" />
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center">
          <CalendarClock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Sesi Aktif</h3>
          <p className="text-gray-500">Belum ada sesi stock opname yang berjalan saat ini.</p>
        </div>
      ) : (
        <>
          {/* Active Sessions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {sessions.map((session) => {
              const progress = session.total_items > 0 
                ? Math.round((session.counted_items / session.total_items) * 100) 
                : 0
              const isSelected = session.id === selectedSessionId

              return (
                <div 
                  key={session.id}
                  onClick={() => {
                    setSelectedSessionId(session.id)
                    fetchSessionItems(session.id)
                  }}
                  className={`bg-white rounded-2xl shadow-md p-6 cursor-pointer transition-all border-2 ${
                    isSelected ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/20' : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                      {session.session_code}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      Aktif
                    </span>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span>Kategori: <strong>{session.categories?.name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>Petugas: <strong>{session.users?.full_name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>Mulai: {format(new Date(session.start_time), 'dd MMM HH:mm')}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span className="text-gray-600">Progress Scan</span>
                      <span className="text-gray-900">{session.counted_items}/{session.total_items} ({progress}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div 
                        className="bg-[#FF6B35] h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Real-time Scan Detail Table */}
          <div className="bg-white rounded-2xl shadow">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Detail Pemindaian Real-Time: <span className="text-[#FF6B35]">{selectedSession?.session_code}</span>
                </h3>
                <p className="text-gray-500 text-sm">Daftar item yang dipindai dalam sesi yang dipilih</p>
              </div>
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live Stream</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Produk</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Sistem</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fisik</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Selisih</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Petugas Scan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loadingItems ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                        Memuat item pemindaian...
                      </td>
                    </tr>
                  ) : sessionItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                        Belum ada item yang dipindai pada sesi ini
                      </td>
                    </tr>
                  ) : (
                    sessionItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-medium text-gray-900">
                          {item.barcode}
                        </td>
                        <td className="px-6 py-4 text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-gray-600">{item.category}</td>
                        <td className="px-6 py-4 text-center font-medium">{item.system_stock}</td>
                        <td className="px-6 py-4 text-center font-medium">
                          {item.physical_stock !== null ? item.physical_stock : '-'}
                        </td>
                        <td className={`px-6 py-4 text-center font-bold ${
                          item.variance === null ? 'text-gray-400' :
                          item.variance === 0 ? 'text-gray-900' :
                          item.variance > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.variance !== null ? (item.variance > 0 ? `+${item.variance}` : item.variance) : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {item.is_counted ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Terpindai
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Belum
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{item.user}</td>
                        <td className="px-6 py-4 text-gray-500 text-sm">
                          {item.counted_at ? format(new Date(item.counted_at), 'HH:mm:ss') : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
