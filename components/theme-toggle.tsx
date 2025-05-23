'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { IconMoon, IconSun } from '@/components/ui/icons'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [_, startTransition] = React.useTransition()

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => {
        startTransition(() => {
          setTheme(theme === 'light' ? 'dark' : 'light')
        })
      }}
    >
      {theme === 'dark' ? (
        <IconSun className="transition-all" />
      ) : (
        <IconMoon className="transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
