import { trailingMean } from './demo-chart.ts'

/**
 * Indicator math for the training chart. Every series returns one slot per input bar and keeps
 * `null` while its window is incomplete, so the chart can say 窗口不足 instead of drawing a 0.
 * Moving averages restart their seed after an invalid bar; this matches how a bounded series is
 * drawn on mainstream quote terminals, not a server-side authoritative calculation.
 */

export type IndicatorPoint = number | null

export interface MacdSeries {
  dif: IndicatorPoint[]
  dea: IndicatorPoint[]
  hist: IndicatorPoint[]
}

export interface KdjSeries {
  k: IndicatorPoint[]
  d: IndicatorPoint[]
  j: IndicatorPoint[]
}

export interface BollSeries {
  upper: IndicatorPoint[]
  mid: IndicatorPoint[]
  lower: IndicatorPoint[]
}

const FLAT_MIDPOINT = 50

function invalid(): never {
  throw new Error('指标周期必须为正整数')
}

/** Recursive EMA seeded with the first finite value, so a 42-bar sample still yields a line. */
export function emaSeries(values: readonly IndicatorPoint[], period: number): IndicatorPoint[] {
  if (!Number.isSafeInteger(period) || period < 1) {
    invalid()
  }
  const weight = 2 / (period + 1)
  let previous: number | null = null
  return values.map((value) => {
    if (value === null || !Number.isFinite(value)) {
      previous = null
      return null
    }
    previous = previous === null ? value : value * weight + previous * (1 - weight)
    return previous
  })
}

export function macdSeries(closes: readonly number[], fast = 12, slow = 26, signal = 9): MacdSeries {
  if (!Number.isSafeInteger(fast) || !Number.isSafeInteger(slow) || !Number.isSafeInteger(signal) || fast < 1 || slow <= fast || signal < 1) {
    throw new Error('MACD 需满足 0<快线<慢线 且信号周期为正整数')
  }
  const fastLine = emaSeries(closes, fast)
  const slowLine = emaSeries(closes, slow)
  const dif = closes.map((_, index) => {
    const fastValue = fastLine[index]
    const slowValue = slowLine[index]
    return fastValue === null || slowValue === null ? null : fastValue - slowValue
  })
  const dea = emaSeries(dif, signal)
  const hist = dif.map((value, index) => {
    const average = dea[index]
    return value === null || average === null ? null : value - average
  })
  return { dif, dea, hist }
}

/**
 * KDJ(n,3,3): RSV over the trailing `period` bars, K and D smoothed with a 1/3 weight and seeded
 * at 50, J = 3K − 2D. A window with no range has no direction, so RSV falls back to 50.
 */
export function kdjSeries(candles: readonly { high: number, low: number, close: number }[], period = 9): KdjSeries {
  if (!Number.isSafeInteger(period) || period < 1) {
    invalid()
  }
  const k: IndicatorPoint[] = []
  const d: IndicatorPoint[] = []
  const j: IndicatorPoint[] = []
  let previousK: number | null = null
  let previousD: number | null = null
  candles.forEach((candle, index) => {
    if (index + 1 < period) {
      k.push(null)
      d.push(null)
      j.push(null)
      previousK = null
      previousD = null
      return
    }
    const window = candles.slice(index + 1 - period, index + 1)
    const highs = window.map(item => item.high)
    const lows = window.map(item => item.low)
    if (window.some(item => !Number.isFinite(item.high) || !Number.isFinite(item.low) || !Number.isFinite(item.close))) {
      k.push(null)
      d.push(null)
      j.push(null)
      previousK = null
      previousD = null
      return
    }
    const highest = Math.max(...highs)
    const lowest = Math.min(...lows)
    const rsv = highest === lowest ? FLAT_MIDPOINT : (candle.close - lowest) / (highest - lowest) * 100
    const nextK = (previousK ?? FLAT_MIDPOINT) * (2 / 3) + rsv * (1 / 3)
    const nextD = (previousD ?? FLAT_MIDPOINT) * (2 / 3) + nextK * (1 / 3)
    previousK = nextK
    previousD = nextD
    k.push(nextK)
    d.push(nextD)
    j.push(nextK * 3 - nextD * 2)
  })
  return { k, d, j }
}

/**
 * RSI with Wilder smoothing: the first value needs `period` changes, afterwards each new change
 * carries 1/period weight. Flat runs report the 50 midpoint; an all-gain window reports 100.
 */
export function rsiSeries(closes: readonly number[], period = 14): IndicatorPoint[] {
  if (!Number.isSafeInteger(period) || period < 1) {
    invalid()
  }
  const values: IndicatorPoint[] = closes.map(() => null)
  if (closes.length <= period) {
    return values
  }
  let gain = 0
  let loss = 0
  for (let index = 1; index <= period; index += 1) {
    const change = closes[index] - closes[index - 1]
    if (change > 0) {
      gain += change
    }
    else {
      loss -= change
    }
  }
  let averageGain = gain / period
  let averageLoss = loss / period
  values[period] = rsiFrom(averageGain, averageLoss)
  for (let index = period + 1; index < closes.length; index += 1) {
    const change = closes[index] - closes[index - 1]
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period
    values[index] = rsiFrom(averageGain, averageLoss)
  }
  return values
}

function rsiFrom(averageGain: number, averageLoss: number): number {
  if (averageGain === 0 && averageLoss === 0) {
    return FLAT_MIDPOINT
  }
  if (averageLoss === 0) {
    return 100
  }
  if (averageGain === 0) {
    return 0
  }
  return 100 - 100 / (1 + averageGain / averageLoss)
}

/** BOLL(mid, multiplier): simple moving average with population standard deviation, unclamped. */
export function bollSeries(closes: readonly number[], period = 20, multiplier = 2): BollSeries {
  if (!Number.isSafeInteger(period) || period < 1) {
    invalid()
  }
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new Error('BOLL 带宽倍数必须为正数')
  }
  const mid = trailingMean(closes, period)
  const upper: IndicatorPoint[] = []
  const lower: IndicatorPoint[] = []
  closes.forEach((_, index) => {
    const center = mid[index]
    if (center === null) {
      upper.push(null)
      lower.push(null)
      return
    }
    const window = closes.slice(index + 1 - period, index + 1)
    const deviation = Math.sqrt(window.reduce((sum, value) => sum + (value - center) ** 2, 0) / period)
    upper.push(center + deviation * multiplier)
    lower.push(center - deviation * multiplier)
  })
  return { upper, mid, lower }
}
