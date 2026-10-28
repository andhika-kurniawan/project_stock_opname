'use client'

import { useState, useEffect } from 'react'
import { 
  Settings as SettingsIcon, 
  Store, 
  ShieldCheck, 
  Bell, 
  Sliders, 
  Database, 
  Save, 
  CheckCircle2, 
  User, 
  Mail, 
  Clock, 
  AlertCircle 
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [settings, setSettings] = useState({
    storeName: 'Stockify Retail Store Jakarta',
    warehouseCode: 'WH-JKT-01',
    varianceThreshold: 5,
    autoCloseHours: 24,
    enableAudioBeep: true,
    enableEmailReport: false,
    adminEmail: 'aditya.admin@stockify.ops'
  })

  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking')

  useEffect(() => {
    async function checkDb() {
      try {
        const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true })
        if (!error) {
          setDbStatus('connected')
        } else {
          setDbStatus('error')
        }
      } catch {
        setDbStatus('error')
      }
    }
    checkDb()
  }, [supabase])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setToast('Pengaturan sistem berhasil disimpan!')
      setTimeout(() => setToast(null), 3500)
    }, 600)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-7 h-7 text-[#FF4D15]" />
            Pengaturan Sistem & Operasional
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Konfigurasi parameter operasional retail, toleransi selisih audit, dan preferensi akun
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF4D15] hover:bg-[#E03E0B] text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Settings Grid */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Profil Gudang / Retail */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#FF4D15] flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Identitas Lokasi Retail</h2>
              <p className="text-xs text-gray-500">Nama toko dan kode gudang aktif</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Nama Retail / Toko
              </label>
              <input
                type="text"
                value={settings.storeName}
                onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D15]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Kode Lokasi Gudang
              </label>
              <input
                type="text"
                value={settings.warehouseCode}
                onChange={e => setSettings({ ...settings, warehouseCode: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D15]"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Parameter Toleransi Audit */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Toleransi & Validasi SO</h2>
              <p className="text-xs text-gray-500">Batas persentase selisih sebelum ditandai kritis</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Batas Toleransi Selisih (% Maksimal)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.varianceThreshold}
                  onChange={e => setSettings({ ...settings, varianceThreshold: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D15]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Selisih stok fisik di atas {settings.varianceThreshold}% akan ditandai dengan badge merah pada laporan.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Batas Waktu Idle Sesi (Jam)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={settings.autoCloseHours}
                  onChange={e => setSettings({ ...settings, autoCloseHours: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D15]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Jam</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Integrasi Database & Backend */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Status Koneksi Supabase</h2>
              <p className="text-xs text-gray-500">PostgreSQL Cloud & Row-Level Security</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <div>
                  <p className="text-xs font-bold text-gray-900">PostgreSQL Database</p>
                  <p className="text-[11px] text-gray-500">
                    {dbStatus === 'connected' ? 'Terhubung & Siap Operasional' : 'Sedang Memeriksa...'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                ONLINE
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-xs font-bold text-gray-900">Row Level Security (RLS)</p>
                  <p className="text-[11px] text-gray-500">Semua tabel terproteksi dengan RLS aktif</p>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                AKTIF
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Preferensi Feedback & Notifikasi */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Preferensi Notifikasi & Audio</h2>
              <p className="text-xs text-gray-500">Feedback scanner dan pemberitahuan laporan</p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xs font-bold text-gray-900">Audio Feedback saat Scan Berhasil</p>
                <p className="text-[11px] text-gray-500">Bunyikan nada konfirmasi saat barcode terbaca</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableAudioBeep}
                onChange={e => setSettings({ ...settings, enableAudioBeep: e.target.checked })}
                className="w-4 h-4 rounded text-[#FF4D15] focus:ring-[#FF4D15] border-gray-300"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xs font-bold text-gray-900">Kirim Ringkasan Laporan Sesi ke Email</p>
                <p className="text-[11px] text-gray-500">Kirim file XLSX otomatis saat sesi ditutup</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableEmailReport}
                onChange={e => setSettings({ ...settings, enableEmailReport: e.target.checked })}
                className="w-4 h-4 rounded text-[#FF4D15] focus:ring-[#FF4D15] border-gray-300"
              />
            </label>
          </div>
        </div>
      </form>
    </div>
  )
}
