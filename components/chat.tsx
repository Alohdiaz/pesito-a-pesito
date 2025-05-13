'use client'

import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { useEffect, useState, useRef } from 'react'
import { useUIState, useAIState } from 'ai/rsc'
import { usePathname, useRouter } from 'next/navigation'
import { useScrollAnchor } from '@/lib/hooks/use-scroll-anchor'
import { toast } from 'sonner'
import { TickerTape } from '@/components/tradingview/ticker-tape'
import { MissingApiKeyBanner } from '@/components/missing-api-key-banner'
import { useUserStore } from '@/lib/store/user-store'
import { useUser } from '@clerk/nextjs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import { Button } from './ui/button'
import Image from 'next/image'

export interface ChatProps extends React.ComponentProps<'div'> {
  id?: string
  missingKeys: string[]
}

export function Chat({ id, className, missingKeys }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [input, setInput] = useState('')
  const [messages] = useUIState()
  const [aiState] = useAIState()
  const { user, incrementMessageCount } = useUserStore()
  const { isSignedIn } = useUser()
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [isNewChat, setIsNewChat] = useState(!path?.includes('/chat/'))
  const redirectInProgress = useRef(false)
  const redirectTimeout = useRef<NodeJS.Timeout | null | any>(null)

  // Maneja la creación del chat y la redirección
  useEffect(() => {
    if (
      isNewChat &&
      aiState?.chatId &&
      aiState.messages?.length > 0 &&
      !path?.includes(aiState.chatId) &&
      !redirectInProgress.current &&
      user?.subscriptionStatus === 'premium'
    ) {
      // Establece una bandera para evitar redirecciones múltiples
      redirectInProgress.current = true

      // Genera un evento para asegurar que se actualice la lista de chats
      window.dispatchEvent(new Event('refetch-chats'))

      // Limpia cualquier timeout existente
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }

      // Agrega un retraso para asegurar que el chat se registre en la base de datos
      redirectTimeout.current = setTimeout(() => {
        // Usa replace en lugar de push para evitar problemas con el botón de retroceso
        router.replace(`/chat/${aiState.chatId}`)
        setIsNewChat(false)
        redirectInProgress.current = false
      }, 1500) // Mayor retraso para permitir que se completen las operaciones en base de datos
    }

    // Limpieza del timeout al desmontar el componente
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }
    }
  }, [aiState, isNewChat, path, router, user?.subscriptionStatus])

  // Muestra errores por claves de entorno faltantess
  useEffect(() => {
    missingKeys.forEach(key => {
      toast.error(`Falta tu ${key} como variable de entorno!`)
    })
  }, [missingKeys])

  // Verifica el límite de mensajes para usuarios gratuitos
  const checkMessageLimit = async (): Promise<boolean> => {
    if (!isSignedIn) {
      router.push('/sign-in')
      return false
    }

    // Si el usuario es premium, no se verifica el límite
    if (user?.subscriptionStatus === 'premium') {
      return true
    }

    // Para usuarios gratuitos, verifica e incrementa el contador de mensajes
    const newCount = await incrementMessageCount()

    if (newCount > 3) {
      setShowLimitDialog(true)
      return false
    }

    return true
  }

  const { messagesRef, scrollRef, visibilityRef, isAtBottom, scrollToBottom } =
    useScrollAnchor()

  return (
    <div className="w-full overflow-auto" ref={scrollRef}>
      {messages.length ? (
        <MissingApiKeyBanner missingKeys={missingKeys} />
      ) : (
        <TickerTape />
      )}

      <div
        className={cn(messages.length ? 'pb-40 ' : 'pb-40 ', className)}
        ref={messagesRef}
      >
        {messages.length ? <ChatList messages={messages} /> : <EmptyScreen />}
        <div className="w-full h-px" ref={visibilityRef} />
      </div>

      <ChatPanel
        id={id}
        input={input}
        setInput={setInput}
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
        checkMessageLimit={checkMessageLimit}
      />

      {/* Diálogo de límite de mensajes */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex justify-center items-center my-2">
              <Image
                alt="Sad Dog"
                src={'/sad-dog.svg'}
                className="object-contain my-2"
                width={300}
                height={300}
                priority
              />
            </div>
            <DialogTitle>Límite de mensajes alcanzado</DialogTitle>
            <DialogDescription>
              Has alcanzado el límite de 3 mensajes para cuentas gratuitas.
              Actualiza a Premium para obtener mensajes ilimitados y más
              funciones.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={() => setShowLimitDialog(false)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                setShowLimitDialog(false)
                router.push('/pricing')
              }}
            >
              Ver planes Premium
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
