'use client'

/**
 * Funciones utilitarias para renderizar de forma segura objetos complejos en React
 */

import React from 'react'

/**
 * Convierte de forma segura cualquier contenido potencialmente complejo a una cadena de texto
 * Esto es útil para procesar contenido JSON que podría contener objetos anidados que React no puede mostrar directamente
 */
export function safeRenderContent(content: any): string {
  // Maneja valores nulos o indefinidos
  if (content === null || content === undefined) {
    return ''
  }

  // Devuelve cadenas directamente
  if (typeof content === 'string') {
    return content
  }

  // Convierte valores numéricos o booleanos a cadena
  if (typeof content === 'number' || typeof content === 'boolean') {
    return String(content)
  }

  // Procesa arreglos recursivamente
  if (Array.isArray(content)) {
    return content
      .map(item => safeRenderContent(item))
      .filter(Boolean)
      .join(' ')
  }

  // Procesa objetos
  if (typeof content === 'object') {
    // Verifica propiedades comunes que pueden contener texto
    if (content.text) return content.text
    if (content.content) return safeRenderContent(content.content)
    if (content.message) return content.message
    if (content.value) return content.value

    // Si es un contenido relacionado con herramientas, genera una descripción
    if (content.toolName) {
      let text = `Using ${content.toolName}`
      if (content.args?.symbol) {
        text += ` for ${content.args.symbol}`
      }
      return text
    }

    try {
      // Como último recurso, intenta convertir el objeto a JSON (evita referencias circulares)
      return JSON.stringify(content)
    } catch (e) {
      return '[Complex Object]'
    }
  }

  // Valor por defecto si no se reconoce el tipo
  return '[Unknown Content]'
}

/**
 * Verifica si un valor puede ser renderizado directamente por React sin necesidad de transformación
 */
export function isDirectlyRenderable(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    React.isValidElement(value)
  )
}

/**
 * Extrae texto simplificado desde un objeto de mensaje potencialmente complejo
 * Útil para vistas resumidas como la lista lateral del historial de chats
 */
export function extractMessageText(message: any): string {
  if (!message) return ''

  // En mensajes del usuario, el contenido suele ser texto plano
  if (message.role === 'user') {
    return safeRenderContent(message.content)
  }

  // En mensajes del asistente, puede requerirse un procesamiento adicional
  if (message.role === 'assistant') {
    if (Array.isArray(message.content)) {
      const item = message.content[0]

      // Si es una llamada a herramienta, genera una descripción breve
      if (item && item.type === 'tool-call') {
        let text = `Showing ${item.toolName?.replace('show', '')}`.toLowerCase()
        if (item.args?.symbol) {
          text += ` for ${item.args.symbol}`
        }
        return text
      }
    }

    // Procesamiento por defecto para otros casos
    return safeRenderContent(message.content)
  }

  // En mensajes de tipo "tool", no se muestra contenido
  if (message.role === 'tool') {
    return ''
  }

  // Valor por defecto si no se reconoce el tipo de mensaje
  return safeRenderContent(message.content)
}
