import type { Candle } from '../src/lib/mock-data.ts'
import assert from 'node:assert/strict'
// Node's built-in runner keeps these arithmetic checks dependency-free.
// eslint-disable-next-line test/no-import-node-test
import test from 'node:test'
import { bollSeries, emaSeries, kdjSeries, macdSeries, rsiSeries } from '../src/lib/demo-indicators.ts'
import { mockCandles } from '../src/lib/mock-data.ts'

function assertPoints(actual: (number | null)[], expected: (number | null)[], tolerance = 1e-12) {
  assert.equal(actual.length, expected.length)
  expected.forEach((value, index) => {
    const item = actual[index]
    if (value === null) {
      assert.equal(item, null, `${index} 应为窗口不足`)
      return
    }
    if (item === null || Number.isNaN(item) || Math.abs(item - value) > tolerance) {
      assert.fail(`${index} 期望 ${value}，实际 ${item}`)
    }
  })
}

function flatCandle(index: number, price: number): Candle {
  return { date: `d${index}`, open: price, high: price, low: price, close: price, vol: 100_000 }
}

test('EMA 以首个有效值起种并按 2/(period+1) 递推', () => {
  assertPoints(emaSeries([1, 2, 3], 2), [1, 5 / 3, 23 / 9])
  assertPoints(emaSeries([7], 5), [7])
})

test('EMA 遇到无效输入输出 null 并重置起种', () => {
  assertPoints(emaSeries([1, null, 4, 5], 2), [1, null, 4, 14 / 3])
  assert.throws(() => emaSeries([1], 0), /正整数/)
})

test('MACD 在常数序列上三线均为 0', () => {
  const { dif, dea, hist } = macdSeries([10, 10, 10, 10, 10], 2, 4, 2)
  assertPoints(dif, [0, 0, 0, 0, 0])
  assertPoints(dea, [0, 0, 0, 0, 0])
  assertPoints(hist, [0, 0, 0, 0, 0])
})

test('MACD 在 1/2/1 参数下等于快慢 EMA 之差且柱为 0', () => {
  const { dif, dea, hist } = macdSeries([1, 2, 3], 1, 2, 1)
  assertPoints(dif, [0, 1 / 3, 4 / 9])
  assertPoints(dea, [0, 1 / 3, 4 / 9])
  assertPoints(hist, [0, 0, 0])
  assert.throws(() => macdSeries([1], 26, 12, 9), /快线/)
})

test('RSI 首值按 14 个涨跌差的均值给出 100−200/7', () => {
  const closes = [10, 11, 10, 11, 12, 11, 12, 13, 12, 13, 14, 13, 14, 15, 16]
  const values = rsiSeries(closes, 14)
  assert.equal(values.length, closes.length)
  assertPoints(values.slice(0, 14), closes.slice(0, 14).map(() => null))
  assertPoints(values.slice(14), [100 - 200 / 7])
})

test('RSI 单边与横盘分别收敛到 100、0、50', () => {
  const up = Array.from({ length: 20 }, (_, index) => 10 + index)
  const down = Array.from({ length: 20 }, (_, index) => 30 - index)
  const flat = Array.from<number>({ length: 20 }).fill(10)
  assert.equal(rsiSeries(up, 14)[19], 100)
  assert.equal(rsiSeries(down, 14)[19], 0)
  assert.equal(rsiSeries(flat, 14)[19], 50)
  assert.equal(rsiSeries(up, 14).filter(value => value !== null).length, 6)
})

test('KDJ 用 9 日 RSV、50 起步的 1/3 平滑得到 200/3、500/9、800/9', () => {
  const candles = Array.from({ length: 9 }, (_, index) => ({
    date: `d${index}`,
    open: 9,
    high: 10,
    low: 0,
    close: 10,
    vol: 1,
  }))
  const { k, d, j } = kdjSeries(candles, 9)
  assertPoints(k.slice(0, 8), Array.from<number | null>({ length: 8 }).fill(null))
  assertPoints(k.slice(8), [200 / 3])
  assertPoints(d.slice(8), [500 / 9])
  assertPoints(j.slice(8), [800 / 9])
})

test('KDJ 无波动窗口退回 50 中轴', () => {
  const { k, d, j } = kdjSeries(Array.from({ length: 9 }, (_, index) => flatCandle(index, 5)), 9)
  assertPoints([k[8], d[8], j[8]], [50, 50, 50])
})

test('BOLL 使用总体标准差且窗口不足为 null', () => {
  const { mid, upper, lower } = bollSeries([1, 2, 3, 4, 5], 3, 2)
  const deviation = Math.sqrt(2 / 3)
  assertPoints(mid, [null, null, 2, 3, 4])
  assertPoints(upper, [null, null, 2 + 2 * deviation, 3 + 2 * deviation, 4 + 2 * deviation])
  assertPoints(lower, [null, null, 2 - 2 * deviation, 3 - 2 * deviation, 4 - 2 * deviation])
})

test('BOLL 常数序列三线重合', () => {
  const { mid, upper, lower } = bollSeries([8, 8, 8, 8], 3, 2)
  assertPoints([mid[3], upper[3], lower[3]], [8, 8, 8])
})

test('42 根合成样例上的预热长度与页面提示一致', () => {
  assert.equal(mockCandles.length, 42)
  const closes = mockCandles.map(candle => candle.close)
  const macd = macdSeries(closes)
  const kdj = kdjSeries(mockCandles)
  const rsi = rsiSeries(closes)
  const boll = bollSeries(closes)
  assert.equal(macd.dif.filter(value => value !== null).length, 42)
  assert.equal(kdj.k.filter(value => value !== null).length, 34)
  assert.equal(rsi.filter(value => value !== null).length, 28)
  assert.equal(boll.mid.filter(value => value !== null).length, 23)
  const bounded = (values: (number | null)[]) => values.every(value => value === null || (value >= 0 && value <= 100))
  assert.ok(bounded(kdj.k))
  assert.ok(bounded(kdj.d))
  assert.ok(bounded(rsi))
  assert.ok(boll.upper.every((value, index) => value === null || boll.lower[index] === null || value >= (boll.lower[index] as number)))
})
