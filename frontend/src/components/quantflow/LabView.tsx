'use client'

import { ArrowUpRight, BookOpen, ChartNoAxesCombined, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/hooks'
import { labCopy as copy } from '@/i18n/lab'
import { mockEquity, mockLabSummary, mockTrades } from '@/lib/mock-data'
import CandidateResearch from './CandidateResearch'
import { EquityChart } from './charts'
import { DataStatusLine, DemoBadge, SideLabel, StatusBadge } from './shared'

const TABS = ['trades', 'params', 'data'] as const

function BacktestSample() {
  const { t } = useLocale()
  const [done, setDone] = useState(false)
  const [tab, setTab] = useState<(typeof TABS)[number]>('trades')

  const run = () => {
    setDone(true)
  }

  const metrics = [
    { label: t('quantflow.lab.metrics.totalReturn'), value: mockLabSummary.totalReturn, cls: 'text-red-600' },
    { label: t('quantflow.lab.metrics.maxDrawdown'), value: mockLabSummary.maxDrawdown, cls: 'text-green-600' },
    { label: t('quantflow.lab.metrics.turnover'), value: mockLabSummary.turnover, cls: '' },
  ]

  return (
    <section aria-label={copy.backtestTab}>
      <h2 className="text-xl font-semibold">{ copy.backtestTitle }</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{ copy.backtestIntro }</p>
      <div className="mt-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="qf-lab-style">{ t('quantflow.workspace.styleLabel') }</Label>
            <select
              id="qf-lab-style"
              className="mt-1 flex h-9 w-44 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
              value="stable"
              disabled
            >
              <option value="stable">{ t('quantflow.styles.stable') }</option>
            </select>
          </div>
          <div>
            <Label htmlFor="qf-lab-range">{ t('quantflow.lab.rangeLabel') }</Label>
            <select
              id="qf-lab-range"
              className="mt-1 flex h-9 w-56 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
              value="2025-10-08 ~ 2026-09-30"
              disabled
            >
              <option value="2025-10-08 ~ 2026-09-30">2025-10-08 ~ 2026-09-30</option>
            </select>
          </div>
          <Button onClick={run}>
            { t('quantflow.lab.run') }
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{ t('quantflow.lab.presetNote') }</p>
      </div>

      { done && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap gap-x-6 gap-y-2">
              { metrics.map(m => (
                <div key={m.label}>
                  <div className="text-xs text-muted-foreground">{ m.label }</div>
                  <div className={`text-lg font-semibold ${m.cls}`}>{ m.value }</div>
                </div>
              )) }
            </div>
            <EquityChart nav={mockEquity.nav} benchmark={mockEquity.benchmark} />
            <div className="mt-1 flex gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-primary" />
                { copy.curveLabel }
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-gray-400" />
                { t('quantflow.lab.benchmark') }
              </span>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap gap-1 border-b pb-2 text-sm">
              { TABS.map(item => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={tab === item}
                  className={`rounded-md px-3 py-1.5 ${tab === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
                  onClick={() => setTab(item)}
                >
                  { t(`quantflow.lab.tabs.${item}`) }
                </button>
              )) }
            </div>

            { tab === 'trades' && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.time') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.code') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.side') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.price') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.qty') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.fee') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.status') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.reason') }</th>
                    </tr>
                  </thead>
                  <tbody>
                    { mockTrades.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono">{ row.time }</td>
                        <td className="py-2 pr-4 font-mono">{ row.code }</td>
                        <td className="py-2 pr-4"><SideLabel side={row.side} /></td>
                        <td className="py-2 pr-4 font-mono">{ row.price > 0 ? row.price.toFixed(2) : '—' }</td>
                        <td className="py-2 pr-4 font-mono">{ row.qty }</td>
                        <td className="py-2 pr-4 font-mono">{ row.fee > 0 ? row.fee.toFixed(2) : '—' }</td>
                        <td className="py-2 pr-4"><StatusBadge status={row.status} /></td>
                        <td className="py-2 pr-4 text-muted-foreground">{ row.reason }</td>
                      </tr>
                    )) }
                  </tbody>
                </table>
              </div>
            ) }

            { tab === 'params' && (
              <p className="mt-3 text-sm text-muted-foreground">{ t('quantflow.lab.paramsNote') }</p>
            ) }

            { tab === 'data' && (
              <p className="mt-3 text-sm text-muted-foreground">{ t('quantflow.lab.dataNote') }</p>
            ) }
          </div>
        </div>
      ) }
    </section>
  )
}

export default function LabView() {
  const { t, currentLocale } = useLocale()
  const [section, setSection] = useState<'research' | 'backtest'>('research')

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-xs font-semibold tracking-wider text-primary">{ copy.eyebrow }</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{ t('quantflow.lab.title') }</h1>
        <DemoBadge />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{ copy.intro }</p>
      <DataStatusLine />

      <div className="mt-7 mb-6 flex flex-wrap items-center gap-2 border-b pb-4" role="group" aria-label={copy.sectionLabel}>
        <Button type="button" variant={section === 'research' ? 'default' : 'outline'} aria-pressed={section === 'research'} aria-controls="qf-lab-research" onClick={() => setSection('research')}>
          <Search aria-hidden="true" className="size-4" />
          { copy.researchTab }
        </Button>
        <Button type="button" variant={section === 'backtest' ? 'default' : 'outline'} aria-pressed={section === 'backtest'} aria-controls="qf-lab-backtest" onClick={() => setSection('backtest')}>
          <ChartNoAxesCombined aria-hidden="true" className="size-4" />
          { copy.backtestTab }
        </Button>
        <Link href={`/${currentLocale}/workspace`} className="ml-auto inline-flex items-center gap-1.5 py-2 text-xs font-medium text-primary hover:underline">
          <BookOpen aria-hidden="true" className="size-3.5" />
          { copy.learningLink }
        </Link>
      </div>

      <div id="qf-lab-research" hidden={section !== 'research'}><CandidateResearch /></div>
      <div id="qf-lab-backtest" hidden={section !== 'backtest'}><BacktestSample /></div>

      <aside className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-primary/4 p-5 sm:p-6">
        <div className="max-w-xl">
          <h2 className="text-sm font-semibold">{ copy.nextTitle }</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">{ copy.nextNote }</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="sm">
            <Link href={`/${currentLocale}/training`}>
              { copy.trainingLink }
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline"><Link href={`/${currentLocale}/experiments`}>{ copy.recordsLink }</Link></Button>
        </div>
      </aside>
    </div>
  )
}
