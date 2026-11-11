/** Temporary, deterministic synthetic training rules. Real execution belongs in the backend. */
export interface DemoCandle {
  date: string
  open: number
  high: number
  low: number
  close: number
  vol: number
  tradingStatus?: 'normal' | 'halted' | 'limit-up' | 'limit-down' | 'unsupported'
}

export interface DemoMarket {
  dates: readonly string[]
  candlesBySymbol: Record<string, readonly DemoCandle[]>
}

export type DemoSide = 'buy' | 'sell'

export interface DemoPosition {
  code: string
  qty: number
  sellable: number
  costBasisCents: number
}

export interface DemoOrder {
  id: string
  code: string
  side: DemoSide
  qty: number
  status: 'pending' | 'filled' | 'rejected'
  submittedDate: string
  executeDate: string
  reason?: string
}

export interface DemoFill {
  orderId: string
  code: string
  side: DemoSide
  qty: number
  date: string
  priceCents: number
  feeCents: number
  amountCents: number
  status: 'filled' | 'rejected'
  reason: string
}

export interface DemoAccount {
  dayIndex: number
  cashCents: number
  positions: DemoPosition[]
  orders: DemoOrder[]
  fills: DemoFill[]
}

export interface DemoResult {
  state: DemoAccount
  error: string | null
}

export interface DemoQuote {
  priceCents: number
  amountCents: number
  feeCents: number
  totalCents: number
}

const INITIAL_CASH_CENTS = 10_000_000
const TEN_THOUSAND = BigInt(10_000)
const MAX_INTEGER = BigInt(Number.MAX_SAFE_INTEGER)

function safeNumber(value: bigint): number | null {
  return value >= BigInt(0) && value <= MAX_INTEGER ? Number(value) : null
}

function roundedRatio(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / BigInt(2)) / denominator
}

function priceInCents(price: number): number | null {
  if (!Number.isFinite(price) || price <= 0) {
    return null
  }
  const cents = Math.round(price * 100)
  if (!Number.isSafeInteger(cents) || cents <= 0 || Math.abs(price * 100 - cents) > 0.000001) {
    return null
  }
  return cents
}

function validQuantity(qty: number): boolean {
  return Number.isSafeInteger(qty) && qty > 0 && qty % 100 === 0
}

function supportedCode(code: string): boolean {
  return /^(?:60|00)\d{4}$/.test(code)
}

