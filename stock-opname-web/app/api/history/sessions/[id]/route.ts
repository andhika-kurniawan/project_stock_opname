import { NextRequest, NextResponse } from 'next/server'
import { HistoryRepository } from '@/lib/history-repository'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await HistoryRepository.getSessionById(id)

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Sesi SO tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: session
    })
  } catch (error: any) {
    console.error('Error fetching session detail:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memuat detail sesi' },
      { status: 500 }
    )
  }
}
