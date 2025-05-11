import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Actualiza el estado de la suscripción del usuario a 'free'
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'free'
      }
    })

    // Actualiza la suscripcion activa del usuario a 'cancelled'
    await prisma.subscription.updateMany({
      where: {
        userId,
        status: 'active'
      },
      data: {
        status: 'cancelled'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Subscription cancel error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
