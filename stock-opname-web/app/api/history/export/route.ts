import { NextRequest, NextResponse } from 'next/server'
import { HistoryRepository } from '@/lib/history-repository'
import { getRouteClient, unauthorizedResponse } from '@/lib/supabase/route-client'

function clientMeta(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  return {
    ip: forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || null,
    userAgent: request.headers.get('user-agent')
  }
}

function safeFilename(s: string) {
  return s.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_')
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getRouteClient()
    if (!user) return unauthorizedResponse()

    const sp = request.nextUrl.searchParams
    const type = sp.get('type') || 'audit'
    const { ip, userAgent } = clientMeta(request)
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })

    if (type === 'session') {
      const id = sp.get('id')
      if (!id) return NextResponse.json({ success: false, message: 'Parameter id wajib diisi' }, { status: 400 })

      const session = await HistoryRepository.getSessionDetail(supabase, id)
      if (!session) return NextResponse.json({ success: false, message: 'Sesi tidak ditemukan' }, { status: 404 })

      const buffer = await HistoryRepository.generateSessionExcel(session)
      await HistoryRepository.logExport(supabase, {
        userId: user.id,
        entityId: session.session_code,
        description: `Ekspor laporan sesi ${session.session_code} (.xlsx)`,
        details: { format: 'xlsx', session_id: session.id, rows: session.items.length },
        ip,
        userAgent
      })

      const filename = safeFilename(`Laporan_SO_${session.session_code}_${session.category_name}.xlsx`)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    }

    if (type === 'audit') {
      const format = sp.get('format') === 'csv' ? 'csv' : 'xlsx'
      const filters = {
        action: sp.get('action') || undefined,
        search: sp.get('search') || undefined,
        from: sp.get('from') || undefined,
        to: sp.get('to') || undefined
      }
      const logs = await HistoryRepository.getAuditTrailForExport(supabase, filters)

      await HistoryRepository.logExport(supabase, {
        userId: user.id,
        entityId: 'audit_logs',
        description: `Ekspor audit trail (.${format}, ${logs.length} catatan)`,
        details: { format, rows: logs.length, filters },
        ip,
        userAgent
      })

      const filename = `Audit_Trail_${today}.${format}`
      if (format === 'csv') {
        return new NextResponse(HistoryRepository.generateAuditTrailCSV(logs), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        })
      }

      const buffer = await HistoryRepository.generateAuditTrailExcel(logs)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    }

    return NextResponse.json({ success: false, message: 'Tipe ekspor tidak dikenal' }, { status: 400 })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Gagal mengekspor laporan' },
      { status: 500 }
    )
  }
}
