// Codigo para crear componentes de interfaz de usuario para diferentes tipos de mensajes
import React from 'react'
import { Message } from '@/lib/types'
import {
  BotCard,
  BotMessage,
  SpinnerMessage,
  UserMessage
} from '@/components/stocks/message'
import { StockChart } from '@/components/tradingview/stock-chart'
import { StockPrice } from '@/components/tradingview/stock-price'
import { StockFinancials } from '@/components/tradingview/stock-financials'
import { StockNews } from '@/components/tradingview/stock-news'
import { StockScreener } from '@/components/tradingview/stock-screener'
import { MarketOverview } from '@/components/tradingview/market-overview'
import { MarketHeatmap } from '@/components/tradingview/market-heatmap'
import { MarketTrending } from '@/components/tradingview/market-trending'
import { ETFHeatmap } from '@/components/tradingview/etf-heatmap'

/**
 * Función auxiliar para extraer texto de forma segura desde contenido complejo de mensajes
 */
export function getSafeContent(input: any): string {
  // Manejar contenido tipo string directamente
  if (typeof input === 'string') {
    return input
  }

  // Manejar valores null o undefined
  if (input === null || input === undefined) {
    return ''
  }

  // Manejar objetos con contenido transmitido (streamable)
  if (input && typeof input === 'object' && 'value' in input) {
    return getSafeContent(input.value)
  }

  // Manejar arreglos con elementos tipo objeto (como llamadas a herramientas)
  if (Array.isArray(input) && input.length > 0) {
    if (typeof input[0] === 'object' && input[0] !== null) {
      // Intentar extraer información de herramienta
      const item = input[0]
      if (item.toolName || item.type === 'tool-call') {
        return 'Procesando solicitud...'
      }
      // Unir arreglo de strings
      return input.filter(item => typeof item === 'string').join(' ')
    }
  }

  // Para objetos, intentar obtener una cadena de texto significativa
  if (typeof input === 'object') {
    // Si tiene un método toString que no es el predeterminado
    if (input.toString && input.toString() !== '[object Object]') {
      return input.toString()
    }

    // Verificar propiedades comunes de texto
    if (input.text) return input.text
    if (input.content && typeof input.content === 'string') return input.content

    // Retornar un marcador para objetos complejos
    return 'Procesando respuesta...'
  }

  // Convertir otros primitivos a string
  return String(input)
}

/**
 * Crea los componentes de interfaz de usuario apropiados para diferentes tipos de mensajes
 * Esto es usado por componentes del servidor, así que no puede usar hooks de React
 */
export function createMessageDisplay(message: Message): React.ReactNode {
  // Manejar mensajes del usuario
  if (message.role === 'user') {
    // Convertir contenido a string si es necesario
    const content =
      typeof message.content === 'string'
        ? message.content
        : getSafeContent(message.content)

    return <UserMessage>{content}</UserMessage>
  }

  // Manejar mensajes del asistente con llamadas a herramientas
  if (message.role === 'assistant' && Array.isArray(message.content)) {
    const toolCall = message.content[0]
    if (toolCall && toolCall.type === 'tool-call') {
      // Procesar llamadas a herramientas como componentes apropiados
      const { toolName, args } = toolCall as any

      switch (toolName) {
        case 'showStockChart':
          return (
            <BotCard>
              <StockChart
                symbol={args?.symbol || ''}
                comparisonSymbols={args?.comparisonSymbols || []}
              />
            </BotCard>
          )
        case 'showStockPrice':
          return (
            <BotCard>
              <StockPrice props={args?.symbol || ''} />
            </BotCard>
          )
        case 'showStockFinancials':
          return (
            <BotCard>
              <StockFinancials props={args?.symbol || ''} />
            </BotCard>
          )
        case 'showStockNews':
          return (
            <BotCard>
              <StockNews props={args?.symbol || ''} />
            </BotCard>
          )
        case 'showStockScreener':
          return (
            <BotCard>
              <StockScreener />
            </BotCard>
          )
        case 'showMarketOverview':
          return (
            <BotCard>
              <MarketOverview />
            </BotCard>
          )
        case 'showMarketHeatmap':
          return (
            <BotCard>
              <MarketHeatmap />
            </BotCard>
          )
        case 'showTrendingStocks':
          return (
            <BotCard>
              <MarketTrending />
            </BotCard>
          )
        case 'showETFHeatmap':
          return (
            <BotCard>
              <ETFHeatmap />
            </BotCard>
          )
        default:
          // Componente de reserva (fallback)
          return <SpinnerMessage />
      }
    }
  }

  // Manejar mensajes simples de texto del asistente
  if (message.role === 'assistant') {
    // Convertir contenido a texto seguro
    const safeContent =
      typeof message.content === 'string'
        ? message.content
        : getSafeContent(message.content)

    return <BotMessage content={safeContent} />
  }

  // Los mensajes de herramientas normalmente no se muestran directamente
  if (message.role === 'tool') {
    return null
  }

  // Componente de reserva (fallback)
  return <SpinnerMessage />
}

/**
 * Genera un título descriptivo a partir del contenido del mensaje
 */
export function generateChatTitle(message: Message): string {
  if (!message) return 'Nueva conversación'

  if (message.role !== 'user') return 'Nueva conversación'

  const content =
    typeof message.content === 'string'
      ? message.content
      : getSafeContent(message.content)

  if (!content) return 'Nueva conversación'

  return content.length > 50 ? `${content.substring(0, 50)}...` : content
}
