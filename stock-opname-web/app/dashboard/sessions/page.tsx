'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SessionWithRelations, SOItemWithRelations } from '../../../../types'
import { CalendarClock, Eye, Users, Package, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionWithRelations[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [sessionItems, setSessionItems] = useState<SOItemWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchActiveSessions()

    const channel = supabase
      .channel('sessions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'so_sessions',
          filter: 'status=eq.active'
        },
        () => {
          fetchActiveSessions()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'so_items'
        },
        () => {
          if (selectedSession) {
            fetchSessionItems(selectedSession)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedSession])

  async function fetchActiveSessions() {
    const { data, error } = await supabase
      .from('so_sessions')
      .select(`
        *,
        users:user_id (full_name, username),
        categories:category_id (name)
      `)
      .eq('status', 'active')
      .order('start_time', { ascending: false })

    if (!error && data) {
      setSessions(data as SessionWithRelations[])
    }
    setLoading(false)
  }

  async function fetchSessionItems(sessionId: string) {
    const { data, error } = await supabase
      .from('so_items')
      .select(`
        *,
        products:product_id (barcode, name)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setSessionItems(data as SOItemWithRelations[])
    }
  }

  function openDetail(sessionId: string) {
    setSelectedSession(sessionId)
    fetchSessionItems(sessionId)
  }

  function closeDetail() {
    setSelectedSession(null)
    setSessionItems([])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat sesi aktif...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sesi SO Aktif</h1>
        <p className="text-gray-600">Pantau sesi stock opname yang sedang berjalan secara real-time</p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarClock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Sesi Aktif</h3>
          <p className="text-gray-500">Belum ada sesi stock opname yang sedang berjalan saat ini</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Daftar Sesi Aktif</h3>
                <p className="text-gray-500 text-sm">{sessions.length} sesi sedang berjalan</p>
              </div>
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live Update</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode Sesi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Petugas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progres</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu Mulai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sessions.map((session) => {
                  const progress = session.total_items > 0 
                    ? Math.round((session.counted_items / session.total_items) * 100) 
                    : 0

                  return (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium text-gray-900">{session.session_code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{session.categories.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{session.users.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                            <div
                              className="bg-[#FF6B35] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 min-w-[80px]">
                            {session.counted_items}/{session.total_items} ({progress}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(session.start_time), 'dd MMM yyyy HH:mm')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openDetail(session.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#FF4D1A] transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Detail Item Sesi</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {sessions.find(s => s.id === selectedSession)?.session_code}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {sessionItems.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Tidak ada item dalam sesi ini</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Produk</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok Sistem</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok Fisik</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selisih</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sessionItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-sm">{item.products.barcode}</td>
                        <td className="px-4 py-3">{item.products.name}</td>
                        <td className="px-4 py-3 text-center">{item.system_stock}</td>
                        <td className="px-4 py-3 text-center">
                          {item.physical_stock !== null ? item.physical_stock : '-'}
                        </td>
                        <td className={`px-4 py-3 text-center font-medium ${
                          item.variance === null ? 'text-gray-400' :
                          item.variance === 0 ? 'text-gray-900' :
                          item.variance > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.variance !== null ? (item.variance > 0 ? `+${item.variance}` : item.variance) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {item.is_counted ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Sudah di-scan
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Belum di-scan
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Total {sessionItems.length} item • {sessionItems.filter(i => i.is_counted).length} sudah di-scan
                </p>
                <button
                  onClick={closeDetail}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
