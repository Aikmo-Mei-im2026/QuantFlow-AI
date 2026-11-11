import type { DemoAccount, DemoCandle, DemoMarket } from '../src/lib/demo-execution.ts'
import assert from 'node:assert/strict'
// Node's built-in runner keeps these independent arithmetic checks dependency-free.
// eslint-disable-next-line test/no-import-node-test
import test from 'node:test'
import { advanceDemoDay, createDemoAccount, getDemoCandle, quoteDemoOrder, submitDemoOrder, valueDemoAccount } from '../src/lib/demo-execution.ts'

const dates = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06']

function candle(date: string, open: number, close = open, tradingStatus?: DemoCandle['tradingStatus']): DemoCandle {
  return { date, open, close, high: Math.max(open, close), low: Math.min(open, close), vol: 100_000, tradingStatus }
}

function fixture(): DemoMarket {
  return {
    dates,
    candlesBySymbol: {
      600036: [candle(dates[0], 10), candle(dates[1], 10, 11), candle(dates[2], 12, 13), candle(dates[3], 14)],
      '000858': dates.map(date => candle(date, 20)),
    },
  }
}

function order(state: DemoAccount, market: DemoMarket, code = '600036', side: 'buy' | 'sell' = 'buy', qty = 100): DemoAccount {
  const result = submitDemoOrder(state, market, { code, side, qty })
  assert.equal(result.error, null)
  return result.state
}

function advance(state: DemoAccount, market: DemoMarket): DemoAccount {
  const result = advanceDemoDay(state, market)
  assert.equal(result.error, null)
  return result.state
}

test('initial account is empty and worth exactly 100,000 yuan', () => {
  const account = createDemoAccount()
  assert.deepEqual(account, { dayIndex: 0, cashCents: 10_000_000, positions: [], orders: [], fills: [] })
  assert.deepEqual(valueDemoAccount(account, fixture()), { holdingsValueCents: 0, equityCents: 10_000_000, error: null })
})

test('buy on the next open, value on close, unlock next day and sell with independently checked cash', () => {
  const market = fixture()
  const initial = createDemoAccount()
  const pending = order(initial, market)
  assert.equal(initial.orders.length, 0)
  assert.equal(pending.cashCents, 10_000_000)
  assert.equal(pending.orders[0].submittedDate, dates[0])
  assert.equal(pending.orders[0].executeDate, dates[1])
  const bought = advance(pending, market)
  assert.equal(pending.orders[0].status, 'pending')
  // 10.00 + 5 bp -> 10.01, 100 shares + 5.00 commission = 1006.00.
  assert.equal(bought.fills[0].priceCents, 1001)
  assert.equal(bought.fills[0].amountCents, 100_100)
  assert.equal(bought.fills[0].feeCents, 500)
  assert.equal(bought.cashCents, 9_899_400)
  assert.equal(bought.positions[0].sellable, 0)
  assert.equal(bought.positions[0].costBasisCents, 100_600)
  assert.deepEqual(valueDemoAccount(bought, market), { holdingsValueCents: 110_000, equityCents: 10_009_400, error: null })
  const sellPending = order(bought, market, '600036', 'sell')
  assert.equal(sellPending.positions[0].sellable, 0)
  const sold = advance(sellPending, market)
  // 12.00 - 5 bp -> 11.99, 100 shares less 5.00 commission = 1194.00.
  assert.equal(sold.fills[0].priceCents, 1199)
  assert.equal(sold.cashCents, 10_018_800)
  assert.deepEqual(sold.positions, [])
  assert.equal(sold.fills.reduce((sum, fill) => sum + (fill.side === 'buy' ? -fill.amountCents - fill.feeCents : fill.amountCents - fill.feeCents), 10_000_000), sold.cashCents)
})

test('cash is exactly reproducible from rounded trade price and commission', () => {
  const market = fixture()
  market.candlesBySymbol['600036'] = dates.map(date => candle(date, 36.8))
  const state = { ...createDemoAccount(), cashCents: 3_128_050 }
  const next = advance(order(state, market, '600036', 'buy', 800), market)
  assert.equal(next.fills[0].priceCents, 3682)
  assert.equal(next.fills[0].feeCents, 884)
  assert.equal(next.cashCents, 181_566)
  assert.equal(next.cashCents, 3_128_050 - 3682 * 800 - 884)
})

test('holding value changes without trades and uses each symbol own close', () => {
  const market = fixture()
  const both = order(order(createDemoAccount(), market), market, '000858')
  const bought = advance(both, market)
  assert.equal(bought.fills.find(fill => fill.code === '000858')?.priceCents, 2001)
  assert.equal(valueDemoAccount(bought, market).holdingsValueCents, 310_000)
  const later = advance(bought, market)
  assert.equal(later.cashCents, bought.cashCents)
  assert.equal(valueDemoAccount(later, market).holdingsValueCents, 330_000)
  assert.equal(later.positions[0].sellable, 100)
})

