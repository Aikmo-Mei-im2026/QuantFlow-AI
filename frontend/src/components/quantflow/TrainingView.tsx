'use client'

import type { DemoAccount, DemoSide } from '@/lib/demo-execution'
import { useEffect, useReducer, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/hooks'
import { advanceDemoDay, createDemoAccount, getDemoCandle, quoteDemoOrder, submitDemoOrder, valueDemoAccount } from '@/lib/demo-execution'
import { mockCandlesBySymbol, mockReplayDates, mockSymbols } from '@/lib/mock-data'
import { DataStatusLine, DemoBadge, SideLabel, StatusBadge } from './shared'
import TrainingChart from './TrainingChart'

const TABS = ['positions', 'orders', 'fills'] as const
const market = { dates: mockReplayDates, candlesBySymbol: mockCandlesBySymbol }
const supportedSymbols = mockSymbols.filter(item => /^(?:60|00)\d{4}$/.test(item.code))
const INITIAL_DAY = 19
type Action = { type: 'advance' | 'reset' | 'clear' } | { type: 'submit', code: string, side: DemoSide, qty: number }
interface Session { account: DemoAccount, error: string | null, accepted: boolean }
function reduceSession(session: Session, action: Action): Session {
  if (action.type === 'reset') {
    return { account: createDemoAccount(INITIAL_DAY), error: null, accepted: false }
  }
  if (action.type === 'clear') {
    return { ...session, error: null, accepted: false }
  }
  const result = action.type === 'advance'
    ? advanceDemoDay(session.account, market)
    : submitDemoOrder(session.account, market, action as Extract<Action, { type: 'submit' }>)
  return { account: result.state, error: result.error, accepted: action.type === 'submit' && result.error === null }
}
function formatMoney(v: number) {
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TrainingView() {
  const { t } = useLocale()
  const [session, dispatch] = useReducer(reduceSession, undefined, () => ({ account: createDemoAccount(INITIAL_DAY), error: null, accepted: false }))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [tab, setTab] = useState<(typeof TABS)[number]>('positions')
  const [symbol, setSymbol] = useState('600036')
  const [side, setSide] = useState<DemoSide>('buy')
  const [qty, setQty] = useState('100')
  const { account, error } = session
  const currentDate = mockReplayDates[account.dayIndex]
  const current = getDemoCandle(market, symbol, currentDate)
  const ended = account.dayIndex === mockReplayDates.length - 1
  const quote = current && quoteDemoOrder(current.close, Number(qty), side)
  const valuation = valueDemoAccount(account, market)
  const visibleCandles = (mockCandlesBySymbol[symbol] ?? []).filter(candle => candle.date <= currentDate)
  const positions = account.positions.map(p => ({ ...p, name: mockSymbols.find(item => item.code === p.code)?.name, cost: p.costBasisCents / p.qty / 100 }))
  const orders = account.orders.map(order => ({ ...order, time: order.submittedDate }))
  const fills = account.fills.map(fill => ({ ...fill, time: fill.date, price: fill.priceCents / 100, fee: fill.feeCents / 100 }))
  const submit = () => {
    setPlaying(false)
    dispatch({ type: 'submit', code: symbol, side, qty: Number(qty) })
  }
  const advance = () => {
    setPlaying(false)
    dispatch({ type: 'advance' })
  }
  const reset = () => {
    setPlaying(false)
    dispatch({ type: 'reset' })
  }
  const pnl = valuation.equityCents === null ? null : valuation.equityCents - 10_000_000
  const progress = Math.round((account.dayIndex - INITIAL_DAY) / (mockReplayDates.length - 1 - INITIAL_DAY) * 100)
  useEffect(() => {
    if (!playing || ended) {
      return
    }
    const timer = setInterval(dispatch, 1500 / speed, { type: 'advance' })
    return () => clearInterval(timer)
  }, [playing, speed, ended])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || target?.closest('input, select, textarea, button, [role=combobox], [contenteditable=true]')) {
        return
      }
      if (event.code === 'Space') {
        event.preventDefault()
        setPlaying(false)
        dispatch({ type: 'advance' })
      }
      if (event.key.toLowerCase() === 'b' || event.key.toLowerCase() === 's') {
        setPlaying(false)
        setSide(event.key.toLowerCase() === 'b' ? 'buy' : 'sell')
        dispatch({ type: 'clear' })
      }
    }
    const hidden = () => {
      if (document.hidden) {
        setPlaying(false)
      }
    }
    window.addEventListener('keydown', keydown)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('keydown', keydown)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{ t('quantflow.training.title') }</h1>
        <DemoBadge />
      </div>
      <DataStatusLine date={currentDate} version="synthetic-ohlc-v2" />

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[190px_minmax(0,1fr)_280px]">
        <aside className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2 xl:col-span-1">
          <h2 className="text-sm font-semibold">{ t('quantflow.training.accountTitle') }</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-1">
            {[
              [t('quantflow.training.equityLabel'), valuation.equityCents],
              [t('quantflow.training.cashLabel'), account.cashCents],
              [t('quantflow.training.marketValue'), valuation.holdingsValueCents],
              [t('quantflow.training.totalPnl'), pnl],
            ].map(([label, cents]) => (
              <div key={String(label)}>
                <dt className="text-xs text-muted-foreground">{ label }</dt>
                <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">{ cents === null ? '—' : `¥${formatMoney(Number(cents) / 100)}` }</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 border-t pt-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{ t('quantflow.training.progress') }</span>
              <span>
                { progress }
                %
              </span>
            </div>
            <progress className="mt-2 h-1.5 w-full accent-blue-600" value={progress} max={100} aria-label={t('quantflow.training.progress')} />
            <Button variant="outline" className="mt-4 w-full" onClick={reset}>{ t('quantflow.training.reset') }</Button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{ t('quantflow.training.shortcuts') }</p>
        </aside>
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-4">
              <span className="text-sm text-muted-foreground">
                { t('quantflow.training.replayLabel') }
                ：
                <span className="font-mono font-semibold text-foreground">{ currentDate }</span>
              </span>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  { t('quantflow.training.cashLabel') }
                  ：
                  <span className="font-mono text-foreground">
                    ¥
                    { formatMoney(account.cashCents / 100) }
                  </span>
                </span>
                <span className="text-muted-foreground">
                  { t('quantflow.training.equityLabel') }
                  ：
                  <span className="font-mono text-foreground">
                    ¥
                    { valuation.equityCents === null ? t('quantflow.training.unavailable') : formatMoney(valuation.equityCents / 100) }
                  </span>
                </span>
              </div>
              <Button onClick={advance} disabled={ended}>
                { t('quantflow.training.nextDay') }
              </Button>
            </div>
            <div className="mb-2 text-xs text-muted-foreground">
              { symbol }
              {' '}
              ·
              {' '}
              { supportedSymbols.find(item => item.code === symbol)?.name }
              {' '}
              ·
              {' '}
              { currentDate }
            </div>
            { visibleCandles.length > 0 && <TrainingChart key={symbol} candles={visibleCandles} fills={account.fills.filter(fill => fill.code === symbol)} /> }
            { valuation.error && <p role="alert" className="mt-2 text-sm text-red-600">{ valuation.error }</p> }
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex gap-1 border-b pb-2 text-sm">
              { TABS.map(item => (
                <button
                  key={item}
                  type="button"
                  className={`rounded-md px-3 py-1.5 ${tab === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
                  onClick={() => setTab(item)}
                >
                  { t(`quantflow.training.tabs.${item}`) }
                </button>
              )) }
            </div>

            { tab === 'positions' && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.training.positions.code') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.training.positions.qty') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.training.positions.cost') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.training.positions.sellable') }</th>
                    </tr>
                  </thead>
                  <tbody>
                    { positions.length === 0 && <tr><td colSpan={4} className="py-4 text-muted-foreground">{ t('quantflow.training.emptyPositions') }</td></tr> }
                    { positions.map(p => (
                      <tr key={p.code} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono">
                          { p.code }
                          {' '}
                          ·
                          {' '}
                          { p.name }
                        </td>
                        <td className="py-2 pr-4 font-mono">{ p.qty }</td>
                        <td className="py-2 pr-4 font-mono">{ p.cost.toFixed(2) }</td>
                        <td className="py-2 pr-4 font-mono">{ p.sellable }</td>
                      </tr>
                    )) }
                  </tbody>
                </table>
              </div>
            ) }

            { tab === 'orders' && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.training.orders.code') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.training.orders.side') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.training.orders.qty') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.training.orders.status') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.training.orders.time') }</th>
                    </tr>
                  </thead>
                  <tbody>
                    { orders.length === 0 && (
                      <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">{ t('quantflow.common.empty') }</td></tr>
                    ) }
                    { orders.map(o => (
                      <tr key={o.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono">{ o.code }</td>
                        <td className="py-2 pr-4"><SideLabel side={o.side} /></td>
                        <td className="py-2 pr-4 font-mono">{ o.qty }</td>
                        <td className="py-2 pr-4"><StatusBadge status={o.status} /></td>
                        <td className="py-2 pr-4 font-mono">{ o.time }</td>
                      </tr>
                    )) }
                  </tbody>
                </table>
              </div>
            ) }

            { tab === 'fills' && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.time') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.code') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.side') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.price') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.qty') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.training.feeLabel') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.status') }</th>
                      <th className="py-2 pr-4 font-medium">{ t('quantflow.lab.table.reason') }</th>
                    </tr>
                  </thead>
                  <tbody>
                    { fills.length === 0 && <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">{ t('quantflow.common.empty') }</td></tr> }
                    { fills.map(row => (
                      <tr key={row.orderId} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono">{ row.time }</td>
                        <td className="py-2 pr-4 font-mono">{ row.code }</td>
                        <td className="py-2 pr-4"><SideLabel side={row.side} /></td>
                        <td className="py-2 pr-4 font-mono">{ row.price > 0 ? row.price.toFixed(2) : '—' }</td>
                        <td className="py-2 pr-4 font-mono">{ row.qty }</td>
                        <td className="py-2 pr-4 font-mono">{ row.status === 'filled' ? row.fee.toFixed(2) : '—' }</td>
                        <td className="py-2 pr-4"><StatusBadge status={row.status} /></td>
                        <td className="py-2 pr-4 text-muted-foreground">{ row.reason }</td>
                      </tr>
                    )) }
                  </tbody>
                </table>
              </div>
            ) }
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">{ t('quantflow.training.playback') }</h2>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" disabled={ended} onClick={() => setPlaying(value => !value)}>{ t(playing && !ended ? 'quantflow.training.pause' : 'quantflow.training.play') }</Button>
            <select aria-label={t('quantflow.training.speed')} className="rounded-md border bg-background px-2 text-sm" value={speed} onChange={event => setSpeed(Number(event.target.value))}>
              {[0.5, 1, 2].map(value => (
                <option key={value} value={value}>
                  {value}
                  ×
                </option>
              ))}
            </select>
          </div>
          <p className="my-4 border-b pb-4 text-xs leading-relaxed text-muted-foreground">{ t('quantflow.training.nextOpen') }</p>
          <h2 className="text-sm font-semibold">{ t('quantflow.training.order.title') }</h2>

          <div className="mt-3 space-y-3">
            <div>
              <Label htmlFor="qf-order-symbol">{ t('quantflow.training.order.symbol') }</Label>
              <select
                id="qf-order-symbol"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                value={symbol}
                onChange={e => {
                  setSymbol(e.target.value)
                  setPlaying(false)
                  dispatch({ type: 'clear' })
                }}
              >
                { supportedSymbols.map(s => (
                  <option key={s.code} value={s.code}>
                    { s.code }
                    {' '}
                    ·
                    {' '}
                    { s.name }
                  </option>
                )) }
              </select>
            </div>

            <div>
              <Label>{ t('quantflow.training.order.side') }</Label>
              <div className="mt-1 flex rounded-md border border-input p-0.5 text-sm">
                { (['buy', 'sell'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`flex-1 rounded px-3 py-1.5 ${side === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                    onClick={() => {
                      setSide(s)
                      setPlaying(false)
                      dispatch({ type: 'clear' })
                    }}
                  >
                    { t(`quantflow.common.side${s === 'buy' ? 'Buy' : 'Sell'}`) }
                  </button>
                )) }
              </div>
            </div>

            <div>
              <Label htmlFor="qf-order-qty">{ t('quantflow.training.order.qty') }</Label>
              <Input
                id="qf-order-qty"
                type="number"
                step={100}
                className="mt-1"
                value={qty}
                onChange={e => {
                  setQty(e.target.value)
                  setPlaying(false)
                  dispatch({ type: 'clear' })
                }}
              />
            </div>

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{ t('quantflow.training.order.price') }</span>
              <span className="font-mono">
                ¥
                { current ? current.close.toFixed(2) : '—' }
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{ t('quantflow.training.order.fee') }</span>
              <span className="font-mono">
                ¥
                { quote ? (quote.feeCents / 100).toFixed(2) : '—' }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{ t(side === 'buy' ? 'quantflow.training.estimatedBuy' : 'quantflow.training.estimatedSell') }</span>
              <span className="font-mono font-semibold">
                ¥
                { quote ? formatMoney(quote.totalCents / 100) : '—' }
              </span>
            </div>

            { error && <p role="alert" className="text-sm text-red-600">{ error }</p> }
            { session.accepted && <p role="status" className="text-sm text-primary">{ t('quantflow.training.accepted') }</p> }
            { ended && <p role="status" className="text-sm text-muted-foreground">{ t('quantflow.training.ended') }</p> }

            <Button className="w-full" onClick={submit} disabled={ended || !current || !quote}>{ t('quantflow.training.order.submit') }</Button>
            <details className="text-xs leading-relaxed text-muted-foreground">
              <summary className="cursor-pointer">{ t('quantflow.training.rulesSummary') }</summary>
              <p className="mt-2">{ t('quantflow.training.notice') }</p>
            </details>
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        { t('quantflow.training.reference') }
        {' '}
        <a className="underline" href="https://github.com/fat7/KLinePlayground" target="_blank" rel="noreferrer">KLinePlayground</a>
      </p>
    </div>
  )
}
