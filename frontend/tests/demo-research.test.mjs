import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
// The project uses the built-in Node test runner without an added test dependency.
// eslint-disable-next-line test/no-import-node-test
import test from 'node:test'
import {
  demoTrendWeights,
  mockCandidates,
  mockCandlesBySymbol,
  mockEquity,
  mockInitialFills,
  mockInitialOrders,
  mockLabSummary,
  mockPositions,
  mockReplayDates,
  mockSymbols,
  mockTrades,
  scoreDemoCandidate,
} from '../src/lib/mock-data.ts'

test('trend score matches independently calculated category and factor contributions', () => {
  assert.equal(Object.values(demoTrendWeights).reduce((sum, weight) => sum + weight, 0), 1)
  const moutai = mockCandidates.find(candidate => candidate.code === '600519')
  assert.equal(moutai.score, 71.5025)
  assert.deepEqual(moutai.contributions.map(category => Number(category.score.toFixed(2))), [71.55, 73.25, 60.9, 85, 74.2])
  assert.deepEqual(moutai.contributions.map(category => Number(category.value.toFixed(4))), [25.0425, 14.65, 12.18, 8.5, 11.13])
  assert.deepEqual(moutai.factors.map(factor => Number(factor.contribution.toFixed(4))), [12.985, 12.0575, 7.14, 7.51, 6.35, 5.83, 8.5, 11.13])
  for (const candidate of mockCandidates) {
    const displayedSum = candidate.factors.reduce((sum, factor) => sum + Number(factor.contribution.toFixed(4)), 0)
    assert.equal(displayedSum.toFixed(4), candidate.score.toFixed(4))
  }
})

test('invalid or missing factor values are rejected instead of becoming zero scores', () => {
  const example = mockCandidates[0]
  assert.throws(() => scoreDemoCandidate({ ...example, factors: [] }), /缺少类别/)
  for (const std of [Number.NaN, Number.POSITIVE_INFINITY, -1, 101]) {
    assert.throws(() => scoreDemoCandidate({ ...example, factors: example.factors.map((factor, index) => index ? factor : { ...factor, std }) }), /无效/)
  }
  assert.throws(() => scoreDemoCandidate({ ...example, factors: [...example.factors, { name: 'unknown', value: '0', std: 50, category: 'toString' }] }), /未知类别/)
})

test('all symbols have separate valid OHLC on the same ordered synthetic weekdays', () => {
  assert.equal(mockReplayDates.length, 42)
  assert.equal(mockReplayDates[0], '2026-08-03')
  assert.equal(mockReplayDates[41], '2026-09-29')
  assert.equal(new Set(mockReplayDates).size, 42)
  assert.deepEqual([...mockReplayDates].sort(), mockReplayDates)
  for (const symbol of mockSymbols) {
    const candles = mockCandlesBySymbol[symbol.code]
    assert.deepEqual(candles.map(candle => candle.date), mockReplayDates)
    for (const candle of candles) {
      assert.ok(candle.low > 0 && candle.vol > 0)
      assert.ok(candle.low <= Math.min(candle.open, candle.close))
      assert.ok(candle.high >= Math.max(candle.open, candle.close))
      assert.ok(![0, 6].includes(new Date(`${candle.date}T00:00:00Z`).getUTCDay()))
    }
  }
  assert.notDeepEqual(mockCandlesBySymbol['600519'], mockCandlesBySymbol['600036'])
  assert.equal(mockCandlesBySymbol.unknown, undefined)
})

test('synthetic dates and prices are identical in UTC and Asia/Shanghai', () => {
  const moduleUrl = new URL('../src/lib/mock-data.ts', import.meta.url).href
  const code = `import {mockReplayDates, mockCandlesBySymbol} from ${JSON.stringify(moduleUrl)}; process.stdout.write(JSON.stringify({mockReplayDates, mockCandlesBySymbol}))`
  const outputs = ['UTC', 'Asia/Shanghai'].map(TZ => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env: { ...process.env, TZ } })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout
  })
  assert.equal(outputs[0], outputs[1])
})

test('initial account fixtures contain no holdings or future order/fill history', () => {
  assert.deepEqual(mockPositions, [])
  assert.deepEqual(mockInitialOrders, [])
  assert.deepEqual(mockInitialFills, [])
})

test('independent trade examples match stated commission and visible date window', () => {
  assert.deepEqual(mockTrades.filter(trade => trade.status === 'filled').map(trade => trade.fee), [136.96, 22.25, 30.77])
  for (const trade of mockTrades) {
    assert.ok(trade.time.slice(0, 10) >= '2025-10-08' && trade.time.slice(0, 10) <= '2026-09-30')
  }
  assert.equal(mockEquity.nav[0], 100000)
  assert.equal(mockEquity.nav.at(-1), 105320)
  assert.equal(mockLabSummary.totalReturn, '+5.32%')
  assert.equal(mockLabSummary.maxDrawdown, '未提供')
  assert.equal(mockLabSummary.turnover, '未提供')
})
