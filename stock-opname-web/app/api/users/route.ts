import { NextRequest, NextResponse } from 'next/server'
import { UsersRepository } from '@/lib/users-repository'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const role = searchParams.get('role') || undefined

    const result = await UsersRepository.getUsers({ search, role })
    return NextResponse.json({
      success: true,
      data: result.users,
      stats: result.stats,
      counts: result.counts
    })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memuat data petugas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation
    if (!body.full_name || !body.username || !body.email) {
      return NextResponse.json(
        { success: false, message: 'Nama lengkap, username, dan email wajib diisi' },
        { status: 400 }
      )
    }

    const newUser = await UsersRepository.createUser({
      full_name: body.full_name,
      username: body.username,
      email: body.email,
      role: body.role || 'staff',
      is_active: body.is_active ?? true,
      assigned_zone: body.assigned_zone,
      daily_scan_count: body.daily_scan_count || 0,
      avatar_url: body.avatar_url
    })

    return NextResponse.json(
      { success: true, message: 'Petugas berhasil ditambahkan', data: newUser },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menambahkan petugas' },
      { status: 500 }
    )
  }
}
