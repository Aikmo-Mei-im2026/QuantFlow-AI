'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks'
import ThemeToggle from '@/widgets/theme-toggle'

export default function NavbarExtras() {
  const { currentLocale, t } = useLocale()

  return (
    <>
      <Link
        href={`/${currentLocale}/docs`}
        className="qf-help-link"
        aria-label={t('quantflow.home.docs')}
        title={t('quantflow.home.docs')}
      >
        <span aria-hidden="true">?</span>
      </Link>
      <ThemeToggle />
    </>
  )
}
