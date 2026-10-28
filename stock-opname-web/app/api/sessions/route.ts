import { NextRequest, NextResponse } from 'next/server'
import { SessionsRepository } from '@/lib/sessions-repository'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [sessionsResult, categories, officers] = await Promise.all([
      SessionsRepository.getActiveSessions(),
      SessionsRepository.getCategories(),
      SessionsRepository.getOfficers()
    ])

    return NextResponse.json({
      success: true,
      data: sessionsResult.sessions,
      stats: sessionsResult.stats,
      categories,
      officers
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat sesi SO aktif'
    console.error('Error fetching active sessions:', error)
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.category_id && !body.category_name) {
      return NextResponse.json(
        { success: false, message: 'Kategori produk wajib dipilih' },
        { status: 400 }
      )
    }

    const newSession = await SessionsRepository.createSession({
      category_id: body.category_id,
      category_name: body.category_name,
      user_id: body.user_id && typeof body.user_id === 'string' && body.user_id.trim() !== '' ? body.user_id : null,
      officer_name: body.officer_name && typeof body.officer_name === 'string' && body.officer_name.trim() !== '' ? body.officer_name : null,
      start_time: body.start_time,
      notes: body.notes
    })

    return NextResponse.json({
      success: true,
      message: 'Sesi SO baru berhasil dibuat',
      data: newSession
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal membuat sesi SO baru'
    console.error('Error creating session:', error)
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}
