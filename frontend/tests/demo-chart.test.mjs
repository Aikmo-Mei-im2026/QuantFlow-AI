import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test
import test from 'node:test'
import { aggregateTrainingWeeks, trailingMean } from '../src/lib/demo-chart.ts'

test('moving averages use only an inclusive trailing window and preserve warmup nulls', () => {
  assert.deepEqual(trailingMean([2, 4, 6, 10, 100], 3), [null, null, 4, 20 / 3, 116 / 3])
  assert.deepEqual(trailingMean([2, 4, 6], 3), trailingMean([2, 4, 6, 10, 100], 3).slice(0, 3))
  assert.deepEqual(trailingMean([10, 20], 5), [null, null])
})

test('invalid inputs invalidate only their windows and bad periods are rejected', () => {
  assert.deepEqual(trailingMean([2, Number.NaN, 6, 8], 2), [null, null, null, 7])
  assert.deepEqual(trailingMean([], 5), [])
  assert.throws(() => trailingMean([1, 2], 0))
  assert.throws(() => trailingMean([1, 2], 1.5))
})

test('a weekly candle includes only revealed days, including around a year boundary', () => {
  const bars = [
    { date: '2025-12-26', open: 6, high: 9, low: 5, close: 8, vol: 100 },
    { date: '2025-12-29', open: 8, high: 10, low: 7, close: 9, vol: 200 },
    { date: '2026-01-02', open: 9, high: 12, low: 8, close: 11, vol: 400 },
    { date: '2026-01-05', open: 11, high: 13, low: 10, close: 12, vol: 800 },
  ]
  assert.deepEqual(aggregateTrainingWeeks(bars.slice(0, 2)), bars.slice(0, 2))
  assert.deepEqual(aggregateTrainingWeeks(bars), [
    bars[0],
    { date: '2026-01-02', open: 8, high: 12, low: 7, close: 11, vol: 600 },
    bars[3],
  ])
  assert.equal(bars[1].close, 9)
})
