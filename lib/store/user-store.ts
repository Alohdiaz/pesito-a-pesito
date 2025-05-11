'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserType = {
  id: string
  email: string
  subscriptionStatus: 'free' | 'premium'
  messageCount: number
}

// Definición del estado de la tienda del usuario
type UserState = {
  user: UserType | null
  subscription: any | null
  setUser: (user: UserType | null) => void
  setSubscription: (subscription: any | null) => void
  fetchUser: () => Promise<void> // Obtiene los datos del usuario desde la API
  fetchSubscription: () => Promise<void> // Obtiene el estado de suscripción del usuario
  incrementMessageCount: () => Promise<number> // Incrementa el contador de mensajes del usuario
  resetMessageCount: () => Promise<void> // Reinicia el contador de mensajes del usuario
  resetStore: () => void // Reinicia completamente la tienda
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      subscription: null,

      // Setter para establecer el usuario
      setUser: user => set({ user }),
       // Setter para establecer la suscripción
      setSubscription: subscription => set({ subscription }),

      // Función para obtener el usuario desde la API
      fetchUser: async () => {
        try {
          const response = await fetch('/api/user')
          if (response.ok) {
            const data = await response.json()
            set({ user: data.user })
          }
        } catch (error) {
          console.error('Error fetching user:', error)
        }
      },

      // Obtener el estado de suscripción del usuario
      fetchSubscription: async () => {
        try {
          const response = await fetch('/api/subscription')
          if (response.ok) {
            const data = await response.json()
            set({ subscription: data.subscription })

            // Si el estado de la suscripción es "activa", actualizar el estado del usuario a "premium"
            if (data.subscription?.status === 'active') {
              set(state => ({
                user: state.user
                  ? { ...state.user, subscriptionStatus: 'premium' }
                  : null
              }))
            }
          }
        } catch (error) {
          console.error('Error fetching subscription:', error)
        }
      },

      // Incrementar el contador de mensajes del usuario en el backend
      incrementMessageCount: async () => {
        try {
          const response = await fetch('/api/user/increment-message-count', {
            method: 'POST'
          })

          if (response.ok) {
            const data = await response.json()
            set(state => ({
              user: state.user
                ? { ...state.user, messageCount: data.messageCount }
                : null
            }))
            return data.messageCount
          }
          // Si falla, devolver el valor actual
          return get().user?.messageCount || 0
        } catch (error) {
          console.error('Error incrementing message count:', error)
          return get().user?.messageCount || 0
        }
      },

      // Reiniciar el contador de mensajes a 0
      resetMessageCount: async () => {
        try {
          const response = await fetch('/api/user/reset-message-count', {
            method: 'POST'
          })

          if (response.ok) {
            set(state => ({
              user: state.user ? { ...state.user, messageCount: 0 } : null
            }))
          }
        } catch (error) {
          console.error('Error resetting message count:', error)
        }
      },

      // Restablecer completamente el estado de la tienda
      resetStore: () => {
        // Restablecer los estados locales
        set({ user: null, subscription: null })

        // También eliminar los datos persistidos en localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user-storage')
        }
      }
    }),
    {
      name: 'user-storage', // Nombre de la clave en localStorage
      partialize: state => ({
        user: state.user,
        subscription: state.subscription
      })
    }
  )
)
