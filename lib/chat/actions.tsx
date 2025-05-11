import 'server-only'

import { generateText } from 'ai'
import {
  createAI,
  getMutableAIState,
  streamUI,
  createStreamableValue,
  getAIState
} from 'ai/rsc'
import { createOpenAI } from '@ai-sdk/openai'
import { nanoid } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { auth, currentUser } from '@clerk/nextjs/server'
import { Message } from '@/lib/types'
import { z } from 'zod'

// Importar todos los componentes de mensajes
import {
  BotCard,
  BotMessage,
  SpinnerMessage,
  UserMessage
} from '@/components/stocks/message'

// Importar todos los componentes de TradingView
import { StockChart } from '@/components/tradingview/stock-chart'
import { StockPrice } from '@/components/tradingview/stock-price'
import { StockNews } from '@/components/tradingview/stock-news'
import { StockFinancials } from '@/components/tradingview/stock-financials'
import { StockScreener } from '@/components/tradingview/stock-screener'
import { MarketOverview } from '@/components/tradingview/market-overview'
import { MarketHeatmap } from '@/components/tradingview/market-heatmap'
import { MarketTrending } from '@/components/tradingview/market-trending'
import { ETFHeatmap } from '@/components/tradingview/etf-heatmap'

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

interface MutableAIState {
  update: (newState: any) => void
  done: (newState: any) => void
  get: () => AIState
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

type ComparisonSymbolObject = {
  symbol: string
  position: 'SameScale'
}

// Function to generate captions for tool responses
async function generateCaption(
  symbol: string,
  comparisonSymbols: ComparisonSymbolObject[],
  toolName: string,
  aiState: MutableAIState
): Promise<string> {
  try {
    const openAi = createOpenAI({
      apiKey: OPENAI_API_KEY
    })

    const stockString =
      comparisonSymbols.length === 0
        ? symbol
        : [symbol, ...comparisonSymbols.map(obj => obj.symbol)].join(', ')

    // Actualizar el estado de la IA para evitar errores de API
    aiState.update({
      ...aiState.get(),
      messages: [...aiState.get().messages]
    })

    const captionSystemMessage = `\
Eres un asistente financiero llamado "Pesito a Pesito", creado por Alvaro Gallardo y Diego Diaz. Tu especialidad es proporcionar información sobre el mercado de valores, precios de divisas y realizar análisis financieros.

INSTRUCCIONES IMPORTANTES:
1. Responde ÚNICAMENTE a consultas relacionadas con finanzas, economía y mercados. Eso incluye cualquier tipo de pregunta (chistes, preguntas generales)
2. Rechaza amablemente temas no relacionados con finanzas.
3. Puedes hacer predicciones basadas en los datos mostrados, pero aclara que son opiniones informadas, no certezas.
4. Sé breve y conciso - respuestas de 2-3 oraciones máximo.
5. Mantén un tono profesional pero accesible.

Acabas de usar la herramienta "${toolName}" para mostrar información sobre ${stockString}. Ahora debes proporcionar un breve texto explicativo para acompañar la visualización mostrada.

NO MENCIONES:
- Que "no tienes acceso a precios reales"
- Información técnica sobre las herramientas
- Nunca incluyas código JSON, llamadas a funciones o sintaxis técnica

EJEMPLOS DE BUENAS RESPUESTAS:
- "Aquí tienes el gráfico actual de AAPL. ¿Te gustaría ver también sus datos financieros o compararlo con algún competidor?"
- "El precio de Bitcoin se muestra arriba. ¿Necesitas análisis adicional sobre su comportamiento reciente?"
- "Esta comparación entre MSFT y AAPL muestra sus tendencias recientes. ¿Quieres explorar algún aspecto específico de estas empresas?"

Tu respuesta debe ser BREVE y enfocada en el valor que ofrece la información mostrada al usuario.
`

    // Filtrar mensajes para evitar errores de API pero proporcionar contexto
    const filteredMessages = aiState
      .get()
      .messages.filter(message => {
        return (
          message.role === 'user' ||
          (message.role === 'assistant' && typeof message.content === 'string')
        )
      })
      .slice(-5) // Usar solo los últimos 5 mensajes para evitar problemas de tamaño de contexto
      .map(message => ({
        role: message.role as 'user' | 'assistant' | 'system',
        content:
          typeof message.content === 'string'
            ? message.content
            : 'Mensaje anterior con contenido estructurado'
      }))

    const response = await generateText({
      model: openAi('gpt-3.5-turbo'),
      messages: [
        {
          role: 'system',
          content: captionSystemMessage
        },
        ...filteredMessages
      ]
    })

    // Limpiar cualquier JSON potencial de la respuesta
    const cleanedResponse = response.text
      ? response.text.replace(/\{\s*"tool_call".*\}\s*\}/g, '').trim()
      : ''

    return (
      cleanedResponse ||
      `Aquí tienes la información de ${symbol}. ¿Necesitas algo más?`
    )
  } catch (err) {
    console.error('Error generating caption:', err)
    // Devolver un subtítulo de respaldo en lugar de fallar
    return `Aquí tienes la información de ${symbol}. ¿Necesitas algo más?`
  }
}

