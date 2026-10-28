import { NextRequest, NextResponse } from 'next/server'
import { UsersRepository } from '@/lib/users-repository'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '5', 10)
    const format = searchParams.get('format')

    // If requesting CSV download
    if (format === 'csv') {
      const allLogsResult = await UsersRepository.getActivityLogs({ page: 1, limit: 1000 })
      const logs = allLogsResult.logs

      // Build CSV string
      const headers = ['Waktu', 'Petugas', 'Aktivitas', 'Kategori/Target Rak', 'Status', 'Timestamp ISO']
      const rows = logs.map(l => [
        `"${l.time_display}"`,
        `"${l.officer_name.replace(/"/g, '""')}"`,
        `"${l.action.replace(/"/g, '""')}"`,
        `"${l.category_rack.replace(/"/g, '""')}"`,
        `"${l.status}"`,
        `"${l.timestamp}"`
      ])

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="log_aktivitas_petugas_${new Date().toISOString().slice(0, 10)}.csv"`
        }
      })
    }

    const result = await UsersRepository.getActivityLogs({ page, limit })
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
    console.error('Error fetching activity logs:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memuat log aktivitas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const log = await UsersRepository.addActivityLog(body)
    return NextResponse.json({
      success: true,
      data: log
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mencatat aktivitas' },
      { status: 500 }
    )
  }
}
