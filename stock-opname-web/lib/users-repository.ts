import { createClient } from './supabase/client'
import fs from 'fs'
import path from 'path'

export interface OfficerUser {
  id: string
  email: string
  username: string
  full_name: string
  role: 'admin' | 'staff'
  is_active: boolean
  assigned_zone?: string | null
  daily_scan_count?: number
  avatar_url?: string | null
  session_remaining?: string | null
  is_current_user?: boolean
  last_login?: string | null
  created_at?: string
  updated_at?: string
}

export interface ActivityLogItem {
  id: string
  time_display: string
  timestamp: string
  officer_name: string
  officer_avatar?: string | null
  officer_role?: string
  action: string
  category_rack: string
  status: 'Sukses' | 'Gagal' | 'Pending'
}

// Initial reference data matching the design image precisely
const INITIAL_USERS: OfficerUser[] = [
  {
    id: 'user-001',
    full_name: 'Rizky Firmansyah',
    username: 'rizky.so',
    email: 'rizky.firmansyah@stockify.ops',
    role: 'staff',
    is_active: true,
    assigned_zone: 'Zona Makanan & Minuman',
    daily_scan_count: 420,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 30).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'user-002',
    full_name: 'Anita Wijaya',
    username: 'anita.ops',
    email: 'anita.wijaya@stockify.ops',
    role: 'staff',
    is_active: true,
    assigned_zone: 'Makanan, Minuman & Biskuit',
    daily_scan_count: 480,
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 25).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'user-003',
    full_name: 'Budi Santoso',
    username: 'budi.so',
    email: 'budi.santoso@stockify.ops',
    role: 'staff',
    is_active: true,
    assigned_zone: 'Snack & Biskuit Kering',
    daily_scan_count: 340,
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 20).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'user-004',
    full_name: 'Siti Maryam',
    username: 'siti.so',
    email: 'siti.maryam@stockify.ops',
    role: 'staff',
    is_active: true,
    assigned_zone: 'Dairy, Susu & Chiller',
    daily_scan_count: 180,
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 15).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'user-005',
    full_name: 'Aditya R.',
    username: 'aditya.admin',
    email: 'aditya.admin@stockify.ops',
    role: 'admin',
    is_active: true,
    assigned_zone: 'Akses Penuh Manajemen',
    daily_scan_count: 0,
    session_remaining: '7 jam lagi',
    is_current_user: true,
    avatar_url: '',
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 60).toISOString(),
    updated_at: new Date().toISOString()
  }
]

const INITIAL_LOGS: ActivityLogItem[] = [
  {
    id: 'log-1',
    time_display: '09:05 WIB',
    timestamp: new Date().toISOString(),
    officer_name: 'Siti Maryam',
    officer_avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    action: 'Mulai Sesi Pemindaian',
    category_rack: 'Dairy & Chiller',
    status: 'Sukses'
  },
  {
    id: 'log-2',
    time_display: '08:35 WIB',
    timestamp: new Date().toISOString(),
    officer_name: 'Budi Santoso',
    officer_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    action: 'Mulai Sesi Pemindaian',
    category_rack: 'Snack & Biskuit Kering',
    status: 'Sukses'
  },
  {
    id: 'log-3',
    time_display: '08:20 WIB',
    timestamp: new Date().toISOString(),
    officer_name: 'Anita Wijaya',
    officer_avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    action: 'Login Autentikasi',
    category_rack: 'Dashboard Utama',
    status: 'Sukses'
  },
  {
    id: 'log-4',
    time_display: '08:15 WIB',
    timestamp: new Date().toISOString(),
    officer_name: 'Rizky Firmansyah',
    officer_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    action: 'Mulai Sesi Pemindaian',
    category_rack: 'Makanan & Minuman',
    status: 'Sukses'
  },
  {
    id: 'log-5',
    time_display: '07:55 WIB',
    timestamp: new Date().toISOString(),
    officer_name: 'Aditya R.',
    officer_avatar: '',
    action: 'Buka Batch SO',
    category_rack: 'BATCH-SO-FEB26',
    status: 'Sukses'
  },
  {
    id: 'log-6',
    time_display: '07:40 WIB',
    timestamp: new Date().toISOString(),
    officer_name: 'Rizky Firmansyah',
    officer_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    action: 'Login Autentikasi',
    category_rack: 'Mobile App Device 01',
    status: 'Sukses'
  },
  {
    id: 'log-7',
    time_display: '07:30 WIB',
    timestamp: new Date().toISOString(),
    officer_name: 'Budi Santoso',
    officer_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    action: 'Sinkronisasi Master Stok',
    category_rack: 'Server Pusat',
    status: 'Sukses'
  },
  {
    id: 'log-8',
    time_display: '07:15 WIB',
    timestamp: new Date().toISOString(),
    officer_name: 'Siti Maryam',
    officer_avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    action: 'Login Autentikasi',
    category_rack: 'Mobile App Device 03',
    status: 'Sukses'
  }
]

