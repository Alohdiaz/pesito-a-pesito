// Based on: https://www.tradingview.com/widget/ticker-tape/
// Modified for academic use in a university project
// Copyright (c) TradingView Inc.
// Usage allowed under TradingView’s public widget terms

'use client'

import * as React from 'react'
import { useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'

export function TickerTape() {
  const container = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme() 

  useEffect(() => {
    if (!container.current) return

    container.current.innerHTML = ''

    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500 Index' },
        { proName: 'FOREXCOM:NSXUSD', title: 'US 100 Cash CFD' },
        { proName: 'FX_IDC:EURUSD', title: 'EUR to USD' },
        { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
        { description: 'Apple Inc', proName: 'NASDAQ:AAPL' },
        { description: 'Alphabet Inc', proName: 'NASDAQ:GOOGL' }
      ],
      showSymbolLogo: true,
      isTransparent: false,
      displayMode: 'adaptive',
      colorTheme: resolvedTheme === 'dark' ? 'dark' : 'light',
      locale: 'es'
    })

    if (container.current) {// Implementacion por error
    container.current.appendChild(script)
    }

    return () => {
      if (container.current) { // Implementacion por error
      container.current.innerHTML = ''
      }
    }
  }, [resolvedTheme]) 

  return (
    <div
      className="tradingview-widget-container mb-2 md:min-h-20 min-h-28"
      ref={container}
    >
      <div className="tradingview-widget-container__widget" />
      <div className="tradingview-widget-copyright flex justify-end mr-2">
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-right"
        >
          Checa los mercados en TradingView - Pesito a Pesito
        </a>
      </div>
    </div>
  )
}
