import { NextRequest, NextResponse } from 'next/server'
import { HistoryRepository } from '@/lib/history-repository'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const officer = searchParams.get('officer') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    const result = await HistoryRepository.getCompletedSessions({
      category,
      officer,
      status,
      search
    })

    return NextResponse.json({
      success: true,
      data: result.sessions,
      metrics: result.metrics,
      total_count: result.total_count,
      filter_options: result.filter_options
    })
  } catch (error: any) {
    console.error('Error fetching completed sessions:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memuat riwayat sesi SO' },
      { status: 500 }
    )
  }
}
