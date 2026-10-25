import { NextResponse } from 'next/server'
import { UsersRepository } from '@/lib/users-repository'

export async function POST() {
  try {
    UsersRepository.resetToDefault()
    return NextResponse.json({
      success: true,
      message: 'Data petugas dan log aktivitas berhasil di-reset ke nilai default referensi'
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mereset data' },
      { status: 500 }
    )
  }
}
