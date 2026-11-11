/** Inclusive trailing mean. Missing/non-finite inputs invalidate the whole window. */
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
