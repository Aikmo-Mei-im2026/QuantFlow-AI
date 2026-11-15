'use client'

import type { Experiment } from '@/lib/mock-data'
import { ArrowUpRight, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks'
import { labCopy as copy } from '@/i18n/lab'
import { mockExperiments } from '@/lib/mock-data'
import { DataStatusLine, DemoBadge, StatusBadge } from './shared'

const TYPE_OPTIONS = ['all', 'screening', 'backtest', 'training'] as const
const STATUS_OPTIONS = ['all', 'running', 'succeeded', 'failed', 'interrupted'] as const
const STATUS_LABEL_KEYS = {
  running: 'quantflow.common.statusRunning',
  succeeded: 'quantflow.common.statusSucceeded',
  failed: 'quantflow.common.statusFailed',
  interrupted: 'quantflow.common.statusInterrupted',
} as const

function ChipGroup<O extends string>({ label, options, value, counts, onChange, labelOf }: {
  label: string
  options: readonly O[]
  value: O
  counts: Record<string, number>
  onChange: (option: O) => void
  labelOf: (option: O) => string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">{ label }</span>
      { options.map(option => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          className={`rounded-md px-2.5 py-1 text-xs ${value === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
          onClick={() => onChange(option)}
        >
          { labelOf(option) }
          <span className="ml-1.5 tabular-nums opacity-70">{ counts[option] ?? 0 }</span>
        </button>
      )) }
    </div>
  )
}

export default function ExperimentsView() {
  const { t, currentLocale } = useLocale()
  const [type, setType] = useState<Experiment['type'] | 'all'>('all')
  const [status, setStatus] = useState<Experiment['status'] | 'all'>('all')
  const filtered = type !== 'all' || status !== 'all'
  const visible = mockExperiments.filter(item => (type === 'all' || item.type === type) && (status === 'all' || item.status === status))
  const typeCounts = Object.fromEntries(TYPE_OPTIONS.map(option => [option, option === 'all' ? mockExperiments.length : mockExperiments.filter(item => item.type === option).length]))
  const statusCounts = Object.fromEntries(STATUS_OPTIONS.map(option => [option, option === 'all' ? mockExperiments.length : mockExperiments.filter(item => item.status === option).length]))

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-xs font-semibold tracking-wider text-primary">{ copy.recordsEyebrow }</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{ t('quantflow.experiments.title') }</h1>
        <DemoBadge />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{ copy.recordsIntro }</p>
      <DataStatusLine />

      <div className="mt-7 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/4 p-5">
        <ClipboardList aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">{ copy.recordsScopeTitle }</h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">{ copy.recordsScope }</p>
        </div>
      </div>

      <div className="mt-7 space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <ChipGroup
            label={t('quantflow.experiments.table.type')}
            options={TYPE_OPTIONS}
            value={type}
            counts={typeCounts}
            onChange={setType}
            labelOf={option => (option === 'all' ? t('quantflow.experiments.filter.all') : t(`quantflow.experiments.types.${option}`))}
          />
          <ChipGroup
            label={t('quantflow.experiments.table.status')}
            options={STATUS_OPTIONS}
            value={status}
            counts={statusCounts}
            onChange={setStatus}
            labelOf={option => (option === 'all' ? t('quantflow.experiments.filter.all') : t(STATUS_LABEL_KEYS[option]))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{ t('quantflow.experiments.filter.showing', { total: mockExperiments.length, visible: visible.length }) }</span>
          { filtered && (
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setType('all')
                setStatus('all')
              }}
            >
              { t('quantflow.experiments.filter.reset') }
            </button>
          ) }
        </div>
      </div>

      <div className="mt-5 space-y-3">
        { visible.length === 0 && (
          <p className="rounded-2xl border border-dashed px-5 py-8 text-center text-sm text-muted-foreground">{ t('quantflow.experiments.filter.empty') }</p>
        ) }
        { visible.map(exp => (
          <details key={exp.id} className="group rounded-2xl border bg-card shadow-sm open:border-primary/30">
            <summary className="cursor-pointer rounded-2xl px-5 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-6">
              <span className="ml-1 inline-grid w-[calc(100%-1.5rem)] align-middle">
                <span className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{ exp.name }</span>
                  <span className="flex items-center gap-3 text-xs">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">{ t(`quantflow.experiments.types.${exp.type}`) }</span>
                    <StatusBadge status={exp.status} />
                  </span>
                </span>
                <span className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span>{ exp.id }</span>
                  <span>{ exp.range }</span>
                  <span className="font-medium text-primary">{ copy.recordDetail }</span>
                </span>
              </span>
            </summary>
            <div className="mx-5 border-t pt-4 pb-5 sm:mx-6">
              <p className="mb-4 text-xs leading-6 text-muted-foreground">{ t('quantflow.experiments.sampleNote') }</p>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[100px_1fr]">
                <dt className="text-muted-foreground">{ t('quantflow.experiments.table.time') }</dt>
                <dd className="break-words tabular-nums">{ exp.time }</dd>
                <dt className="text-muted-foreground">{ t('quantflow.experiments.detail.version') }</dt>
                <dd className="break-words font-mono">{ exp.version }</dd>
                <dt className="text-muted-foreground">{ t('quantflow.experiments.detail.params') }</dt>
                <dd className="leading-6">{ exp.params }</dd>
                <dt className="text-muted-foreground">{ t('quantflow.experiments.detail.result') }</dt>
                <dd className="leading-6">{ exp.result }</dd>
              </dl>
              <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs leading-6 text-muted-foreground">{ copy.recordReminder }</p>
            </div>
          </details>
        )) }
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/${currentLocale}/lab`}>
            { t('quantflow.lab.title') }
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/${currentLocale}/training`}>
            { copy.trainingLink }
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