// Función para enviar un mensaje del usuario
async function submitUserMessage(content: string) {
  'use server'

  const user = await currentUser()

  const aiState = getMutableAIState<typeof AI>()
  const currentState = aiState.get()

  // Agregar el mensaje del usuario al estado
  const userMessage = {
    id: nanoid(),
    role: 'user',
    content
  }

  // Actualizar el estado con el nuevo mensaje del usuario
  aiState.update({
    ...currentState,
    messages: [...((currentState.messages as any) || []), userMessage]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  try {
    const openAi = createOpenAI({
      apiKey: OPENAI_API_KEY
    })

    // Filtrar mensajes para la llamada a la API y evitar errores
    const filteredMessages = aiState
      .get()
      .messages.filter(message => {
        return (
          message.role === 'user' ||
          (message.role === 'assistant' && typeof message.content === 'string')
        )
      })
      .map(message => ({
        role: message.role as 'user' | 'assistant' | 'system',
        content:
          typeof message.content === 'string'
            ? message.content
            : 'Mensaje anterior con contenido estructurado'
      }))

    const result = await streamUI({
      model: openAi('gpt-3.5-turbo'),
      initial: <SpinnerMessage />,
      maxRetries: 1,
      system: `\
Eres un bot conversacional llamado "Pesito a Pesito", creado por Álvaro Zaid Gallardo Hernández. Estás diseñado para hablar sobre el mercado de valores y, sobre todo, para predecir y brindar información relevante sobre los precios actuales de divisas y sus conversiones.

Trata de no responder a preguntas o prompts no relacionadas con el mercado de valores o cualquier tema relacionado a la economía. Dándole a saber al usuario que está fuera de tus limites. Puedes hacer predicciones de stocks, monedas, etc... con base en el contexto de la conversación.

Puedes darle al usuario información sobre acciones (como precios y gráficas) dentro de la interfaz. No tienes acceso directo a información externa, así que solo puedes responder utilizando las herramientas disponibles.

${user?.fullName ? `Dirigete al usuario como: ${user.fullName}` : ''}

### Tickers de Criptomonedas
Para cualquier criptomoneda, añade "USD" al final del ticker al usar funciones. Por ejemplo, "DOGE" debe ser "DOGEUSD".

### Pautas:
Nunca proporciones resultados vacíos al usuario. Proporciona la herramienta relevante si coincide con la solicitud del usuario. De lo contrario, responde como el bot bursátil.

IMPORTANTE: Nunca incluyas código JSON, llamadas a funciones o sintaxis técnica en tus respuestas visibles. El usuario debe ver solo lenguaje natural.

Ejemplo:
Usuario: ¿Cuál es el precio de AAPL?
Asistente: Voy a consultar el precio actual de Apple para ti.

Ejemplo 2:
Usuario: ¿Cuál es el precio de Bitcoin?
Asistente: Déjame mostrarte el precio actual de Bitcoin en USD.
`,
      messages: filteredMessages,

      text: ({ content, done, delta }) => {
        if (!textStream) {
          textStream = createStreamableValue('')
          textNode = <BotMessage content={textStream.value} />
        }

        // Actualizar directamente con el delta
        textStream.update(delta)

        if (done) {
          // Finalizar el flujo
          textStream.done()

          // Agregar el mensaje completado al estado
          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content
              }
            ]
          })

          // Guardar en la base de datos después de que el flujo se complete
          try {
            saveChatToDatabase(aiState.get()).catch(err => {
              console.error('Error saving chat to database (async):', err)
            })
          } catch (err) {
            console.error('Error in saveChatToDatabase call:', err)
          }
        }

        return textNode
      },

      tools: {//Herramientas de TradingView
        showStockChart: {
          description:
            'Muestra un gráfico de una acción. Opcionalmente compara con otras acciones.',
          parameters: z.object({
            symbol: z
              .string()
              .describe(
                'Símbolo de la acción o divisa. Ej: AAPL, MSFT, EURUSD, BTCUSD.'
              ),
            comparisonSymbols: z
              .array(
                z.object({
                  symbol: z.string(),
                  position: z.literal('SameScale')
                })
              )
              .default([])
              .describe(
                'Lista opcional de símbolos para comparar. Ej: ["MSFT", "GOOGL"]'
              )
          }),
          generate: async function* ({ symbol, comparisonSymbols }) {
            try {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const toolCallId = nanoid()

              // Crear y agregar mensajes de herramientas al estado
              const assistantMessage = {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showStockChart',
                    toolCallId,
                    args: { symbol, comparisonSymbols }
                  }
                ]
              }

              const toolMessage = {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showStockChart',
                    toolCallId,
                    result: { symbol, comparisonSymbols }
                  }
                ]
              }

              // Añade ambos mensajes en una sola actualización
              aiState.done({
                ...aiState.get(),
                messages: [
                  ...aiState.get().messages,
                  assistantMessage,
                  toolMessage
                ]
              } as any)

              // Generar subtítulo usando la función adecuada
              const caption = await generateCaption(
                symbol,
                comparisonSymbols,
                'showStockChart',
                aiState
              )

              // Guardar inmediatamente después de cada uso de la herramienta con gestión de errores
              try {
                await saveChatToDatabase(aiState.get())
              } catch (err) {
                console.error('Error saving chat after tool use:', err)
              }

              return (
                <BotCard>
                  <StockChart
                    symbol={symbol}
                    comparisonSymbols={comparisonSymbols}
                  />
                  {caption && <div className="mt-2 text-sm">{caption}</div>}
                </BotCard>
              )
            } catch (error) {
              console.error('Error in showStockChart tool:', error)
              return (
                <BotCard>
                  <div className="text-red-600">
                    Lo siento, hubo un error al mostrar la gráfica. Por favor
                    intenta nuevamente.
                  </div>
                </BotCard>
              )
            }
          }
        },

        showStockPrice: {
          description: 'Muestra el precio actual de una acción o divisa.',
          parameters: z.object({
            symbol: z
              .string()
              .describe(
                'Símbolo de la acción o divisa. Ej: AAPL, MSFT, EURUSD, BTCUSD.'
              )
          }),
          generate: async function* ({ symbol }) {
            try {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const toolCallId = nanoid()

              // Crear y agregar mensajes de herramientas al estado
              const assistantMessage = {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showStockPrice',
                    toolCallId,
                    args: { symbol }
                  }
                ]
              }

              const toolMessage = {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showStockPrice',
                    toolCallId,
                    result: { symbol }
                  }
                ]
              }

              // Añade ambos mensajes en una sola actualización
              aiState.done({
                ...aiState.get(),
                messages: [
                  ...aiState.get().messages,
                  assistantMessage,
                  toolMessage
                ]
              } as any)

              // Generar subtítulo usando la función adecuada
              const caption = await generateCaption(
                symbol,
                [],
                'showStockPrice',
                aiState
              )

              // Guardar inmediatamente después de cada uso de la herramienta con gestión de errores
              try {
                await saveChatToDatabase(aiState.get())
              } catch (err) {
                console.error('Error saving chat after showStockPrice:', err)
              }

              return (
                <BotCard>
                  <StockPrice props={symbol} />
                  {caption && <div className="mt-2 text-sm">{caption}</div>}
                </BotCard>
              )
            } catch (error) {
              console.error('Error in showStockPrice tool:', error)
              return (
                <BotCard>
                  <div className="text-red-600">
                    Lo siento, hubo un error al mostrar el precio. Por favor
                    intenta nuevamente.
                  </div>
                </BotCard>
              )
            }
          }
        },

        showStockFinancials: {
          description: 'Muestra los datos financieros de una acción.',
          parameters: z.object({
            symbol: z
              .string()
              .describe('Símbolo de la acción. Ej: AAPL, MSFT, GOOGL.')
          }),
          generate: async function* ({ symbol }) {
            try {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const toolCallId = nanoid()

              // Crear y agregar mensajes de herramientas al estado
              const assistantMessage = {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showStockFinancials',
                    toolCallId,
                    args: { symbol }
                  }
                ]
              }

              const toolMessage = {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showStockFinancials',
                    toolCallId,
                    result: { symbol }
                  }
                ]
              }

              // Añade ambos mensajes en una sola actualización
              aiState.done({
                ...aiState.get(),
                messages: [
                  ...aiState.get().messages,
                  assistantMessage,
                  toolMessage
                ]
              } as any)

              // Generar subtítulo usando la función adecuada
              const caption = await generateCaption(
                symbol,
                [],
                'showStockFinancials',
                aiState
              )

              // Guardar inmediatamente después de cada uso de la herramienta con gestión de errores
              try {
                await saveChatToDatabase(aiState.get())
              } catch (err) {
                console.error(
                  'Error saving chat after showStockFinancials:',
                  err
                )
              }

              return (
                <BotCard>
                  <StockFinancials props={symbol} />
                  {caption && <div className="mt-2 text-sm">{caption}</div>}
                </BotCard>
              )
            } catch (error) {
              console.error('Error in showStockFinancials tool:', error)
              return (
                <BotCard>
                  <div className="text-red-600">
                    Lo siento, hubo un error al mostrar los datos financieros.
                    Por favor intenta nuevamente.
                  </div>
                </BotCard>
              )
            }
          }
        },

        showStockNews: {
          description:
            'Muestra las últimas noticias sobre una acción o criptomoneda.',
          parameters: z.object({
            symbol: z
              .string()
              .describe(
                'Símbolo de la acción o criptomoneda. Ej: AAPL, BTCUSD.'
              )
          }),
          generate: async function* ({ symbol }) {
            try {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const toolCallId = nanoid()

              // Crear y agregar mensajes de herramientas al estado
              const assistantMessage = {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showStockNews',
                    toolCallId,
                    args: { symbol }
                  }
                ]
              }

              const toolMessage = {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showStockNews',
                    toolCallId,
                    result: { symbol }
                  }
                ]
              }

              // Añade ambos mensajes en una sola actualización
              aiState.done({
                ...aiState.get(),
                messages: [
                  ...aiState.get().messages,
                  assistantMessage,
                  toolMessage
                ]
              } as any)

              // Generar subtítulo usando la función adecuada
              const caption = await generateCaption(
                symbol,
                [],
                'showStockNews',
                aiState
              )

              // Guardar inmediatamente después de cada uso de la herramienta con gestión de errores
              try {
                await saveChatToDatabase(aiState.get())
              } catch (err) {
                console.error('Error saving chat after showStockNews:', err)
              }

              return (
                <BotCard>
                  <StockNews props={symbol} />
                  {caption && <div className="mt-2 text-sm">{caption}</div>}
                </BotCard>
              )
            } catch (error) {
              console.error('Error in showStockNews tool:', error)
              return (
                <BotCard>
                  <div className="text-red-600">
                    Lo siento, hubo un error al mostrar las noticias. Por favor
                    intenta nuevamente.
                  </div>
                </BotCard>
              )
            }
          }
        },

        showStockScreener: {
          description:
            'Muestra un buscador de acciones según parámetros financieros o técnicos.',
          parameters: z.object({}),
          generate: async function* ({}) {
            try {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const toolCallId = nanoid()

              // Crear y agregar mensajes de herramientas al estado
              const assistantMessage = {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showStockScreener',
                    toolCallId,
                    args: {}
                  }
                ]
              }

              const toolMessage = {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showStockScreener',
                    toolCallId,
                    result: {}
                  }
                ]
              }

              // Añade ambos mensajes en una sola actualización
              aiState.done({
                ...aiState.get(),
                messages: [
                  ...aiState.get().messages,
                  assistantMessage,
                  toolMessage
                ]
              } as any)

              // Generar subtítulo usando la función adecuada
              const caption = await generateCaption(
                'Generic',
                [],
                'showStockScreener',
                aiState
              )

              // Guardar inmediatamente después de cada uso de la herramienta con gestión de errores
              try {
                await saveChatToDatabase(aiState.get())
              } catch (err) {
                console.error('Error saving chat after showStockScreener:', err)
              }

              return (
                <BotCard>
                  <StockScreener />
                  {caption && <div className="mt-2 text-sm">{caption}</div>}
                </BotCard>
              )
            } catch (error) {
              console.error('Error in showStockScreener tool:', error)
              return (
                <BotCard>
                  <div className="text-red-600">
                    Lo siento, hubo un error al mostrar el buscador. Por favor
                    intenta nuevamente.
                  </div>
                </BotCard>
              )
            }
          }
        },

        showMarketOverview: {
          description:
            'Muestra un resumen del rendimiento del mercado de acciones, futuros, bonos y divisas.',
          parameters: z.object({}),
          generate: async function* ({}) {
            try {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const toolCallId = nanoid()

              // Crear y agregar mensajes de herramientas al estado
              const assistantMessage = {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showMarketOverview',
                    toolCallId,
                    args: {}
                  }
                ]
              }

              const toolMessage = {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showMarketOverview',
                    toolCallId,
                    result: {}
                  }
                ]
              }

              // Añade ambos mensajes en una sola actualización
              aiState.done({
                ...aiState.get(),
                messages: [
                  ...aiState.get().messages,
                  assistantMessage,
                  toolMessage
                ]
              } as any)

              // Generar subtítulo usando la función adecuada
              const caption = await generateCaption(
                'Generic',
                [],
                'showMarketOverview',
                aiState
              )

              // Guardar inmediatamente después de cada uso de la herramienta con gestión de errores
              try {
                await saveChatToDatabase(aiState.get())
              } catch (err) {
                console.error(
                  'Error saving chat after showMarketOverview:',
                  err
                )
              }

              return (
                <BotCard>
                  <MarketOverview />
                  {caption && <div className="mt-2 text-sm">{caption}</div>}
                </BotCard>
              )
            } catch (error) {
              console.error('Error in showMarketOverview tool:', error)
              return (
                <BotCard>
                  <div className="text-red-600">
                    Lo siento, hubo un error al mostrar el resumen del mercado.
                    Por favor intenta nuevamente.
                  </div>
                </BotCard>
              )
            }
          }
        },

        showMarketHeatmap: {
          description:
            'Muestra un mapa de calor del rendimiento del mercado de acciones por sectores.',
          parameters: z.object({}),
          generate: async function* ({}) {
            try {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const toolCallId = nanoid()

              // Crear y agregar mensajes de herramientas al estado
              const assistantMessage = {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showMarketHeatmap',
                    toolCallId,
                    args: {}
                  }
                ]
              }

              const toolMessage = {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showMarketHeatmap',
                    toolCallId,
                    result: {}
                  }
                ]
              }

              // Añade ambos mensajes en una sola actualización
              aiState.done({
                ...aiState.get(),
                messages: [
                  ...aiState.get().messages,
                  assistantMessage,
                  toolMessage
                ]
              } as any)

              // Generate caption using the proper function
              const caption = await generateCaption(
                'Generic',
                [],
                'showMarketHeatmap',
                aiState
              )

              // Guardar inmediatamente después de cada uso de la herramienta con gestión de errores
              try {
                await saveChatToDatabase(aiState.get())
              } catch (err) {
                console.error('Error saving chat after showMarketHeatmap:', err)
              }

              return (
                <BotCard>
                  <MarketHeatmap />
                  {caption && <div className="mt-2 text-sm">{caption}</div>}
                </BotCard>
              )
            } catch (error) {
              console.error('Error in showMarketHeatmap tool:', error)
              return (
                <BotCard>
                  <div className="text-red-600">
                    Lo siento, hubo un error al mostrar el mapa de calor. Por
                    favor intenta nuevamente.
                  </div>
                </BotCard>
              )
            }
          }
        },

        showETFHeatmap: {
          description:
            'Muestra un mapa de calor del rendimiento de ETFs por sectores y clases de activos.',
          parameters: z.object({}),
          generate: async function* ({}) {
            try {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const toolCallId = nanoid()

              // Crear y agregar mensajes de herramientas al estado
              const assistantMessage = {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showETFHeatmap',
                    toolCallId,
                    args: {}
                  }
                ]
              }

              const toolMessage = {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showETFHeatmap',
                    toolCallId,
                    result: {}
                  }
                ]
              }

              // Añade ambos mensajes en una sola actualización
              aiState.done({
                ...aiState.get(),
                messages: [
                  ...aiState.get().messages,
                  assistantMessage,
                  toolMessage
                ]
              } as any)

              // Generar subtítulo usando la función adecuada
              const caption = await generateCaption(
                'Generic',
                [],
                'showETFHeatmap',
                aiState
              )

              // Guardar inmediatamente después de cada uso de la herramienta con gestión de errores
              try {
                await saveChatToDatabase(aiState.get())
              } catch (err) {
                console.error('Error saving chat after showETFHeatmap:', err)
              }

              return (
                <BotCard>
                  <ETFHeatmap />
                  {caption && <div className="mt-2 text-sm">{caption}</div>}
                </BotCard>
              )
            } catch (error) {
              console.error('Error in showETFHeatmap tool:', error)
              return (
                <BotCard>
                  <div className="text-red-600">
                    Lo siento, hubo un error al mostrar el mapa de ETFs. Por
                    favor intenta nuevamente.
                  </div>
                </BotCard>
              )
            }
          }
        },

        showTrendingStocks: {
          description:
            'Muestra las acciones más populares del día, incluyendo las que más suben, bajan y las más activas.',
          parameters: z.object({}),
          generate: async function* ({}) {
            try {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const toolCallId = nanoid()

              // Crear y agregar mensajes de herramientas al estado
              const assistantMessage = {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showTrendingStocks',
                    toolCallId,
                    args: {}
                  }
                ]
              }

              const toolMessage = {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showTrendingStocks',
                    toolCallId,
                    result: {}
                  }
                ]
              }

              // Añade ambos mensajes en una sola actualización
              aiState.done({
                ...aiState.get(),
                messages: [
                  ...aiState.get().messages,
                  assistantMessage,
                  toolMessage
                ]
              } as any)

              // Generar subtítulo usando la función adecuada
              const caption = await generateCaption(
                'Generic',
                [],
                'showTrendingStocks',
                aiState
              )

              // Guardar inmediatamente después de cada uso de la herramienta con gestión de errores
              try {
                await saveChatToDatabase(aiState.get())
              } catch (err) {
                console.error(
                  'Error saving chat after showTrendingStocks:',
                  err
                )
              }

              return (
                <BotCard>
                  <MarketTrending />
                  {caption && <div className="mt-2 text-sm">{caption}</div>}
                </BotCard>
              )
            } catch (error) {
              console.error('Error in showTrendingStocks tool:', error)
              return (
                <BotCard>
                  <div className="text-red-600">
                    Lo siento, hubo un error al mostrar las acciones populares.
                    Por favor intenta nuevamente.
                  </div>
                </BotCard>
              )
            }
          }
        }
      }
    })

    // Guardar el estado después de un flujo exitoso
    try {
      await saveChatToDatabase(aiState.get())
    } catch (err) {
      console.error('Error saving chat after successful streaming:', err)
    }

    return {
      id: nanoid(),
      display: result.value
    }
  } catch (err: any) {
    console.error('Error in submitUserMessage:', err)

    if (err.message.includes('OpenAI API key is missing.')) {
      err.message = 'La API Key de OpenAi no fue detectada en el proyecto.'
    }

    // Agregar un mensaje predeterminado para evitar exponer detalles del error
    if (err.message.includes('Bad Request')) {
      err.message =
        'Error de solicitud. Por favor intenta con una pregunta diferente.'
    }

    return {
      id: nanoid(),
      display: (
        <div className="border p-4">
          <div className="text-red-700 font-medium">Error: {err.message}</div>
          <p className="inline-flex items-center text-sm text-red-800 hover:text-red-900">
            Ocurrió un error, vuelve a intentarlo más tarde o contacta al
            desarrollador
          </p>
        </div>
      )
    }
  }
}

