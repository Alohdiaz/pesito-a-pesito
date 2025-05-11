import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

// Maneja la solicitud GET para obtener la suscripción activa del usuario
export async function GET() {
  try {
    // Autenticación del usuario
    const { userId } = await auth()

    if (!userId) {
      // Si no hay usuario autenticado, devuelve un error 401
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Busca la suscripción activa del usuario en la base de datos
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active'
      }
    })

    // Devuelve la suscripción activa o un mensaje de error si no existe
    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan, txHash, walletAddress } = await req.json()

    if (plan !== 'premium') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // En modo de demostración, asumimos que la transacción es válida
    let isVerified = true

    // Crea o actualiza el usuario en la base de datos
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        subscriptionStatus: 'premium'
      },
      create: {
        id: userId,
        subscriptionStatus: 'premium'
      }
    })

    // Calcula la fecha de finalización de la suscripción
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1)

    // Elimina suscripcion del usuario si existe
    await prisma.subscription.deleteMany({
      where: {
        userId
      }
    })

    // Cre a una nueva suscripción en la base de datos
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        status: 'active',
        type: 'monthly',
        startDate: new Date(),
        endDate,
        txHash: txHash || undefined
      }
    })

    return NextResponse.json({ success: true, subscription })
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
