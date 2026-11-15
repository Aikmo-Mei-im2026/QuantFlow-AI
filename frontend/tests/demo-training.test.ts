import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test
import test from 'node:test'
import { assignedTrainingStart, drawTrainingIndex, drawTrainingInstrument, maskTrainingText, MIN_TRAINING_HISTORY_BARS, parseTrainingDataset, TRAINING_MASK, trainingStartIndices } from '../src/lib/demo-training.ts'

test('a run may open on any day that keeps the indicator warm-up behind it and one day to trade', () => {
  const indices = trainingStartIndices(42)
  assert.equal(indices[0], MIN_TRAINING_HISTORY_BARS - 1)
  assert.equal(indices.at(-1), 40)
  assert.equal(indices.length, 22)
  assert.deepEqual(indices.slice(0, 3), [19, 20, 21])
})

test('the sample is too short to open a run once no tradable day is left behind the warm-up', () => {
  assert.deepEqual(trainingStartIndices(20), [])
  assert.deepEqual(trainingStartIndices(0), [])
  assert.deepEqual(trainingStartIndices(21), [19])
})

test('a caller may widen the warm-up, which shifts the first openable day and can empty the list', () => {
  assert.deepEqual(trainingStartIndices(42, 30)?.slice(0, 2), [29, 30])
  assert.deepEqual(trainingStartIndices(30, 30), [])
})

test('the draw stays inside the pool for every random value the generator can return', () => {
  assert.equal(drawTrainingIndex(5, () => 0), 0)
  assert.equal(drawTrainingIndex(5, () => 0.5), 2)
  assert.equal(drawTrainingIndex(5, () => 0.999_999), 4)
  assert.equal(drawTrainingIndex(5, () => 1), 4)
})

test('an empty pool reports no draw instead of inventing a stock', () => {
  assert.equal(drawTrainingIndex(0, () => 0.4), null)
  assert.equal(drawTrainingIndex(-1, () => 0.4), null)
})

test('every stock in a five-strong pool can be drawn', () => {
  const drawn = new Set<number>()
  for (let i = 0; i < 200; i += 1) {
    const index = drawTrainingIndex(5, Math.random)
    assert.ok(index !== null && index >= 0 && index < 5)
    drawn.add(index)
  }
  assert.equal(drawn.size, 5)
})

test('a hidden run shows the mask for codes and names, a revealed one shows the truth', () => {
  assert.equal(maskTrainingText('600519', false), TRAINING_MASK)
  assert.equal(maskTrainingText('贵州茅台', false), TRAINING_MASK)
  assert.equal(maskTrainingText('600519', true), '600519')
  assert.equal(maskTrainingText('贵州茅台', true), '贵州茅台')
})

test('assigned mode never receives a mask for an unknown text', () => {
  assert.equal(maskTrainingText(undefined, false), '')
})

test('blind mode draws only stocks from the chosen source that cover the chosen date', () => {
  const stock = (code: string, dates: string[]) => ({
    code,
    name: code,
    candles: dates.map(date => ({ date, open: 6, high: 8, low: 5, close: 7, vol: 100 })),
  })
  const first = stock('000001', ['2025-01-03', '2025-01-06', '2025-01-07'])
  const second = stock('600036', ['2025-01-02', '2025-01-03', '2025-01-06', '2025-01-07'])
  const pool = [
    stock('600519', ['2025-01-06', '2025-01-07']),
    first,
    stock('600000', ['2025-01-02', '2025-01-03']),
    second,
  ]
  assert.deepEqual(drawTrainingInstrument(pool, '2025-01-04', () => 0), { instrument: first, day: 1 })
  assert.deepEqual(drawTrainingInstrument(pool, '2025-01-04', () => 0.99), { instrument: second, day: 2 })
  assert.equal(drawTrainingInstrument(pool, '2025-01-07', () => 0), null)
  assert.equal(drawTrainingInstrument(pool, '2025-01-01', () => 0), null)
})

test('import validates dates, OHLC, units and share volume before a round can use the file', () => {
  const bars = ['2025-01-03', '2025-01-06', '2025-01-07'].map(date => ({ date, open: 6, high: 8, low: 5, close: 7, vol: 100 }))
  const snapshot = {
    schema: 'quantflow-training-v1',
    source: 'Test fixture',
    collectedAt: '2025-01-10T08:01:00+08:00',
    priceBasis: 'unadjusted',
    volumeUnit: 'shares',
    instruments: [{ code: '000001', name: 'Fixture stock', candles: bars }],
  }
  const dataset = parseTrainingDataset(snapshot)
  assert.equal(assignedTrainingStart(dataset.instruments[0].candles, '2025-01-04'), 1)
  assert.equal(assignedTrainingStart(bars, '2025-01-07'), -1)
  assert.throws(() => parseTrainingDataset({ ...snapshot, volumeUnit: 'lots' }))
  for (const bar of [{ date: '2025-02-29' }, { high: 6 }, { vol: 1.5 }, { close: 6.002 }]) {
    assert.throws(() => parseTrainingDataset({
      ...snapshot,
      instruments: [{ ...snapshot.instruments[0], candles: [bars[0], { ...bars[1], ...bar }] }],
    }))
  }
})
