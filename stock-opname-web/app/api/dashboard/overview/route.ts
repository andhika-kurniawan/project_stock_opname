import { NextRequest, NextResponse } from 'next/server'
import { DashboardRepository } from '@/lib/dashboard-repository'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const category = sp.get('category') || undefined

    const data = await DashboardRepository.getOverview(category)

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat data dashboard overview'
    console.error('Error in GET /api/dashboard/overview:', error)
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}
