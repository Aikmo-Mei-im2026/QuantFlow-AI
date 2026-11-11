'use client'

import { Search } from 'nextra/components'
import { useLocale } from '@/hooks'

export default function HelpSearch() {
  const { t } = useLocale()

  return (
    <div className="qf-help-search my-6 max-w-xl" role="search" aria-label={t('search.placeholder')}>
      <Search
        placeholder={t('search.placeholder')}
        emptyResult={t('search.noResults')}
        errorText={t('search.errorText')}
        loading={t('search.loading')}
      />
    </div>
  )
}
