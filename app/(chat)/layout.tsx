'use client'

import React, { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { ChatSidebar } from '@/components/chat-sidebar'

import { useUser } from '@clerk/nextjs'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { isSignedIn } = useUser()

  // Inicializa el estado de la barra lateral según el ancho de la ventana
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }, [])

  // Controla la visibilidad de la barra lateral al redimensionar la ventana
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true)
      } else {
        setIsSidebarOpen(false)
      }
    }

    // / Aplica el estado inicial basado en el tamaño de la ventana
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="flex flex-1 mt-16">
        {isSignedIn && (
          <ChatSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        )}

        {/*  Capa oscura al abrir la barra lateral en móviles */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
