import ExcelJS from 'exceljs'
import type { SessionWithRelations, SOItemWithRelations, ExportReportRow } from '../../../types'

export async function generateProductImportTemplate(): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Products Import')

  worksheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Barcode', key: 'barcode', width: 20 },
    { header: 'Nama Produk', key: 'name', width: 40 },
    { header: 'Kategori', key: 'category', width: 20 },
    { header: 'Stok Sistem', key: 'system_stock', width: 15 },
    { header: 'Catatan', key: 'notes', width: 30 },
  ]

  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  headerRow.height = 30

  const sampleData = [
    { no: 1, barcode: '8991002001015', name: 'Pocari Sweat 500ml', category: 'Beverages', system_stock: 50, notes: '' },
    { no: 2, barcode: '8992761234567', name: 'Indomie Goreng', category: 'Snacks', system_stock: 120, notes: '' },
    { no: 3, barcode: '8993456789012', name: 'Samsung USB Cable', category: 'Electronics', system_stock: 30, notes: '' },
  ]

  worksheet.addRows(sampleData)

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
      })
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export async function generateSOReport(
  sessionData: SessionWithRelations,
  items: SOItemWithRelations[]
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Laporan Stock Opname')

  worksheet.mergeCells('A1:H1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = `LAPORAN STOCK OPNAME - ${sessionData.session_code}`
  titleCell.font = { bold: true, size: 16 }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }

  worksheet.mergeCells('A2:H2')
  const infoCell = worksheet.getCell('A2')
  infoCell.value = `Kategori: ${sessionData.categories?.name || '-'} | Petugas: ${sessionData.users?.full_name || '-'} | Tanggal: ${new Date(sessionData.start_time).toLocaleDateString('id-ID')}`
  infoCell.alignment = { horizontal: 'center' }

  worksheet.addRow([])

  worksheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Barcode', key: 'barcode', width: 20 },
    { header: 'Nama Produk', key: 'name', width: 40 },
    { header: 'Stok Sistem', key: 'system_stock', width: 15 },
    { header: 'Stok Fisik', key: 'physical_stock', width: 15 },
    { header: 'Selisih', key: 'variance', width: 12 },
    { header: '% Selisih', key: 'variance_pct', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
  ]

  const headerRow = worksheet.getRow(4)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

  const dataRows = items.map((item, index) => {
    const variance = item.variance || 0
    const variancePct =
      item.system_stock > 0
        ? ((variance / item.system_stock) * 100).toFixed(2)
        : '0.00'
    const status = item.is_counted
      ? variance === 0
        ? 'Match'
        : 'Variance'
      : 'Not Counted'

    return {
      no: index + 1,
      barcode: item.products?.barcode || '-',
      name: item.products?.name || '-',
      system_stock: item.system_stock,
      physical_stock: item.physical_stock ?? '-',
      variance: item.is_counted ? variance : '-',
      variance_pct: item.is_counted ? `${variancePct}%` : '-',
      status,
    }
  })

  worksheet.addRows(dataRows)

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 4) {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
        if (colNumber === 7) {
          cell.alignment = { horizontal: 'right' }
        }
      })

      const statusCell = row.getCell(8)
      const status = statusCell.value as string
      if (status === 'Variance') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCDD2' },
        }
        statusCell.font = { color: { argb: 'FFC62828' } }
      } else if (status === 'Match') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC8E6C9' },
        }
        statusCell.font = { color: { argb: 'FF2E7D32' } }
      }
    }
  })

  const summaryStartRow = dataRows.length + 6

  worksheet.getCell(`A${summaryStartRow}`).value = 'RINGKASAN'
  worksheet.getCell(`A${summaryStartRow}`).font = { bold: true }

  const totalItems = items.length
  const countedItems = items.filter((i) => i.is_counted).length
  const matchItems = items.filter((i) => i.is_counted && i.variance === 0).length
  const varianceItems = items.filter((i) => i.is_counted && i.variance !== 0).length

  worksheet.getCell(`A${summaryStartRow + 1}`).value = `Total Item: ${totalItems}`
  worksheet.getCell(`A${summaryStartRow + 2}`).value = `Sudah Dihitung: ${countedItems}`
  worksheet.getCell(`A${summaryStartRow + 3}`).value = `Match: ${matchItems}`
  worksheet.getCell(`A${summaryStartRow + 4}`).value = `Variance: ${varianceItems}`

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export async function parseImportFile(file: File): Promise<any[]> {
  const workbook = new ExcelJS.Workbook()
  const arrayBuffer = await file.arrayBuffer()
  await workbook.xlsx.load(arrayBuffer)

  const worksheet = workbook.worksheets[0]
  const data: any[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const barcode = row.getCell(2).value?.toString().trim()
      const name = row.getCell(3).value?.toString().trim()
      const category = row.getCell(4).value?.toString().trim()
      const systemStock = parseInt(row.getCell(5).value?.toString() || '0', 10)

      if (barcode && name && category) {
        data.push({
          barcode,
          name,
          category_name: category,
          system_stock: systemStock || 0,
        })
      }
    }
  })

  return data
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
