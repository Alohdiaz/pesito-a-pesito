'use client'

import React, { useCallback, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { IconMessage, IconTrash } from '@/components/ui/icons'
import { useUserStore } from '@/lib/store/user-store'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { ChevronLeft, SquarePen } from 'lucide-react'

type Chat = {
  id: string
  title: string
  createdAt: string
  _count?: {
    messages: number
  }
}

interface ChatSidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function ChatSidebar({ isOpen, setIsOpen }: ChatSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const lastFetchRef = useRef<number>(0)
  const fetchInProgress = useRef<boolean>(false)
  const { user } = useUserStore()

  // Obtiene los chats,evitando llamadas duplicadas y controlando el estado de carga
  const fetchChats = useCallback(
    async (force = false) => {
      if (!user || fetchInProgress.current) return

      const now = Date.now()
      if (!force && now - lastFetchRef.current < 10000) return // 10 segundos de espera

      fetchInProgress.current = true
      setIsLoading(true)

      try {
        const response = await fetch('/api/chats', {
          // Agrega caché-control para evitar problemas de caché
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setChats(data.chats)
          lastFetchRef.current = now
        } else {
          console.error('Failed to fetch chats:', response.status)
          if (!force) {
            // Solo muestra error en fetches automáticos
            toast.error('No se pudieron cargar las conversaciones')
          }
        }
      } catch (error) {
        console.error('Failed to fetch chats:', error)
        if (!force) {
          // Solo muestra error en fetches automáticos
          toast.error('Error al cargar conversaciones')
        }
      } finally {
        setIsLoading(false)
        fetchInProgress.current = false
      }
    },
    [user]
  )

  const deleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' })
      if (response.ok) {
        setChats(prev => prev.filter(c => c.id !== chatId))
        toast.success('Conversación eliminada')
        if (pathname.includes(chatId)) router.push('/new')
      } else {
        toast.error('No se pudo eliminar la conversación')
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
      toast.error('Error al eliminar la conversación')
    } finally {
      setDeleteDialogOpen(false)
      setChatToDelete(null)
    }
  }


  const handleDeleteClick = (chatId: Chat, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setChatToDelete(chatId)
    setDeleteDialogOpen(true)
  }

  // Carga inicial de chats cuando el usuario es premium
  useEffect(() => {
    if (user?.subscriptionStatus === 'premium') {
      fetchChats(true)
    }
  }, [user?.subscriptionStatus, fetchChats])

  // Escucha eventos de refetch desde el sidebar para actualizar chats
  useEffect(() => {
    const handleRefetchEvent = () => {
      // timeout para evitar problemas de estado
      setTimeout(() => {
        fetchChats(true)
      }, 1000)
    }

    window.addEventListener('refetch-chats', handleRefetchEvent)

    return () => {
      window.removeEventListener('refetch-chats', handleRefetchEvent)
    }
  }, [fetchChats])

  // Actualiza automáticamente los chats cada 30 segundos si el sidebar está abierto y el usuario es premium
  useEffect(() => {
    if (isOpen && user?.subscriptionStatus === 'premium') {
      const interval = setInterval(() => {
        fetchChats(false)
      }, 30000) // Actualiza cada 30 segundos

      return () => clearInterval(interval)
    }
  }, [isOpen, user?.subscriptionStatus, fetchChats])

  // Actualización manual de chats
  const refreshChats = () => fetchChats(true)

  const isPremium = user?.subscriptionStatus === 'premium'
  if (!isPremium) return null

  return (
    <>
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 transform bg-background border-r transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-full flex flex-col pt-16">
          <div className="px-4 py-3 flex items-center justify-between border-b">
            <h2 className="text-lg font-medium">Historial de Chats</h2>
            <div className="flex items-center space-x-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  // Forzar navegación completa a /new en lugar de usar navegación suave para evitar problemas de estado
                  window.location.href = '/new'
                }}
              >
                <SquarePen className="h-4 w-4" />
                <span className="sr-only">New chat</span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={refreshChats}
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground"
              >
                {/* Refresca icono */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn('h-4 w-4', isLoading && 'animate-spin')}
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
                <span className="sr-only">Refresh</span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="md:hidden"
                onClick={() => setIsOpen(false)}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Close sidebar</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto py-2">
            {isLoading && chats.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Cargando conversaciones...
              </div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No hay conversaciones guardadas
              </div>
            ) : (
              <div className="space-y-1 px-2">
                {chats.map(chat => (
                  <Link
                    key={chat.id}
                    href={`/chat/${chat.id}`}
                    className={cn(
                      'flex items-center px-2 py-2 rounded-md hover:bg-accent group relative',
                      pathname.includes(chat.id) && 'bg-accent'
                    )}
                    onClick={e => {
                      // Evita navegación si ya estás en este chat o si está abierto el diálogo de eliminación
                      if (pathname.includes(chat.id) || deleteDialogOpen) {
                        return
                      }

                      // Se fuerza navegación completa para evitar problemas de estado
                      e.preventDefault()
                      window.location.href = `/chat/${chat.id}`
                    }}
                  >
                    <IconMessage className="mr-2 h-4 w-4" />
                    <div className="flex-1 truncate">
                      <div className="truncate">{chat.title}</div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(chat.createdAt), {
                            locale: es,
                            addSuffix: true
                          })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={e => handleDeleteClick(chat, e)}
                    >
                      <IconTrash className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Eliminar cuadro diaglo de confirmacion */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar la conversación{' '}
              <strong>{chatToDelete?.title}</strong>? Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => chatToDelete && deleteChat(chatToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
