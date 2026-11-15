/** Inclusive trailing mean. Missing/non-finite inputs invalidate the whole window. */
import type { Candle } from './mock-data'

export function trailingMean(values: readonly number[], period: number): (number | null)[] {
  if (!Number.isSafeInteger(period) || period < 1) {
    throw new Error('均线周期必须为正整数')
  }
  return values.map((_, index) => {
    if (index + 1 < period) {
      return null
    }
    const window = values.slice(index + 1 - period, index + 1)
    if (window.some(value => !Number.isFinite(value))) {
      return null
    }
    return window.reduce((sum, value) => sum + value, 0) / period
  })
}

/** Group daily bars by Monday in the exchange calendar, including a partial current week. */
export function trainingWeek(date: string): string {
  const monday = new Date(`${date}T00:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
  return monday.toISOString().slice(0, 10)
}

export function aggregateTrainingWeeks(candles: Candle[]): Candle[] {
  const weeks: Candle[] = []
  let week = ''
  for (const bar of candles) {
    const key = trainingWeek(bar.date)
    if (key !== week) {
      weeks.push({ ...bar })
      week = key
      continue
    }
    const current = weeks[weeks.length - 1]
    current.date = bar.date
    current.high = Math.max(current.high, bar.high)
    current.low = Math.min(current.low, bar.low)
    current.close = bar.close
    current.vol += bar.vol
  }
  return weeks
}
