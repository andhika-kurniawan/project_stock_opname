import { NextRequest, NextResponse } from 'next/server'
import { SessionsRepository } from '@/lib/sessions-repository'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const items = await SessionsRepository.getSessionItems(id)

    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat item sesi'
    console.error('Error fetching session items:', error)
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.action === 'complete') {
      const completed = await SessionsRepository.completeSession(id)
      return NextResponse.json({
        success: true,
        message: 'Sesi SO berhasil diselesaikan dan dicatat ke riwayat',
        data: completed
      })
    } else if (body.action === 'cancel') {
      const cancelled = await SessionsRepository.cancelSession(id)
      return NextResponse.json({
        success: true,
        message: 'Sesi SO berhasil dibatalkan',
        data: cancelled
      })
    }

    return NextResponse.json(
      { success: false, message: 'Aksi tidak dikenal' },
      { status: 400 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui status sesi'
    console.error('Error updating session status:', error)
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}
