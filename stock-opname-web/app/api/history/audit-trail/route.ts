import { NextRequest, NextResponse } from 'next/server'
import { HistoryRepository } from '@/lib/history-repository'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || undefined
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const result = await HistoryRepository.getAuditTrail({
      action,
      search,
      page,
      limit
    })

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    })
  } catch (error: any) {
    console.error('Error fetching audit trail:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memuat audit trail' },
      { status: 500 }
    )
  }
}
