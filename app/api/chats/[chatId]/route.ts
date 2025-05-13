import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

/**
 * Obtener un chat específico por ID
 */
export async function GET(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obtiene el estado de suscripción del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true }
    })

    // Solo los usuarios premium pueden acceder al historial de chats
    if (!user || user.subscriptionStatus !== 'premium') {
      return NextResponse.json(
        { error: 'Premium subscription required' },
        { status: 403 }
      )
    }

    const chat = await prisma.chat.findUnique({
      where: {
        id: params.chatId,
        userId
      }
    })

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    return NextResponse.json(chat)
  } catch (error) {
    console.error('Chat fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Eliminar un chat
 */
export async function DELETE(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Se obtiene el estado de suscripción del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true }
    })

    // Solo los usuarios premium pueden eliminar chats
    if (!user || user.subscriptionStatus !== 'premium') {
      return NextResponse.json(
        { error: 'Premium subscription required' },
        { status: 403 }
      )
    }

    const chat = await prisma.chat.findUnique({
      where: {
        id: params.chatId,
        userId
      }
    })

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Borra el chat
    await prisma.chat.delete({
      where: { id: params.chatId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Chat delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