function marketError(state: DemoAccount, market: DemoMarket): string | null {
  if (!Number.isInteger(state.dayIndex) || state.dayIndex < 0 || state.dayIndex >= market.dates.length) {
    return '回放日期无效'
  }
  for (let i = 0; i < market.dates.length; i++) {
    const date = market.dates[i]
    const parsed = new Date(`${date}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date
      || (i > 0 && market.dates[i - 1] >= date)) {
      return '回放日期必须有效且严格递增'
    }
  }
  if (!Number.isSafeInteger(state.cashCents) || state.cashCents < 0) {
    return '账户金额无效'
  }
  return null
}

/** Reject missing, duplicate or malformed bars instead of borrowing another symbol's price. */
export function getDemoCandle(market: DemoMarket, code: string, date: string): DemoCandle | null {
  const matches = market.candlesBySymbol[code]?.filter(row => row.date === date) ?? []
  if (matches.length !== 1) {
    return null
  }
  const candle = matches[0]
  if ([candle.open, candle.high, candle.low, candle.close].some(price => priceInCents(price) === null)
    || candle.high < Math.max(candle.open, candle.close) || candle.low > Math.min(candle.open, candle.close)
    || !Number.isFinite(candle.vol) || candle.vol < 0) {
    return null
  }
  return candle
}

/** Apply 5 bp to the reference, round the fill price to cents, then calculate commission. */
export function quoteDemoOrder(referencePrice: number, qty: number, side: DemoSide): DemoQuote | null {
  const referenceCents = priceInCents(referencePrice)
  if (referenceCents === null || !validQuantity(qty) || (side !== 'buy' && side !== 'sell')) {
    return null
  }
  const price = roundedRatio(BigInt(referenceCents) * BigInt(side === 'buy' ? 10_005 : 9_995), TEN_THOUSAND)
  const amount = price * BigInt(qty)
  const commission = roundedRatio(amount * BigInt(3), TEN_THOUSAND)
  const fee = commission > BigInt(500) ? commission : BigInt(500)
  const total = side === 'buy' ? amount + fee : amount - fee
  const values = [price, amount, fee, total].map(safeNumber)
  if (values.includes(null) || price <= BigInt(0)) {
    return null
  }
  return { priceCents: values[0]!, amountCents: values[1]!, feeCents: values[2]!, totalCents: values[3]! }
}

export function createDemoAccount(dayIndex = 0): DemoAccount {
  return { dayIndex, cashCents: INITIAL_CASH_CENTS, positions: [], orders: [], fills: [] }
}

export function submitDemoOrder(
  state: DemoAccount,
  market: DemoMarket,
  input: { code: string, side: DemoSide, qty: number },
): DemoResult {
  const error = marketError(state, market)
  if (error) {
    return { state, error }
  }
  if (state.dayIndex === market.dates.length - 1) {
    return { state, error: '回放已结束，无法提交下一日委托' }
  }
  if (!supportedCode(input.code)) {
    return { state, error: '演示仅支持主板证券，其他板块规则尚未实现' }
  }
  if (!validQuantity(input.qty) || (input.side !== 'buy' && input.side !== 'sell')) {
    return { state, error: '数量须为安全范围内的正整数且为100股的整数倍' }
  }
  const date = market.dates[state.dayIndex]
  const candle = getDemoCandle(market, input.code, date)
  if (!candle) {
    return { state, error: '当前证券行情缺失或无效，不能提交委托' }
  }
  if (candle.tradingStatus === 'unsupported') {
    return { state, error: '当前行情包含演示尚未支持的交易规则' }
  }
  const quote = quoteDemoOrder(candle.close, input.qty, input.side)
  if (!quote) {
    return { state, error: '委托金额超出安全范围' }
  }
  if (input.side === 'buy') {
    let reserved = BigInt(0)
    for (const order of state.orders.filter(order => order.status === 'pending' && order.side === 'buy')) {
      const bar = getDemoCandle(market, order.code, date)
      const pendingQuote = bar && quoteDemoOrder(bar.close, order.qty, 'buy')
      if (!pendingQuote) {
        return { state, error: '待处理委托行情无效，先推进处理委托' }
      }
      reserved += BigInt(pendingQuote.totalCents)
    }
    if (reserved + BigInt(quote.totalCents) > BigInt(state.cashCents)) {
      return { state, error: '可用资金不足（已计入待买委托估算）' }
    }
  }
  else {
    const position = state.positions.find(position => position.code === input.code)
    const pendingQty = state.orders.filter(order => order.status === 'pending' && order.side === 'sell' && order.code === input.code)
      .reduce((sum, order) => sum + BigInt(order.qty), BigInt(0))
    // This is an order for tomorrow: today's acquired shares unlock before tomorrow's execution.
    if (!position || pendingQty + BigInt(input.qty) > BigInt(position.qty)) {
      return { state, error: '持仓数量不足（已扣除待卖委托）' }
    }
  }
  const order: DemoOrder = {
    id: `DEMO-${String(state.orders.length + 1).padStart(3, '0')}`,
    ...input,
    status: 'pending',
    submittedDate: date,
    executeDate: market.dates[state.dayIndex + 1],
  }
  return { state: { ...state, orders: [...state.orders, order] }, error: null }
}

export function advanceDemoDay(state: DemoAccount, market: DemoMarket): DemoResult {
  const error = marketError(state, market)
  if (error) {
    return { state, error }
  }
  if (state.dayIndex === market.dates.length - 1) {
    return { state, error: '回放已结束' }
  }
  const nextIndex = state.dayIndex + 1
  const date = market.dates[nextIndex]
  let cashCents = state.cashCents
  const positions = state.positions.map(position => ({ ...position, sellable: position.qty }))
  const orders = state.orders.map(order => ({ ...order }))
  const fills: DemoFill[] = []
  const pending = orders.filter(order => order.status === 'pending')
    .sort((a, b) => Number(a.side === 'buy') - Number(b.side === 'buy'))
  for (const order of pending) {
    const reject = (reason: string) => {
      order.status = 'rejected'
      order.reason = reason
      fills.push({ orderId: order.id, code: order.code, side: order.side, qty: order.qty, date, priceCents: 0, amountCents: 0, feeCents: 0, status: 'rejected', reason })
    }
    if (order.executeDate !== date || order.submittedDate >= date) {
      reject('委托日期与下一回放日不一致')
      continue
    }
    if (!supportedCode(order.code) || !validQuantity(order.qty)) {
      reject('不支持的证券或无效数量')
      continue
    }
    const candle = getDemoCandle(market, order.code, date)
    if (!candle) {
      reject('执行日行情缺失或无效')
      continue
    }
    if (candle.vol === 0 || candle.tradingStatus === 'halted' || candle.tradingStatus === 'unsupported'
      || (candle.tradingStatus === 'limit-up' && order.side === 'buy')
      || (candle.tradingStatus === 'limit-down' && order.side === 'sell')) {
      reject('停牌、价格限制或未支持的规则，本次委托不成交')
      continue
    }
    const quote = quoteDemoOrder(candle.open, order.qty, order.side)
    if (!quote) {
      reject('委托金额超出安全范围')
      continue
    }
    const position = positions.find(position => position.code === order.code)
    if (order.side === 'buy') {
      if (quote.totalCents > cashCents) {
        reject('开盘价格及费用对应的资金不足')
        continue
      }
      const nextQty = (position?.qty ?? 0) + order.qty
      const nextBasis = safeNumber(BigInt(position?.costBasisCents ?? 0) + BigInt(quote.totalCents))
      if (!Number.isSafeInteger(nextQty) || nextBasis === null) {
        reject('持仓超出安全范围')
        continue
      }
      cashCents -= quote.totalCents
      if (position) {
        position.qty = nextQty
        position.costBasisCents = nextBasis
      }
      else {
        positions.push({ code: order.code, qty: order.qty, sellable: 0, costBasisCents: quote.totalCents })
      }
    }
    else {
      if (!position || position.sellable < order.qty || position.qty < order.qty) {
        reject('T+1：可卖持仓不足')
        continue
      }
      const nextCash = safeNumber(BigInt(cashCents) + BigInt(quote.totalCents))
      if (nextCash === null) {
        reject('账户金额超出安全范围')
        continue
      }
      const releasedBasis = roundedRatio(BigInt(position.costBasisCents) * BigInt(order.qty), BigInt(position.qty))
      position.costBasisCents -= Number(releasedBasis)
      position.qty -= order.qty
      position.sellable -= order.qty
      cashCents = nextCash
    }
    order.status = 'filled'
    order.reason = '按下一样例日开盘价及5bp滑点成交；佣金0.03%，最低5元'
    fills.push({ orderId: order.id, code: order.code, side: order.side, qty: order.qty, date, ...quote, status: 'filled', reason: order.reason })
  }
  return { state: { dayIndex: nextIndex, cashCents, positions: positions.filter(position => position.qty > 0), orders, fills: [...fills, ...state.fills] }, error: null }
}

export function valueDemoAccount(state: DemoAccount, market: DemoMarket): {
  holdingsValueCents: number | null
  equityCents: number | null
  error: string | null
} {
  const invalid = marketError(state, market)
  if (invalid) {
    return { holdingsValueCents: null, equityCents: null, error: invalid }
  }
  let holdings = BigInt(0)
  for (const position of state.positions) {
    const candle = getDemoCandle(market, position.code, market.dates[state.dayIndex])
    const price = candle && priceInCents(candle.close)
    if (!price) {
      return { holdingsValueCents: null, equityCents: null, error: `${position.code}当日收盘行情缺失或无效，无法估值` }
    }
    holdings += BigInt(price) * BigInt(position.qty)
  }
  const holdingsValueCents = safeNumber(holdings)
  const equityCents = safeNumber(holdings + BigInt(state.cashCents))
  if (holdingsValueCents === null || equityCents === null) {
    return { holdingsValueCents: null, equityCents: null, error: '估值超出安全范围' }
  }
  return { holdingsValueCents, equityCents, error: null }
}
