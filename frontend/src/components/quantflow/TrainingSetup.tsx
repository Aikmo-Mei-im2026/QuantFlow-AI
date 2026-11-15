'use client'

import type { FormEvent } from 'react'
import type { TrainingDataset, TrainingInstrument, TrainingMode } from '@/lib/demo-training'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/hooks'
import { assignedTrainingStart, drawTrainingInstrument, MAX_TRAINING_FILE_BYTES, parseTrainingDataset } from '@/lib/demo-training'

export type TrainingPools = Record<'demo' | 'site' | 'local', TrainingDataset | null>

const selectClass = 'mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm'

export default function TrainingSetup({ pools, mode, capital, importDataset, start }: {
  pools: TrainingPools
  mode: TrainingMode
  capital: number
  importDataset: (dataset: TrainingDataset) => void
  start: (dataset: TrainingDataset, instrument: TrainingInstrument, day: number, cashCents: number) => void
}) {
  const { t } = useLocale()
  const [source, setSource] = useState<keyof TrainingPools>('demo')
  const [code, setCode] = useState('600036')
  const [date, setDate] = useState<string | null>(null)
  const [cash, setCash] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<'file' | 'code' | 'cash' | 'date' | null>(null)
  const dataset = pools[source]!
  const instrument = dataset.instruments.find(item => item.code === code.trim())
  const defaultInstrument = instrument ?? dataset.instruments[0]
  const startDate = date ?? defaultInstrument.candles[Math.min(99, defaultInstrument.candles.length - 2)].date
  const blind = mode === 'blind'

  const load = async (file: File) => {
    setImporting(true)
    setError(null)
    try {
      if (file.size > MAX_TRAINING_FILE_BYTES) {
        throw new Error('Training file too large')
      }
      const imported = parseTrainingDataset(JSON.parse((await file.text()).replace(/^\uFEFF/, '')))
      importDataset(imported)
      setSource('local')
      setCode(imported.instruments[0].code)
      setDate(null)
    }
    catch {
      setError('file')
    }
    finally {
      setImporting(false)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = cash ?? String(capital / 100)
    if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError('cash')
      return
    }
    const selection = blind
      ? drawTrainingInstrument(dataset.instruments, startDate, Math.random)
      : instrument && { instrument, day: assignedTrainingStart(instrument.candles, startDate) }
    if (!selection || selection.day < 0) {
      setError(!blind && !instrument ? 'code' : 'date')
      return
    }
    setError(null)
    start(dataset, selection.instrument, selection.day, Math.round(Number(amount) * 100))
  }

  return (
    <form className="mt-4 rounded-xl border bg-card p-4 shadow-sm" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <Label htmlFor="qf-data-source">{ t('quantflow.training.setup.source') }</Label>
          <select
            id="qf-data-source"
            className={selectClass}
            value={source}
            onChange={event => {
              const next = event.target.value as keyof TrainingPools
              const selected = pools[next]
              if (selected) {
                setSource(next)
                setCode(selected.instruments[0].code)
                setDate(null)
                setError(null)
              }
            }}
          >
            <option value="demo">{t('quantflow.training.setup.synthetic')}</option>
            {pools.site && (
              <option value="site">
                {pools.site.source}
                {' '}
                ·
                {' '}
                {t('quantflow.training.setup.site')}
              </option>
            )}
            {pools.local && (
              <option value="local">
                {pools.local.source}
                {' '}
                ·
                {' '}
                {t('quantflow.training.setup.local')}
              </option>
            )}
          </select>
        </div>
        {blind
          ? (
              <div>
                <p className="text-sm font-medium">{t('quantflow.training.setup.code')}</p>
                <p className="mt-1 flex h-9 items-center rounded-md bg-muted/50 px-3 text-sm text-muted-foreground">{t('quantflow.training.setup.randomStock')}</p>
              </div>
            )
          : (
              <div>
                <Label htmlFor="qf-stock-code">{ t('quantflow.training.setup.code') }</Label>
                <Input
                  id="qf-stock-code"
                  className="mt-1 font-mono"
                  list="qf-stock-pool"
                  inputMode="numeric"
                  placeholder="000001"
                  value={code}
                  onChange={event => {
                    setCode(event.target.value)
                    setError(null)
                  }}
                />
                <datalist id="qf-stock-pool">
                  {dataset.instruments.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
                </datalist>
              </div>
            )}
        <div>
          <Label htmlFor="qf-start-date">{ t('quantflow.training.setup.date') }</Label>
          <Input id="qf-start-date" className="mt-1" type="date" value={startDate} onChange={event => setDate(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="qf-initial-cash">{ t('quantflow.training.setup.cash') }</Label>
          <Input id="qf-initial-cash" className="mt-1 font-mono" inputMode="decimal" value={cash ?? String(capital / 100)} onChange={event => setCash(event.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={importing}>{ t('quantflow.training.setup.start') }</Button>
        <Label className="cursor-pointer rounded-md border border-input px-3 py-2 text-xs focus-within:ring-2 focus-within:ring-primary">
          { t('quantflow.training.setup.import') }
          <input
            className="sr-only"
            type="file"
            accept=".json,application/json"
            disabled={importing}
            onChange={event => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (file) {
                void load(file)
              }
            }}
          />
        </Label>
        {!blind && instrument && (
          <span className="text-xs text-muted-foreground">
            {instrument.name}
            {' '}
            ·
            {' '}
            {instrument.candles[0].date}
            {' '}
            —
            {' '}
            {instrument.candles.at(-1)?.date}
          </span>
        )}
      </div>
      {error && (!blind || error !== 'code') && <p role="alert" className="mt-2 text-xs text-red-600">{t(`quantflow.training.setup.error.${error}`)}</p>}
    </form>
  )
}
