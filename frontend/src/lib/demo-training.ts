import type { Candle } from './mock-data'

/**
 * Selection maths for the two training modes. Only pure helpers live here so the blind draw and the
 * start-date rules can be tested without mounting a component.
 */

export type TrainingMode = 'assigned' | 'blind'

/** Bars replayed before the first tradable day, so MAs and the sub-chart indicators are warm at the start. */
export const MIN_TRAINING_HISTORY_BARS = 20
export const MAX_TRAINING_FILE_BYTES = 5 * 1024 * 1024

export interface TrainingInstrument {
  code: string
  name: string
  candles: Candle[]
}

export interface TrainingDataset {
  source: string
  collectedAt: string
  instruments: TrainingInstrument[]
}

export function isTrainingCode(code: string): boolean {
  return /^(?:60|00)\d{4}$/.test(code)
}

export function isTrainingDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function parseTrainingDataset(raw: unknown): TrainingDataset {
  const dataset = raw as Partial<TrainingDataset & { schema: string, priceBasis: string, volumeUnit: string }> | null
  if (!dataset || dataset.schema !== 'quantflow-training-v1' || dataset.priceBasis !== 'unadjusted' || dataset.volumeUnit !== 'shares'
    || typeof dataset.source !== 'string' || !dataset.source.trim() || dataset.source.length > 80
    || typeof dataset.collectedAt !== 'string' || !isTrainingDate(dataset.collectedAt.slice(0, 10))
    || !Number.isFinite(Date.parse(dataset.collectedAt))
    || !Array.isArray(dataset.instruments) || dataset.instruments.length < 1 || dataset.instruments.length > 50) {
    throw new Error('Invalid training dataset')
  }
  const codes = new Set<string>()
  for (const instrument of dataset.instruments) {
    if (!instrument || typeof instrument.code !== 'string' || !isTrainingCode(instrument.code) || codes.has(instrument.code)
      || typeof instrument.name !== 'string' || !instrument.name.trim() || instrument.name.length > 80
      || !Array.isArray(instrument.candles) || instrument.candles.length < 2 || instrument.candles.length > 2500) {
      throw new Error('Invalid training instrument')
    }
    codes.add(instrument.code)
    let previous = ''
    for (const bar of instrument.candles) {
      if (!bar || !isTrainingDate(bar.date) || bar.date <= previous || bar.date > dataset.collectedAt.slice(0, 10)
        || !Number.isSafeInteger(bar.vol) || bar.vol < 0
        || [bar.open, bar.high, bar.low, bar.close].some(price => {
          const cents = Math.round(price * 100)
          return typeof price !== 'number' || !Number.isSafeInteger(cents) || cents <= 0 || Math.abs(price * 100 - cents) > 0.000001
        })
        || bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close)) {
        throw new Error('Invalid daily bar')
      }
      previous = bar.date
    }
  }
  return { source: dataset.source, collectedAt: dataset.collectedAt, instruments: dataset.instruments }
}

/** Assigned dates that fall on a holiday start on the following available trading day. */
export function assignedTrainingStart(candles: Candle[], from: string): number {
  if (!isTrainingDate(from) || candles.length < 2 || from < candles[0].date) {
    return -1
  }
  return candles.findIndex((bar, index) => bar.date >= from && index < candles.length - 1)
}

/** The draw changes only the stock. Apply the same start-date rules as assigned mode. */
export function drawTrainingInstrument(instruments: TrainingInstrument[], from: string, random: () => number) {
  const candidates = instruments
    .map(instrument => ({ instrument, day: assignedTrainingStart(instrument.candles, from) }))
    .filter(candidate => candidate.day >= 0)
  const index = drawTrainingIndex(candidates.length, random)
  return index === null ? null : candidates[index]
}

/** Stands in for a real code or name until the blind run is revealed. */
export const TRAINING_MASK = '••••••'

/**
 * Day indexes a run may open on. The earliest keeps `minHistoryBars` of history behind it; the latest
 * leaves one day to trade, because a run that opens on the final bar can never advance.
 */
export function trainingStartIndices(totalDays: number, minHistoryBars = MIN_TRAINING_HISTORY_BARS): number[] {
  const first = Math.max(0, minHistoryBars - 1)
  const last = totalDays - 2
  if (last < first) {
    return []
  }
  return Array.from({ length: last - first + 1 }, (_, offset) => first + offset)
}

/** Index into the candidate pool, or null when the pool is empty so the caller can explain the idle state. */
export function drawTrainingIndex(poolSize: number, random: () => number): number | null {
  if (poolSize <= 0) {
    return null
  }
  return Math.min(poolSize - 1, Math.floor(random() * poolSize))
}

/** Assigned mode and revealed runs pass the real text through; a missing value stays empty rather than masked. */
export function maskTrainingText(value: string | undefined, revealed: boolean): string {
  if (revealed || !value) {
    return value ?? ''
  }
  return TRAINING_MASK
}
