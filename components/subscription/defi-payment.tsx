'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useUserStore } from '@/lib/store/user-store'
import { useRouter } from 'next/navigation'

export function DefiPayment() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [txHash, setTxHash] = useState<string>('')
  const { fetchUser, fetchSubscription } = useUserStore()
  const router = useRouter()

  const handleDemoPayment = async () => {
    setIsProcessing(true)

    try {
      // Simula una carga
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Genera un hash de transacción simulado
      const mockTxHash =
        '0x' +
        Array.from(
          { length: 64 },
          () => '0123456789abcdef'[Math.floor(Math.random() * 16)]
        ).join('')

      setTxHash(mockTxHash)

      // Actualiza el backend con el estado de la suscripción
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: 'premium',
          txHash: mockTxHash,
          walletAddress: 'demo_wallet_address'
        })
      })

      if (!response.ok) {
        throw new Error('No se pudo actualizar la suscripción en el servidor')
      }

      const data = await response.json()

      if (data.success) {
        toast.success('¡Suscripción activada correctamente!')
        await fetchUser()
        await fetchSubscription()
        router.push('/')
      } else {
        throw new Error(data.error || 'Error al procesar la suscripción')
      }
    } catch (error: any) {
      console.error('Error en la suscripción:', error)
      toast.error(error.message || 'Ocurrió un error al procesar el pago')
    } finally {
      setIsProcessing(false)
    }
  }

  if (txHash) {
    return (
      <div className="mt-4">
        <p className="text-green-600">¡Transacción exitosa!</p>
        <p>Tu suscripción ha sido activada correctamente.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="text-muted-foreground text-sm mb-4 p-3 border rounded">
        <p>
          Modo de demostración: Simula un pago sin conectar una wallet real
        </p>
      </div>

      <Button
        onClick={handleDemoPayment}
        disabled={isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Procesando...' : 'Suscribirse (Simulado)'}
      </Button>
    </div>
  )
}