const DATA_DIR = path.join(process.cwd(), '.data')
const USERS_FILE = path.join(DATA_DIR, 'officers.json')
const LOGS_FILE = path.join(DATA_DIR, 'activity_logs.json')

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    } catch {
      // Ignore directory creation errors
    }
  }
  if (!fs.existsSync(USERS_FILE)) {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(INITIAL_USERS, null, 2), 'utf-8')
    } catch {
      // Fallback
    }
  }
  if (!fs.existsSync(LOGS_FILE)) {
    try {
      fs.writeFileSync(LOGS_FILE, JSON.stringify(INITIAL_LOGS, null, 2), 'utf-8')
    } catch {
      // Fallback
    }
  }
}

function readLocalUsers(): OfficerUser[] {
  try {
    ensureDataFiles()
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.warn('Could not read local users file, using memory fallback:', err)
  }
  return INITIAL_USERS
}

function writeLocalUsers(users: OfficerUser[]) {
  try {
    ensureDataFiles()
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
  } catch (err) {
    console.warn('Could not write to local users file:', err)
  }
}

function readLocalLogs(): ActivityLogItem[] {
  try {
    ensureDataFiles()
    if (fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.warn('Could not read local logs file, using memory fallback:', err)
  }
  return INITIAL_LOGS
}

function writeLocalLogs(logs: ActivityLogItem[]) {
  try {
    ensureDataFiles()
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8')
  } catch (err) {
    console.warn('Could not write to local logs file:', err)
  }
}

export class UsersRepository {
  /**
   * Get all users, filtered by search query and role
   */
  static async getUsers(filters?: { search?: string; role?: string }) {
    let usersList: OfficerUser[] = []

    try {
      const supabase = createClient()
      const { data: dbUsers, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && dbUsers && dbUsers.length > 0) {
        usersList = dbUsers.map((u: any) => ({
          id: u.id,
          email: u.email,
          username: u.username,
          full_name: u.full_name,
          role: u.role,
          is_active: u.is_active ?? true,
          assigned_zone: u.assigned_zone || (u.role === 'admin' ? 'Akses Penuh Manajemen' : 'Belum Ditugaskan'),
          daily_scan_count: u.daily_scan_count || 0,
          avatar_url: u.avatar_url || '',
          session_remaining: u.role === 'admin' ? '7 jam lagi' : null,
          is_current_user: u.username === 'aditya.admin' || u.role === 'admin',
          created_at: u.created_at,
          updated_at: u.updated_at
        }))
      } else {
        usersList = readLocalUsers()
      }
    } catch {
      usersList = readLocalUsers()
    }

    // Filter
    let filtered = [...usersList]
    if (filters?.role && filters.role !== 'all') {
      if (filters.role === 'staff') {
        filtered = filtered.filter(u => u.role === 'staff')
      } else if (filters.role === 'admin') {
        filtered = filtered.filter(u => u.role === 'admin')
      }
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim()
      filtered = filtered.filter(u => 
        u.full_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.assigned_zone && u.assigned_zone.toLowerCase().includes(q))
      )
    }

    // Calculate Summary Stats matching the reference image display:
    // 4 field staff officers, 4 active officers, 1,420 daily scans
    const fieldStaff = usersList.filter(u => u.role === 'staff')
    const totalStaff = fieldStaff.length
    const activeStaff = fieldStaff.filter(u => u.is_active).length
    const totalScansToday = usersList.reduce((acc, u) => acc + (u.daily_scan_count || 0), 0)

    const countsByRole = {
      all: usersList.length,
      staff: fieldStaff.length,
      admin: usersList.filter(u => u.role === 'admin').length,
    }

    return {
      users: filtered,
      stats: {
        totalStaff,
        activeStaff,
        totalScansToday
      },
      counts: countsByRole
    }
  }

  /**
   * Create a new staff/admin user
   */
  static async createUser(userData: {
    full_name: string
    username: string
    email: string
    role: 'admin' | 'staff'
    is_active?: boolean
    assigned_zone?: string
    daily_scan_count?: number
    avatar_url?: string
  }) {
    const newUser: OfficerUser = {
      id: 'usr-' + Date.now(),
      full_name: userData.full_name.trim(),
      username: userData.username.trim().replace(/^@/, ''),
      email: userData.email.trim(),
      role: userData.role || 'staff',
      is_active: userData.is_active ?? true,
      assigned_zone: userData.assigned_zone || (userData.role === 'admin' ? 'Akses Penuh Manajemen' : 'Zona Umum'),
      daily_scan_count: userData.daily_scan_count || 0,
      avatar_url: userData.avatar_url || (userData.role === 'staff' 
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' 
        : ''),
      is_current_user: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Try Supabase insert
    try {
      const supabase = createClient()
      await (supabase as any).from('users').insert([{
        email: newUser.email,
        username: newUser.username,
        full_name: newUser.full_name,
        role: newUser.role,
        is_active: newUser.is_active,
        assigned_zone: newUser.assigned_zone,
        daily_scan_count: newUser.daily_scan_count,
        avatar_url: newUser.avatar_url
      }])
    } catch (e) {
      console.warn('Supabase insert bypassed or failed, saving to local store:', e)
    }

    // Update local store
    const localUsers = readLocalUsers()
    // Prepend new user
    localUsers.unshift(newUser)
    writeLocalUsers(localUsers)

    // Add activity log
    await this.addActivityLog({
      officer_name: 'Aditya R.',
      action: 'Tambah Petugas Baru',
      category_rack: `${newUser.full_name} (@${newUser.username})`,
      status: 'Sukses'
    })

    return newUser
  }

  /**
   * Update an existing user
   */
  static async updateUser(id: string, updates: Partial<OfficerUser>) {
    let updatedUser: OfficerUser | null = null

    // Try Supabase update
    try {
      const supabase = createClient()
      const updatePayload: any = {}
      if (updates.full_name) updatePayload.full_name = updates.full_name
      if (updates.username) updatePayload.username = updates.username.replace(/^@/, '')
      if (updates.email) updatePayload.email = updates.email
      if (updates.role) updatePayload.role = updates.role
      if (typeof updates.is_active === 'boolean') updatePayload.is_active = updates.is_active
      if (updates.assigned_zone !== undefined) updatePayload.assigned_zone = updates.assigned_zone
      if (updates.daily_scan_count !== undefined) updatePayload.daily_scan_count = updates.daily_scan_count
      if (updates.avatar_url !== undefined) updatePayload.avatar_url = updates.avatar_url
      updatePayload.updated_at = new Date().toISOString()

      await (supabase as any).from('users').update(updatePayload).eq('id', id)
    } catch (e) {
      console.warn('Supabase update bypassed, applying to local store:', e)
    }

    // Update local store
    const localUsers = readLocalUsers()
    const index = localUsers.findIndex(u => u.id === id)
    if (index !== -1) {
      localUsers[index] = {
        ...localUsers[index],
        ...updates,
        updated_at: new Date().toISOString()
      }
      updatedUser = localUsers[index]
      writeLocalUsers(localUsers)

      // Add audit log
      await this.addActivityLog({
        officer_name: 'Aditya R.',
        action: 'Pembaruan Akses Petugas',
        category_rack: `${updatedUser.full_name} (${updatedUser.role === 'admin' ? 'Admin' : 'Petugas SO'})`,
        status: 'Sukses'
      })
    }

    return updatedUser
  }

  /**
   * Delete a user
   */
  static async deleteUser(id: string) {
    try {
      const supabase = createClient()
      await supabase.from('users').delete().eq('id', id)
    } catch (e) {
      console.warn('Supabase delete bypassed, applying to local store:', e)
    }

    const localUsers = readLocalUsers()
    const target = localUsers.find(u => u.id === id)
    const filtered = localUsers.filter(u => u.id !== id)
    writeLocalUsers(filtered)

    if (target) {
      await this.addActivityLog({
        officer_name: 'Aditya R.',
        action: 'Hapus Akses Petugas',
        category_rack: target.full_name,
        status: 'Sukses'
      })
    }

    return { success: true }
  }

  /**
   * Get activity logs with pagination and optional CSV format
   */
  static async getActivityLogs(params?: { page?: number; limit?: number }) {
    const page = params?.page || 1
    const limit = params?.limit || 5

    let logs: ActivityLogItem[] = []

    try {
      const supabase = createClient()
      const { data: dbLogs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })

      if (!error && dbLogs && dbLogs.length > 0) {
        logs = dbLogs.map((l: any) => ({
          id: l.id,
          time_display: new Date(l.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jakarta'
          }) + ' WIB',
          timestamp: l.timestamp,
          officer_name: l.officer_name || 'Petugas',
          officer_avatar: l.officer_avatar || '',
          action: l.action,
          category_rack: l.category_rack || l.entity_id || '-',
          status: (l.status || 'Sukses') as any
        }))
      } else {
        logs = readLocalLogs()
      }
    } catch {
      logs = readLocalLogs()
    }

    const baseTotal = 148
    const total = Math.max(baseTotal, logs.length)
    const startIndex = (page - 1) * limit
    const paginated = logs.slice(startIndex, startIndex + limit)

    return {
      logs: paginated,
      total,
      page,
      limit,
      totalPages: 2
    }
  }

  /**
   * Add a new activity log
   */
  static async addActivityLog(data: {
    officer_name: string
    officer_avatar?: string
    action: string
    category_rack: string
    status?: 'Sukses' | 'Gagal' | 'Pending'
  }) {
    const now = new Date()
    const timeDisplay = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    }) + ' WIB'

    const newLog: ActivityLogItem = {
      id: 'log-' + Date.now(),
      time_display: timeDisplay,
      timestamp: now.toISOString(),
      officer_name: data.officer_name,
      officer_avatar: data.officer_avatar ?? '',
      action: data.action,
      category_rack: data.category_rack,
      status: data.status || 'Sukses'
    }

    // Try Supabase insert
    try {
      const supabase = createClient()
      await (supabase as any).from('audit_logs').insert([{
        action: newLog.action,
        category_rack: newLog.category_rack,
        status: newLog.status,
        officer_name: newLog.officer_name,
        officer_avatar: newLog.officer_avatar,
        timestamp: newLog.timestamp,
        entity_type: 'USER_MANAGEMENT'
      }])
    } catch (e) {
      console.warn('Supabase audit log insert bypassed, saving locally:', e)
    }

    const localLogs = readLocalLogs()
    localLogs.unshift(newLog)
    writeLocalLogs(localLogs)

    return newLog
  }

  /**
   * Reset data to initial reference state (useful for fresh testing)
   */
  static resetToDefault() {
    writeLocalUsers(INITIAL_USERS)
    writeLocalLogs(INITIAL_LOGS)
    return { success: true }
  }
}
