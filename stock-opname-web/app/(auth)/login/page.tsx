'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Shield, Clipboard } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FF6B35] via-[#FF8C61] to-[#FF4D1A] relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none"></div>
      
      <div className="max-w-md w-full mx-4 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-white text-sm font-medium">Hub Jakarta Utama • Sistem Aktif</span>
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Clipboard className="w-7 h-7 text-[#FF6B35]" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-white">STOCK OPNAME</h1>
              <p className="text-white/90 text-sm font-medium">Enterprise Inventory Management</p>
            </div>
            <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-white text-xs font-bold">PRO</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Masuk ke Dashboard</h2>
            <p className="text-gray-500 text-sm">Silakan masukkan detail akun administrator Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@retail.co.id"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#FF6B35] border-gray-300 rounded focus:ring-[#FF6B35]"
                  />
                  Ingat saya di perangkat ini
                </label>
                <button type="button" className="text-sm text-[#FF6B35] hover:text-[#FF4D1A] font-medium">
                  Lupa kata sandi?
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6B35] hover:bg-[#FF4D1A] text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
              <span>→</span>
            </button>
          </form>
        </div>

        <p className="text-center text-white text-sm mt-6">
          Belum memiliki akun?{' '}
          <button className="font-semibold underline hover:text-white/80">
            Hubungi Admin IT
          </button>
        </p>

        <div className="text-center text-white/60 text-xs mt-8 flex items-center justify-center gap-2">
          <Shield className="w-3 h-3" />
          Enkripsi TLS 1.3 & PostgreSQL RLS
        </div>
      </div>

      <div className="absolute bottom-4 right-4 text-white/60 text-xs">
        © 2026 StockOpname Retail Suite • Enterprise Edition
      </div>
    </div>
  )
}
