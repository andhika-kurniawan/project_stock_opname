import { NextRequest, NextResponse } from 'next/server'
import { HistoryRepository } from '@/lib/history-repository'
import { getRouteClient, unauthorizedResponse } from '@/lib/supabase/route-client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getRouteClient()
    if (!user) return unauthorizedResponse()

    const sp = request.nextUrl.searchParams
    const result = await HistoryRepository.getAuditTrail(supabase, {
      action: sp.get('action') || undefined,
      search: sp.get('search') || undefined,
      from: sp.get('from') || undefined,
      to: sp.get('to') || undefined,
      page: parseInt(sp.get('page') || '1', 10) || 1,
      limit: parseInt(sp.get('limit') || '10', 10) || 10
    })

    return NextResponse.json({
      success: true,
      data: result.logs,
      action_options: result.action_options,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    })
  } catch (error) {
    console.error('Error fetching audit trail:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Gagal memuat audit trail' },
      { status: 500 }
    )
  }
}
