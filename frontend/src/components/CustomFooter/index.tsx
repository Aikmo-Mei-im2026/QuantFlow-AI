import type { I18nLangKeys } from '@/i18n'
import { Separator } from '@/components/ui/separator'
import { useServerLocale } from '@/hooks'
import ThemeSettings from '@/widgets/theme-settings'

const CURRENT_YEAR = new Date().getFullYear()

export async function CustomFooter({ lang }: { lang: I18nLangKeys }) {
  const { t } = await useServerLocale(lang)

  return (
    <div className="flex w-full flex-col items-center justify-between gap-5 px-4 sm:flex-row">
      <ThemeSettings />
      <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
        <span>{ t('footer.disclaimer') }</span>
        <Separator className="w-40" />
        <span>{ t('footer.copyright', { year: CURRENT_YEAR }) }</span>
      </div>
    </div>
  )
}
