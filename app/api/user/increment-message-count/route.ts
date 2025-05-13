import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

/**
 * Incrementa el contador de mensajes del usuario con suscripción free
 */
export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      // Si no hay usuario autenticado, devuelve un error 401
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Se busca al usuario en la base de datos
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, messageCount: true, subscriptionStatus: true }
    })

    // Si el usuario no existe, se crea uno nuevo
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          messageCount: 0,
          subscriptionStatus: 'free'
        }
      })
    }

    // Si el usuario tiene una suscripción premium, no se incrementa el contador de mensajes
    if (user.subscriptionStatus === 'premium') {
      return NextResponse.json({ messageCount: 0 })
    }

    
    // Si el usuario tiene una suscripción free, se incrementa el contador de mensajes y se verifica el límite de 3
    const FREE_USER_LIMIT = 3
    if (user.messageCount >= FREE_USER_LIMIT) {
      return NextResponse.json(
        { messageCount: 'Consulta no permitida.Limite alcanzado para usuarios gratuitos.' },
        { status: 403 }
      )
    }

    // Incrementa el contador de mensajes del usuario free
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        messageCount: {
          increment: 1
        }
      },
      select: {
        messageCount: true
      }
    })

    return NextResponse.json({ messageCount: updatedUser.messageCount })
  } catch (error) {
    console.error('Error incrementing message count:', error)
    return NextResponse.json(
      { error: 'Failed to increment message count' },
      { status: 500 }
    )
  }
}