test('pending orders cannot promise the same cash or shares twice', () => {
  const market = fixture()
  const small = { ...createDemoAccount(), cashCents: 150_000 }
  const pending = order(small, market)
  const denied = submitDemoOrder(pending, market, { code: '600036', side: 'buy', qty: 100 })
  assert.ok(denied.error)
  assert.strictEqual(denied.state, pending)
  const bought = advance(pending, market)
  const sell = order(bought, market, '600036', 'sell')
  const oversell = submitDemoOrder(sell, market, { code: '600036', side: 'sell', qty: 100 })
  assert.ok(oversell.error)
  assert.strictEqual(oversell.state, sell)
})

test('open price gap rejection changes no cash or held quantity', () => {
  const market = fixture()
  market.candlesBySymbol['600036'] = [candle(dates[0], 10), candle(dates[1], 20)]
  const small = { ...createDemoAccount(), cashCents: 150_000 }
  const next = advance(order(small, market), market)
  assert.equal(next.cashCents, 150_000)
  assert.deepEqual(next.positions, [])
  assert.equal(next.orders[0].status, 'rejected')
  assert.equal(next.fills[0].feeCents, 0)
})

test('invalid quantities, missing symbol, unsupported board and last-day orders reject without mutation', () => {
  const market = fixture()
  const state = createDemoAccount()
  for (const qty of [0, -100, 1, 100.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    const result = submitDemoOrder(state, market, { code: '600036', side: 'buy', qty })
    assert.ok(result.error)
    assert.strictEqual(result.state, state)
  }
  for (const code of ['600000', '300750', '688001']) {
    assert.ok(submitDemoOrder(state, market, { code, side: 'buy', qty: 100 }).error)
  }
  const ended = createDemoAccount(dates.length - 1)
  const result = submitDemoOrder(ended, market, { code: '600036', side: 'buy', qty: 100 })
  assert.ok(result.error)
  assert.strictEqual(result.state, ended)
  assert.strictEqual(advanceDemoDay(ended, market).state, ended)
})

test('missing or invalid bars do not borrow prices and missing valuation is explicit', () => {
  for (const bar of [null, candle(dates[1], -1), { ...candle(dates[1], 10), high: 9 }]) {
    const market = fixture()
    const pending = order(createDemoAccount(), market)
    market.candlesBySymbol['600036'] = [candle(dates[0], 10), ...(bar ? [bar] : [])]
    const result = advance(pending, market)
    assert.equal(result.cashCents, pending.cashCents)
    assert.equal(result.orders[0].status, 'rejected')
    assert.deepEqual(result.positions, [])
  }
  const market = fixture()
  const bought = advance(order(createDemoAccount(), market), market)
  market.candlesBySymbol['600036'] = [candle(dates[0], 10)]
  assert.equal(valueDemoAccount(bought, market).equityCents, null)
  assert.ok(valueDemoAccount(bought, market).error)
  assert.equal(getDemoCandle(market, '600036', dates[1]), null)
})

test('halts, limits and unsupported events reject the relevant daily execution', () => {
  for (const status of ['halted', 'limit-up', 'unsupported'] as const) {
    const market = fixture()
    market.candlesBySymbol['600036'] = [candle(dates[0], 10), candle(dates[1], 10, 10, status), candle(dates[2], 10), candle(dates[3], 10)]
    const rejected = advance(order(createDemoAccount(), market), market)
    assert.equal(rejected.orders[0].status, 'rejected')
    assert.equal(rejected.cashCents, 10_000_000)
  }
  const market = fixture()
  const bought = advance(order(createDemoAccount(), market), market)
  market.candlesBySymbol['600036'] = [candle(dates[0], 10), candle(dates[1], 10), candle(dates[2], 10, 10, 'limit-down'), candle(dates[3], 10)]
  const next = advance(order(bought, market, '600036', 'sell'), market)
  assert.equal(next.orders[1].status, 'rejected')
  assert.equal(next.cashCents, bought.cashCents)
  assert.equal(next.positions[0].qty, 100)
})

test('sells execute before buys and new shares stay locked on their purchase date', () => {
  const market = fixture()
  const bought = advance(order(createDemoAccount(), market), market)
  const repurchase = order(bought, market)
  const sellThenBuy = order(repurchase, market, '600036', 'sell')
  const next = advance(sellThenBuy, market)
  assert.deepEqual(next.fills.slice(0, 2).map(fill => fill.side), ['sell', 'buy'])
  assert.equal(next.positions[0].qty, 100)
  assert.equal(next.positions[0].sellable, 0)
})

test('quote rejects non-cent prices and unsafe totals; calendars reject duplicate or impossible dates', () => {
  assert.equal(quoteDemoOrder(1.001, 100, 'buy'), null)
  assert.equal(quoteDemoOrder(Number.MAX_SAFE_INTEGER, 100, 'buy'), null)
  const market = fixture()
  assert.ok(advanceDemoDay(createDemoAccount(), { ...market, dates: ['2026-08-03', '2026-08-03'] }).error)
  assert.ok(advanceDemoDay(createDemoAccount(), { ...market, dates: ['2026-02-30', '2026-03-02'] }).error)
})
