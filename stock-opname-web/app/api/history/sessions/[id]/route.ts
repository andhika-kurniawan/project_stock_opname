import { NextRequest, NextResponse } from 'next/server'
import { HistoryRepository } from '@/lib/history-repository'
import { getRouteClient, unauthorizedResponse } from '@/lib/supabase/route-client'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getRouteClient()
    if (!user) return unauthorizedResponse()

    const { id } = await params
    const session = await HistoryRepository.getSessionDetail(supabase, decodeURIComponent(id))

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Sesi SO tidak ditemukan atau Anda tidak memiliki akses.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    console.error('Error fetching session detail:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Gagal memuat detail sesi' },
      { status: 500 }
    )
  }
}
