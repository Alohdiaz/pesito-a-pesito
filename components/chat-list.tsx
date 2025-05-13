'use client'

import React from 'react'
import { SpinnerMessage } from './stocks/message'

interface ChatListProps {
  messages: any[]
  isShared?: boolean
  session?: any
}

export function ChatList({ messages, isShared, session }: ChatListProps) {
  if (!messages || !messages.length) {
    return null
  }

  return (
    <div className="relative mx-auto max-w-2xl px-4">
      {messages.map((message, index) => {
        // Omitir mensajes inválidos
        if (!message || !message.id) {
          return null
        }

        // Manejar diferentes formatos de mensajes de manera segura
        if (message.display && React.isValidElement(message.display)) {
          // Caso normal: elemento React válido
          return (
            <div key={message.id} className="my-4 md:my-6">
              {message.display}
            </div>
          )
        }

        // Para mensajes sin display pero con id, mostrar un spinner de carga
        return (
          <div key={message.id} className="my-4 md:my-6">
            <SpinnerMessage />
          </div>
        )
      })}
    </div>
  )
}