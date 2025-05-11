import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

/**
 * Se reinicia el contador de mensajes del usuario free
 */
export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, subscriptionStatus: true }
    })

    // SI no existe el usuario, se crea uno nuevo
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // Reinicia el contador de mensajes del usuario free
    await prisma.user.update({
      where: { id: userId },
      data: {
        messageCount: 0
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting message count:', error)
    return NextResponse.json(
      { error: 'Failed to reset message count' },
      { status: 500 }
    )
  }
}
