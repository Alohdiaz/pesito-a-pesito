// Based on: https://github.com/mckaywrigley/chatbot-ui/blob/main/components/chat/message.tsx
// Modified for academic use in a university project (e.g. markdown and spinner adaptations)
// Copyright (c) 2024 Mckay Wrigley
// Licensed under the MIT License

'use client'

import { IconChat } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { spinner } from './spinner'
import { MemoizedReactMarkdown } from '../markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { StreamableValue } from 'ai/rsc'
import { useStreamableText } from '@/lib/hooks/use-streamable-text'
import React from 'react'
import { useUser } from '@clerk/nextjs'
import Image from 'next/image'

// Diferentes tipos de burbujas de mensajes

export function UserMessage({ children }: { children: React.ReactNode }) {
  // Obtiene la información del usuario actual
  const { user } = useUser()

  return (
    <div className="group relative flex items-start md:-ml-12">
      {/* Muestra el avatar del usuario */}
      <div className="flex size-[25px] shrink-0 select-none items-center justify-center rounded-md border bg-background shadow-sm">
        <Image
          alt="usuario"
          src={user?.imageUrl || ''}
          width={65}
          height={65}
          className="object-contain rounded-md"
        />
      </div>
      {/* Contenedor del mensaje del usuario */}
      <div className="ml-4 flex-1 space-y-2 overflow-hidden pl-2">
        {children}
      </div>
    </div>
  )
}

export function BotMessage({
  content,
  className
}: {
  content: string | StreamableValue<string>
  className?: string
}) {
  const text = useStreamableText(content)

  return (
    <div className={cn('group relative flex items-start md:-ml-12', className)}>
      {/* Icono del bot */}
      <div className="flex size-[24px] shrink-0 select-none items-center justify-center rounded-md border bg-[#f55036] text-primary-foreground shadow-sm">
        <IconChat />
      </div>
      {/* Contenedor del mensaje del bot */}
      <div className="ml-4 flex-1 space-y-2 overflow-hidden px-1">
        <MemoizedReactMarkdown
          className="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0"
          remarkPlugins={[remarkGfm, remarkMath]}
          components={{
            p({ children }) {
              return <p className="mb-2 last:mb-0">{children}</p>
            },
            code({ node, inline, className, children, ...props }) {
              if (children.length && children[0] === '▍') {
                return (
                  <span className="mt-1 animate-pulse cursor-default">▍</span>
                )
              }

              if (children[0]) {
                children[0] = (children[0] as string).replace('`▍`', '▍')
              }

              const match = /language-(\w+)/.exec(className || '')

              if (inline) {
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              }

              return (
                <pre className="bg-gray-100 text-sm p-2 rounded overflow-x-auto">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              )
            }
          }}
        >
          {text || 'Procesando respuesta...'}
        </MemoizedReactMarkdown>
      </div>
    </div>
  )
}

export function BotCard({
  children,
  showAvatar = true
}: {
  children: React.ReactNode
  showAvatar?: boolean
}) {
  return (
    <div className="group relative flex items-start md:-ml-12">
      {/* Avatar del bot (condicional) */}
      <div
        className={cn(
          'flex size-[24px] shrink-0 select-none items-center justify-center rounded-md border bg-[#f55036] text-primary-foreground shadow-sm',
          !showAvatar && 'invisible'
        )}
      >
        <IconChat />
      </div>
      {/* Contenedor del contenido */}
      <div className="ml-4 flex-1 pl-2">{children}</div>
    </div>
  )
}

export function SystemMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-500">
      <div className="max-w-[600px] flex-initial p-2">{children}</div>
    </div>
  )
}

export function SpinnerMessage() {
  return (
    <div className="group relative flex items-start md:-ml-12">
      {/* Icono del bot */}
      <div className="flex size-[24px] shrink-0 select-none items-center justify-center rounded-md border bg-[#f55036] text-primary-foreground shadow-sm">
        <IconChat />
      </div>
      {/* Animación de carga */}
      <div className="ml-4 h-[24px] flex flex-row items-center flex-1 space-y-2 overflow-hidden px-1">
        {spinner}
      </div>
    </div>
  )
}
