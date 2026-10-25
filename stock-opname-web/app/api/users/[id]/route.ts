import { NextRequest, NextResponse } from 'next/server'
import { UsersRepository } from '@/lib/users-repository'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updatedUser = await UsersRepository.updateUser(id, body)
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'Petugas tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Data petugas berhasil diperbarui',
      data: updatedUser
    })
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memperbarui petugas' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await UsersRepository.deleteUser(id)

    return NextResponse.json({
      success: true,
      message: 'Petugas berhasil dihapus'
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menghapus petugas' },
      { status: 500 }
    )
  }
}
