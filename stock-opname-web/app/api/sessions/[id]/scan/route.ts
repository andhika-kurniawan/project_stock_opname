import { NextRequest, NextResponse } from 'next/server'
import { SessionsRepository } from '@/lib/sessions-repository'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const itemId = body.item_id || body.itemId
    const rawStock = body.physical_stock !== undefined ? body.physical_stock : body.physicalStock

    if (!itemId) {
      return NextResponse.json(
        { success: false, message: 'Item ID wajib disertakan' },
        { status: 400 }
      )
    }

    if (rawStock === undefined || rawStock === null || isNaN(Number(rawStock))) {
      return NextResponse.json(
        { success: false, message: 'Jumlah fisik valid wajib diisi' },
        { status: 400 }
      )
    }

    const count = Math.max(0, parseInt(String(rawStock), 10))
    const officerName = body.officer_name || body.officerName || 'Petugas SO'

    const result = await SessionsRepository.updateItemScan(id, itemId, count, officerName)

    return NextResponse.json({
      success: true,
      message: `Hasil pemindaian disimpan: ${result.item.name} (${count} pcs)`,
      data: result
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan hasil pemindaian'
    console.error('Error recording item scan:', error)
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}
