import { NextRequest, NextResponse } from 'next/server'
import { HistoryRepository } from '@/lib/history-repository'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'audit'
    const format = searchParams.get('format') || 'xlsx'
    const id = searchParams.get('id')

    if (type === 'session' && id) {
      const session = await HistoryRepository.getSessionById(id)
      if (!session) {
        return new NextResponse('Sesi tidak ditemukan', { status: 404 })
      }

      const buffer = await HistoryRepository.generateSessionExcel(session)
      const filename = `Laporan_SO_${session.session_code}_${session.category_name.replace(/[\s&]+/g, '_')}.xlsx`

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    }

    if (type === 'audit') {
      if (format === 'csv') {
        const csv = HistoryRepository.generateAuditTrailCSV()
        const filename = `Stockify_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        })
      } else {
        const buffer = await HistoryRepository.generateAuditTrailExcel()
        const filename = `Stockify_Audit_Trail_${new Date().toISOString().slice(0, 10)}.xlsx`

        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        })
      }
    }

    return new NextResponse('Invalid request', { status: 400 })
  } catch (error: any) {
    console.error('Export error:', error)
    return new NextResponse('Gagal mengekspor laporan: ' + error.message, { status: 500 })
  }
}
