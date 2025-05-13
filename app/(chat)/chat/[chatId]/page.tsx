import { redirect } from 'next/navigation'
import { getMissingKeys } from '@/app/actions'
import { Chat } from '@/components/chat'
import { AI } from '@/lib/chat/actions'
import { prisma } from '@/lib/prisma'
import { auth, currentUser } from '@clerk/nextjs/server'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ChatPageParams {
  params: {
    chatId: string
  }
}

export default async function ChatPage({ params }: ChatPageParams) {
  const { chatId } = params

  // Verifica si faltan claves de entorno requeridas para la aplicación
  const missingKeys = await getMissingKeys()

  // Obtiene la sesión del usuario autenticado
  const { userId } = await auth()
  const user = await currentUser()

  // Si el usuario no está autenticado, redirige a la página de inicio de sesión
  if (!userId || !user) {
    redirect('/sign-in?redirect_url=' + encodeURIComponent(`/chat/${chatId}`))
  }

  let error = null
  let initialAIState = { chatId, messages: [] } as any

  try {
    // Verifica si el usuario en base de datos tiene una suscripción activa
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true }
    })

    // Si no tiene suscripción premium, redirige al home
    if (!dbUser || dbUser.subscriptionStatus !== 'premium') {
      redirect('/')
    }

    // Espera breve para asegurar sincronización de datos antes de continuar
    await new Promise(resolve => setTimeout(resolve, 200))

    // Busca el chat por ID y verifica que pertenezca al usuario autenticado
    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
        userId
      }
    })

    // Si el chat no existe o no pertenece al usuario, redirige al home
    if (!chat) {
      console.error('Chat not found or access denied:', chatId)
      redirect('/')
    }
    
    // Recupera el estado guardado del chat (mensajes, etc.)
    initialAIState = (chat.stateData as any) || { chatId, messages: [] }

    // Parsea correctamente los mensajes si están serializados como JSON
    if (initialAIState.messages) {
      initialAIState.messages = initialAIState.messages.map((msg: any) => {
        if (typeof msg.content === 'string') {
          try {
            if (msg.content.startsWith('[{') || msg.content.startsWith('{')) {
              msg.content = JSON.parse(msg.content)
            }
          } catch (e) {
            console.error('Failed to parse message content:', e)
            // Deja el contenido como string si no se puede parsear
          }
        }
        return msg
      })
    }

    // Asegura que el chatId esté siempre definido en el estado
    initialAIState.chatId = chatId
  } catch (e) {
    console.error('Error loading chat:', e)
    error = 'Error al cargar la conversación'
    redirect('/')
  }

  // Renderiza alerta si hubo un error durante la carga del chat
  if (error) {
    return (
      <div className="container flex flex-col items-center justify-center h-[calc(100vh-4rem)] max-w-2xl mx-auto">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Renderiza alerta si faltan claves necesarias en el entorno
  if (missingKeys.length > 0) {
    return (
      <div className="container flex flex-col items-center justify-center h-[calc(100vh-4rem)] max-w-2xl mx-auto">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de configuración</AlertTitle>
          <AlertDescription>
            Faltan claves de entorno necesarias para el funcionamiento de la
            aplicación.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Renderiza el componente del chat dentro del proveedor de IA
  return (
    <div className="">
      <AI initialAIState={initialAIState} initialUIState={[]}>
        <Chat id={chatId} missingKeys={missingKeys} />
      </AI>
    </div>
  )
}
// Fuerza el renderizado dinámico en cada solicitud (Next.js)
export const dynamic = 'force-dynamic'
