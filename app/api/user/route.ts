import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth, currentUser } from '@clerk/nextjs/server'

/**
 * Obtiene los datos del usuario
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obtiene
    const clerkUser = await currentUser()

    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Se obtiene o crea el usuario en la base de datos
    let user = await prisma.user.findUnique({
      where: { id: userId }
    })

    // Si el usuario no existe, se crea uno nuevo
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          messageCount: 0,
          subscriptionStatus: 'free'
        }
      })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email || clerkUser.emailAddresses[0]?.emailAddress,
        subscriptionStatus: user.subscriptionStatus,
        messageCount: user.messageCount
      }
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
}

/**
 * Actualización de los datos del usuario
 */
export async function PATCH(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()

    // SOlo se permite actualizar el campo de correo electrónico
    const allowedFields = ['email']
    const updateData: Record<string, any> = {}

    for (const field of allowedFields) {
      if (field in data) {
        updateData[field] = data[field]
      }
    }

    // Actualiza el usuario en la base de datos
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user data' },
      { status: 500 }
    )
  }
}
