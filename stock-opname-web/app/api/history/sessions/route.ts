import { NextRequest, NextResponse } from 'next/server'
import { HistoryRepository } from '@/lib/history-repository'
import { getRouteClient, unauthorizedResponse } from '@/lib/supabase/route-client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getRouteClient()
    if (!user) return unauthorizedResponse()

    const sp = request.nextUrl.searchParams
    const result = await HistoryRepository.getCompletedSessions(supabase, {
      category: sp.get('category') || undefined,
      officer: sp.get('officer') || undefined,
      status: sp.get('status') || undefined,
      search: sp.get('search') || undefined,
      from: sp.get('from') || undefined,
      to: sp.get('to') || undefined
    })

    return NextResponse.json({
      success: true,
      data: result.sessions,
      metrics: result.metrics,
      total_count: result.sessions.length,
      filter_options: result.filter_options
    })
  } catch (error) {
    console.error('Error fetching completed sessions:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Gagal memuat riwayat sesi SO' },
      { status: 500 }
    )
  }
}
