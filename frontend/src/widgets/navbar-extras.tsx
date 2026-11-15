'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks'
import ProfileChip from '@/widgets/profile-chip'
import ThemeToggle from '@/widgets/theme-toggle'

export default function NavbarExtras() {
  const { currentLocale, t } = useLocale()

  return (
    <>
      <ProfileChip />
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
