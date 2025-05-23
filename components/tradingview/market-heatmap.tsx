// Based on: https://www.tradingview.com/widget/stock-heatmap/
// Modified for academic use in a university project
// Copyright (c) TradingView Inc.
// Usage allowed under TradingView’s public widget terms

'use client'

import React, { useEffect, useRef, memo } from 'react'

export function MarketHeatmap({}) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return

    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      exchanges: [],
      dataSource: 'SPX500',
      grouping: 'sector',
      blockSize: 'market_cap_basic',
      blockColor: 'change',
      locale: 'es',
      symbolUrl: '',
      colorTheme: 'light',
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: '100%',
      height: '100%'
    })

    container.current.appendChild(script)

    return () => {
      if (container.current) {
        container.current.removeChild(script)
      }
    }
  }, [])

  return (
    <div style={{ height: '500px' }}>
      <div
        className="tradingview-widget-container"
        ref={container}
        style={{ height: '100%', width: '100%' }}
      >
        <div
          className="tradingview-widget-container__widget"
          style={{ height: 'calc(100% - 32px)', width: '100%' }}
        ></div>
        <div className="tradingview-widget-copyright">
          <a
            href="https://www.tradingview.com/"
            rel="noopener nofollow"
            target="_blank"
          >
            <span className="">
              Checa los mercados en TradingView - Pesito a Pesito
            </span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default memo(MarketHeatmap)
