/**
 * Utilidades auxiliares para el procesamiento de mensajes sin dependencias de componentes
 * Este archivo no debe importar componentes de React para evitar dependencias circulares
 */

import { Message } from 'ai'

/**
 * Extrae de forma segura el contenido textual de un mensaje
 * Se encarga de manejar distintos tipos de estructuras como strings,
 * objetos con streams, arreglos o mensajes estructurados
 */
export function getSafeContent(input: any): string {
  // Si el contenido ya es un string, se retorna directamente
  if (typeof input === 'string') {
    return input
  }

  // Si el contenido es nulo o indefinido, retorna cadena vacía
  if (input === null || input === undefined) {
    return ''
  }

  // Si el contenido es un objeto con propiedad 'value' (usado en streams), se evalúa recursivamente
  if (input && typeof input === 'object' && 'value' in input) {
    return getSafeContent(input.value)
  }

  // Si es un arreglo con elementos tipo objeto (como llamadas a herramientas)
  if (Array.isArray(input) && input.length > 0) {
    if (typeof input[0] === 'object' && input[0] !== null) {
      const item = input[0]
      if (item.toolName || item.type === 'tool-call') {
        return 'Procesando solicitud...'
      }
      // Si hay strings en el arreglo, se concatenan
      return input.filter(item => typeof item === 'string').join(' ')
    }
  }

  // Si es un objeto, se intenta obtener contenido textual significativo
  if (typeof input === 'object') {
    // If it has a toString method that's not the default
    if (input.toString && input.toString() !== '[object Object]') {
      return input.toString()
    }

    if (input.text) return input.text
    if (input.content && typeof input.content === 'string') return input.content

    // Si no se puede extraer texto, retorna una cadena indicativa
    return 'Procesando respuesta...'
  }

  // Si es un valor primitivo (boolean, number, etc.), se convierte a string
  return String(input)
}

/**
 * Genera un título breve y descriptivo a partir del contenido de un mensaje
 */
export function generateChatTitle(content: any): string {
  if (typeof content === 'string') {
    return content.length > 40 ? `${content.substring(0, 40)}...` : content
  }

  if (content && typeof content === 'object' && content.content) {
    const innerContent =
      typeof content.content === 'string'
        ? content.content
        : JSON.stringify(content.content)
    return innerContent.length > 40
      ? `${innerContent.substring(0, 40)}...`
      : innerContent
  }

  return 'Nueva conversación'
}
