'use client'

import { UserRound } from 'lucide-react'
import Link from 'next/link'
import { useDemoProfile, useLocale } from '@/hooks'

/** Shows what this browser remembers. The label stays neutral because the profile authenticates nobody. */
export default function ProfileChip() {
  const { currentLocale, t } = useLocale()
  const profile = useDemoProfile()

  return (
    <Link
      href={`/${currentLocale}/login`}
      title={t('quantflow.login.intro')}
      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <UserRound aria-hidden="true" className="size-3.5" />
      { profile?.nickname ?? t('quantflow.login.enter') }
    </Link>
  )
}
