'use client'

import { useTheme } from 'nextra-theme-docs'
import { useLocale } from '@/hooks'

export default function ThemeSettings() {
  const { theme, setTheme } = useTheme()
  const { t } = useLocale()

  return (
    <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
      { t('themeSwitcher.settings') }
      <select
        aria-label={t('themeSwitcher.settings')}
        value={theme ?? 'light'}
        onChange={event => setTheme(event.target.value)}
        className="rounded-full border bg-card px-3 py-2 text-foreground"
      >
        <option value="light">{ t('themeSwitcher.light') }</option>
        <option value="dark">{ t('themeSwitcher.dark') }</option>
        <option value="system">{ t('themeSwitcher.system') }</option>
      </select>
    </label>
  )
}
