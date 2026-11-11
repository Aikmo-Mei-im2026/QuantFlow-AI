'use client'

import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/hooks'
import { labCopy as copy } from '@/i18n/lab'
import { mockCandidates } from '@/lib/mock-data'

export default function CandidateResearch() {
  const { t } = useLocale()
  const [query, setQuery] = useState('')
  const [selectedCode, setSelectedCode] = useState(mockCandidates[0].code)
  const term = query.trim().toLocaleLowerCase('zh-CN')
  const results = mockCandidates.filter(item => item.code.includes(term) || item.name.toLocaleLowerCase('zh-CN').includes(term))
  const selected = results.find(item => item.code === selectedCode) ?? results[0]

  return (
    <section aria-label={copy.researchTab}>
      <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <Label htmlFor="qf-stock-search" className="text-base font-semibold">{ copy.searchLabel }</Label>
        <div className="relative mt-3">
          <Search aria-hidden="true" className="absolute top-3.5 left-3 size-4 text-muted-foreground" />
          <Input
            id="qf-stock-search"
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            aria-describedby="qf-stock-search-scope"
            className="h-11 pr-12 pl-10"
            autoComplete="off"
          />
          { query && (
            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 size-9" aria-label={copy.clearSearch} onClick={() => setQuery('')}>
              <X aria-hidden="true" className="size-4" />
            </Button>
          ) }
        </div>
        <p id="qf-stock-search-scope" className="mt-2 text-xs leading-5 text-muted-foreground">{ copy.searchScope }</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p role="status" aria-live="polite">
          { copy.results }
          {' · '}
          { results.length }
          {' '}
          { copy.resultUnit }
        </p>
        <p>{ copy.source }</p>
      </div>

      { !selected
        ? (
            <div className="mt-3 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
              <Search aria-hidden="true" className="mx-auto mb-4 size-7 text-muted-foreground" />
              <h2 className="font-semibold">{ copy.noResults }</h2>
              <p className="mt-2 text-sm text-muted-foreground">{ copy.noResultsHint }</p>
              <Button type="button" variant="outline" className="mt-5" onClick={() => setQuery('')}>{ copy.clearSearch }</Button>
            </div>
          )
        : (
            <div className="mt-3 grid min-w-0 items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1" aria-label={copy.listLabel}>
                { results.map(item => (
                  <li key={item.code}>
                    <button
                      type="button"
                      aria-pressed={selected.code === item.code}
                      aria-controls="qf-stock-detail"
                      onClick={() => setSelectedCode(item.code)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected.code === item.code ? 'border-primary/40 bg-primary/8' : 'bg-card hover:bg-accent'}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{ item.name }</span>
                        <span className="text-sm font-semibold text-primary tabular-nums">{ item.score.toFixed(4) }</span>
                      </span>
                      <span className="mt-1.5 block text-xs text-muted-foreground">
                        { item.code }
                        {' · '}
                        { item.industry }
                      </span>
                    </button>
                  </li>
                )) }
              </ul>

              <div id="qf-stock-detail" className="min-w-0 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      { selected.code }
                      {' / '}
                      { selected.industry }
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">{ selected.name }</h2>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs text-muted-foreground">{ copy.score }</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-primary tabular-nums">{ selected.score.toFixed(4) }</p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">{ copy.scoreNote }</p>
                <dl className="mt-4 space-y-3 border-y py-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">{ copy.reason }</dt>
                    <dd className="mt-1 leading-6">{ selected.reason }</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{ copy.risk }</dt>
                    <dd className="mt-1">{ selected.risk }</dd>
                  </div>
                </dl>
                <h3 className="mt-5 text-sm font-semibold">{ copy.contributionTitle }</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{ copy.contributionNote }</p>
                <div className="mt-4 space-y-3">
                  { selected.contributions.map(category => (
                    <div key={category.label}>
                      <div className="mb-1 flex flex-wrap justify-between gap-1 text-xs">
                        <span>{ category.label }</span>
                        <span className="text-muted-foreground tabular-nums">
                          { category.score.toFixed(2) }
                          {' × '}
                          { (category.weight * 100).toFixed(0) }
                          {'% = '}
                          <strong className="font-medium text-foreground">{ category.value.toFixed(4) }</strong>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-primary/8" aria-hidden="true">
                        <div className="h-full rounded-full bg-primary/65" style={{ width: `${category.value}%` }} />
                      </div>
                    </div>
                  )) }
                </div>
                <details key={selected.code} className="mt-6 border-t pt-4">
                  <summary className="cursor-pointer text-sm font-medium text-primary">{ copy.factorsSummary }</summary>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">{ t('quantflow.workspace.detailNote') }</p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[480px] text-xs">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th scope="col" className="py-2 pr-3 font-medium">{ t('quantflow.workspace.factors.factor') }</th>
                          <th scope="col" className="py-2 pr-3 font-medium">{ t('quantflow.workspace.factors.value') }</th>
                          <th scope="col" className="py-2 pr-3 font-medium">{ t('quantflow.workspace.factors.std') }</th>
                          <th scope="col" className="py-2 font-medium">{ t('quantflow.workspace.factors.contribution') }</th>
                        </tr>
                      </thead>
                      <tbody>
                        { selected.factors.map(factor => (
                          <tr key={factor.name} className="border-b last:border-0">
                            <th scope="row" className="py-2.5 pr-3 text-left font-normal">{ factor.name }</th>
                            <td className="py-2.5 pr-3 tabular-nums">{ factor.value }</td>
                            <td className="py-2.5 pr-3 tabular-nums">{ factor.std.toFixed(1) }</td>
                            <td className="py-2.5 tabular-nums">{ factor.contribution.toFixed(4) }</td>
                          </tr>
                        )) }
                      </tbody>
                    </table>
                  </div>
                </details>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">{ copy.sourceNote }</p>
              </div>
            </div>
          ) }
      <p className="mt-4 text-xs leading-5 text-muted-foreground">{ copy.researchBoundary }</p>
    </section>
  )
}