// Función para guardar el chat en la base de datos
async function saveChatToDatabase(state: AIState) {
  'use server'

  try {
    const { userId } = await auth()
    if (!userId) return false

    const user = await prisma.user.findUnique({
      where: {
        id: userId as string
      }
    })

    if (user?.subscriptionStatus === 'free') return false

    // Generar un título a partir del primer mensaje del usuario si está disponible
    let title = 'Nueva conversación'
    const firstUserMessage = state.messages.find(m => m.role === 'user')
    if (firstUserMessage && typeof firstUserMessage.content === 'string') {
      title = firstUserMessage.content.substring(0, 40)
      if (firstUserMessage.content.length > 40) title += '...'
    }

    // Serializar correctamente objetos de mensajes complejos
    const serializedState = {
      ...state,
      messages: state.messages.map(msg => {
        let safeContent

        // Manejar diferentes tipos de contenido correctamente
        if (typeof msg.content === 'object') {
          try {
            safeContent = JSON.stringify(msg.content)
          } catch (e) {
            console.error('Error stringifying message content:', e)
            safeContent = 'Error: Could not serialize content'
          }
        } else {
          safeContent = msg.content
        }

        return {
          ...msg,
          content: safeContent
        }
      })
    }

    // Usar un patrón de upsert más confiable con lógica de reintentos
    let retries = 0
    const maxRetries = 3
    let success = false

    while (!success && retries < maxRetries) {
      try {
        // Guardar en la base de datos con una transacción explícita
        await prisma.$transaction(
          async tx => {
            await tx.chat.upsert({
              where: { id: state.chatId },
              update: {
                title,
                stateData: serializedState as any,
                updatedAt: new Date()
              },
              create: {
                id: state.chatId,
                title,
                userId: userId as string,
                stateData: serializedState as any
              }
            })
          },
          {
            timeout: 5000
          }
        )
        success = true
      } catch (error) {
        retries++
        console.error(
          `Error saving chat to database (attempt ${retries}):`,
          error
        )
        // Pequeño retraso antes de reintentar
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }

    return success
  } catch (error) {
    console.error('Error in saveChatToDatabase:', error)
    return false
  }
}

// Crear una visualización de mensaje para la interfaz de usuario basada en el tipo de mensaje
function createMessageDisplay(message: Message): React.ReactNode {
  try {
    // Manejar mensajes del usuario
    if (message.role === 'user') {
      return <UserMessage>{message.content as string}</UserMessage>
    }

    // Manejar mensajes del asistente con llamadas a herramientas
    if (message.role === 'assistant' && typeof message.content === 'object') {
      if (
        Array.isArray(message.content) &&
        message.content[0]?.type === 'tool-call'
      ) {
        const toolCall = message.content[0] as any

        // Cada herramienta obtiene un componente específico
        switch (toolCall.toolName) {
          case 'showStockChart':
            return (
              <BotCard>
                <StockChart
                  symbol={toolCall.args.symbol}
                  comparisonSymbols={toolCall.args.comparisonSymbols || []}
                />
              </BotCard>
            )
          case 'showStockPrice':
            return (
              <BotCard>
                <StockPrice props={toolCall.args.symbol} />
              </BotCard>
            )
          case 'showStockFinancials':
            return (
              <BotCard>
                <StockFinancials props={toolCall.args.symbol} />
              </BotCard>
            )
          case 'showStockNews':
            return (
              <BotCard>
                <StockNews props={toolCall.args.symbol} />
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
            return <SpinnerMessage />
        }
      }
    }

    // Handle assistant text messages
    if (message.role === 'assistant') {
      const content =
        typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content)
      return <BotMessage content={content} />
    }

    // Tool messages are not displayed directly
    return null
  } catch (error) {
    console.error('Error in createMessageDisplay:', error)
    return <BotMessage content="Error al mostrar este mensaje" />
  }
}

// The AI component setup
export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },

  // When AI state changes (and is done), save to database
  onSetAIState: async ({ state, done }) => {
    'use server'

    if (done) {
      await saveChatToDatabase(state)

      // Track message count for free users if this is a user action
      const { userId } = await auth()
      if (userId) {
        await prisma.user
          .update({
            where: { id: userId },
            data: { messageCount: { increment: 1 } }
          })
          .catch((e: any) =>
            console.error('Failed to increment message count:', e)
          )
      }
    }
  },

  // Convert AI state to UI state for display
  onGetUIState: async () => {
    'use server'

    const aiState = getAIState<any>()
    if (!aiState?.messages) return []

    // Convert messages to UI components
    return aiState.messages
      .filter((message: any) => message.role !== 'tool')
      .map((message: any) => ({
        id: message.id || nanoid(),
        display: createMessageDisplay(message)
      }))
  }
})
