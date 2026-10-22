'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  CloudUpload, 
  Download, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Package,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { generateProductImportTemplate, parseImportFile, downloadBlob } from '@/lib/utils/excel'
import DashboardLayout from '@/components/dashboard/layout'
import { ProductWithCategory, Category, ImportProductDTO } from '../../../../types'


export default function ProductsPage() {
  return (
    <DashboardLayout>
      <ProductsContent />
    </DashboardLayout>
  )
}

function ProductsContent() {
  const supabase = createClient()
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 5

  // Form state
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    brand: '',
    category_id: '',
    shelf_location: '',
    system_stock: 0
  })
  const [saving, setSaving] = useState(false)

  // Import state
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch categories
      const { data: cats } = await supabase.from('categories').select('*').order('name')
      if (cats) setCategories(cats)

      // Fetch products with count
      let query = supabase
        .from('products')
        .select('*, categories(*)', { count: 'exact' })
        .order('last_updated', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (search) {
        query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%,brand.ilike.%${search}%`)
      }
      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter)
      }

      const { data, count, error } = await query
      if (error) throw error
      setProducts(data || [])
      setTotal(count || 0)
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleManualSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('products').insert([{
        barcode: formData.barcode,
        name: formData.name,
        brand: formData.brand,
        category_id: formData.category_id,
        shelf_location: formData.shelf_location,
        system_stock: formData.system_stock,
        last_updated: new Date().toISOString()
      }])
      if (error) throw error
      setFormData({ barcode: '', name: '', brand: '', category_id: '', shelf_location: '', system_stock: 0 })
      fetchData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      setImportStatus(null)
    }
  }

  async function processImport() {
    if (!file) return
    setImporting(true)
    setImportStatus(null)
    try {
      const data = await parseImportFile(file)
      if (data.length === 0) throw new Error('File kosong atau format salah')

      // Get or create categories
      const uniqueCats = Array.from(new Set(data.map(d => d.category_name)))
      const { data: existingCats } = await supabase.from('categories').select('id, name')
      
      const catMap = new Map(existingCats?.map(c => [c.name.toLowerCase(), c.id]))
      
      for (const catName of uniqueCats) {
        if (!catMap.has(catName.toLowerCase())) {
          const { data: newCat, error } = await supabase.from('categories').insert({ name: catName }).select().single()
          if (!error && newCat) catMap.set(catName.toLowerCase(), newCat.id)
        }
      }

      const productsToUpsert = data.map(d => ({
        barcode: d.barcode,
        name: d.name,
        brand: d.brand,
        category_id: catMap.get(d.category_name.toLowerCase()),
        shelf_location: d.shelf_location,
        system_stock: d.system_stock,
        last_updated: new Date().toISOString()
      })).filter(p => p.category_id)

      const { error } = await supabase.from('products').upsert(productsToUpsert, { onConflict: 'barcode' })
      if (error) throw error

      setImportStatus({ type: 'success', message: `Berhasil mengimpor ${productsToUpsert.length} SKU` })
      setFile(null)
      fetchData()
    } catch (err: any) {
      setImportStatus({ type: 'error', message: err.message })
    } finally {
      setImporting(false)
    }
  }

  async function handleDownloadTemplate() {
    const blob = await generateProductImportTemplate()
    downloadBlob(blob, 'template_import_stok.xlsx')
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus SKU ini?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) fetchData()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      {/* Header Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2 text-[#FF6B35] font-bold text-xs uppercase tracking-wider mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
            Master Inventaris
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Master Data & Import Stok</h1>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Sinkronisasi baseline stok sistem ritel sebelum pelaksanaan sesi Stock Opname.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total SKU Master</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">{total.toLocaleString()}</span>
            <span className="text-gray-400 font-medium">SKU</span>
          </div>
          <div className="mt-2 text-[11px] font-bold text-emerald-500 flex items-center gap-1">
            <Plus className="w-3 h-3" /> +18 minggu ini
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Kategori Aktif</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">{categories.length}</span>
            <span className="text-gray-400 font-medium">Kategori</span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400 font-medium">Semua Rak Terpetakan</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Terakhir Diperbarui</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-gray-900 leading-tight">
              {products[0] ? new Date(products[0].last_updated).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400 font-medium truncate">
            {products[0] ? `master_stok_${new Date().toISOString().split('T')[0]}.xlsx` : 'Belum ada data'}
          </p>
        </div>
      </div>

      {/* Main Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Import Module */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-[#FF6B35]">
                <CloudUpload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Import File Stok Baseline</h2>
                <p className="text-xs text-gray-400">Upload data inventaris format Excel atau CSV</p>
              </div>
            </div>
            <button 
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 text-[#FF6B35] text-xs font-bold hover:underline"
            >
              <Download className="w-4 h-4" /> Unduh Template
            </button>
          </div>

          <div 
            className={`relative border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center transition-all ${
              file ? 'border-[#FF6B35] bg-orange-50/30' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
            }`}
          >
            <input 
              type="file" 
              accept=".xlsx,.csv" 
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-[#FF6B35]">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-gray-900 text-center">
              {file ? file.name : 'Tarik & letakkan file di sini, atau klik untuk browse'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Mendukung file .xlsx dan .csv hingga 10 MB</p>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-gray-400 italic">
              <AlertCircle className="w-3.5 h-3.5" />
              Kolom wajib: barcode, nama_produk, kategori, lokasi_rak, sistem_stock
            </div>
            <button
              onClick={processImport}
              disabled={!file || importing}
              className="bg-[#FF6B35] hover:bg-[#e85d2a] disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-orange-200 transition-all active:scale-95"
            >
              {importing ? 'Memproses...' : 'Validasi & Preview File'}
            </button>
          </div>
          {importStatus && (
            <div className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              {importStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {importStatus.message}
            </div>
          )}
        </div>

        {/* Manual Entry Module */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-[#FF6B35]">
                <Plus className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-gray-900">Tambah SKU Cepat</h2>
            </div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Manual Entry</span>
          </div>

          <form onSubmit={handleManualSave} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Barcode EAN / SKU</label>
              <input 
                required
                value={formData.barcode}
                onChange={e => setFormData({...formData, barcode: e.target.value})}
                placeholder="e.g. 899275321004"
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#FF6B35] transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Nama Produk</label>
              <input 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Contoh: Indomie Goreng Spesial 85g"
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#FF6B35] transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Kategori</label>
                <select 
                  required
                  value={formData.category_id}
                  onChange={e => setFormData({...formData, category_id: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#FF6B35] transition-all appearance-none"
                >
                  <option value="">Pilih...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Lokasi Rak Toko</label>
                <input 
                  value={formData.shelf_location}
                  onChange={e => setFormData({...formData, shelf_location: e.target.value})}
                  placeholder="A-01-03"
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#FF6B35] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Stok Sistem Baseline (PCS)</label>
              <input 
                type="number"
                value={formData.system_stock}
                onChange={e => setFormData({...formData, system_stock: parseInt(e.target.value) || 0})}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#FF6B35] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#FF6B35] hover:bg-[#e85d2a] disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-200 transition-all active:scale-95 mt-2"
            >
              <Plus className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan SKU ke Master'}
            </button>
          </form>
        </div>
      </div>

      {/* Table Preview */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-[#FF6B35]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Preview Master Data Stok Terkini</h2>
              <p className="text-xs text-gray-400">Baseline aktif yang disinkronkan ke aplikasi scanner petugas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari SKU, nama produk, rak..."
                className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm w-64 focus:ring-2 focus:ring-[#FF6B35]"
              />
            </div>
            <select 
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:ring-2 focus:ring-[#FF6B35] appearance-none"
            >
              <option value="">Semua Kategori ({categories.length})</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button 
              onClick={() => {
                const headers = ['Barcode', 'Nama Produk', 'Brand', 'Kategori', 'Lokasi Rak', 'Stok Sistem', 'Terakhir Update']
                const rows = products.map(p => [
                  p.barcode, p.name, p.brand || '', p.categories?.name || '', p.shelf_location || '', p.system_stock, new Date(p.last_updated).toLocaleString('id-ID')
                ])
                const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                downloadBlob(blob, `export_stok_${new Date().toISOString().split('T')[0]}.csv`)
              }}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-y border-gray-50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Barcode EAN / SKU</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Produk</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategori</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Lokasi Rak</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Stok Sistem</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Terakhir Update</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-400 text-sm">Memuat data...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-400 text-sm">Belum ada data produk.</td>
                </tr>
              ) : products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{p.barcode}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{p.name}</div>
                    <div className="text-[11px] text-gray-400 font-medium">{p.brand || 'No Brand'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-bold">
                      {p.categories?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-gray-50 text-gray-500 border border-gray-100 rounded-lg text-[11px] font-bold">
                      {p.shelf_location || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-gray-900">{p.system_stock} <span className="text-[10px] text-gray-400 font-bold uppercase">pcs</span></td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                    {new Date(p.last_updated).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    <div className="text-[10px] text-gray-400">{new Date(p.last_updated).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400 font-medium">
            Menampilkan {products.length} dari {total.toLocaleString()} SKU
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 border border-gray-100 rounded-xl text-gray-400 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {[...Array(Math.min(totalPages, 3))].map((_, i) => (
              <button 
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                  page === i + 1 ? 'bg-[#FF6B35] text-white shadow-lg shadow-orange-200' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            {totalPages > 3 && <span className="text-gray-300 px-2">...</span>}
            {totalPages > 3 && (
              <button 
                onClick={() => setPage(totalPages)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                  page === totalPages ? 'bg-[#FF6B35] text-white' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {totalPages}
              </button>
            )}
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 border border-gray-100 rounded-xl text-gray-400 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
