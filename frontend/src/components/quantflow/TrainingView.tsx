'use client'

import type { TrainingPools } from './TrainingSetup'
import type { DemoAccount, DemoMarket, DemoSide } from '@/lib/demo-execution'
import type { TrainingDataset, TrainingInstrument, TrainingMode } from '@/lib/demo-training'
import { useEffect, useReducer, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDemoProfile, useLocale } from '@/hooks'
import { advanceDemoDay, createDemoAccount, DEMO_INITIAL_CASH_CENTS, getDemoCandle, quoteDemoOrder, replayDemoEquity, submitDemoOrder, valueDemoAccount } from '@/lib/demo-execution'
import { readDemoProfile } from '@/lib/demo-profile'
import { isTrainingCode, maskTrainingText, parseTrainingDataset } from '@/lib/demo-training'
import { mockSymbols, syntheticCandlesBySymbol, syntheticReplayDates } from '@/lib/mock-data'
import { AccountEquityChart } from './charts'
import { DemoBadge, SideLabel, StatusBadge } from './shared'
import TrainingChart from './TrainingChart'
import TrainingSetup from './TrainingSetup'

const TABS = ['positions', 'orders', 'fills'] as const
const demoSymbols = [
  ...mockSymbols.filter(item => isTrainingCode(item.code)),
  { code: '000001', name: '平安银行', close: 11.2 },
]
const demoCandles = syntheticCandlesBySymbol(demoSymbols, syntheticReplayDates('2025-06-30', 320))
const demoDataset: TrainingDataset = {
  source: 'synthetic-ohlc-v3',
  collectedAt: '',
  instruments: demoSymbols.map(({ code, name }) => ({ code, name, candles: demoCandles[code] })),
}
const defaultInstrument = demoDataset.instruments.find(item => item.code === '600036')!
const DEFAULT_START_DAY = 99
// eslint-disable-next-line node/prefer-global/process -- Next.js inlines the public build flag in the browser bundle.
const ENABLE_SITE_DATA = process.env.NEXT_PUBLIC_TRAINING_SNAPSHOT === '1'

interface Round {
  mode: TrainingMode
  dataset: TrainingDataset
  instrument: TrainingInstrument
  startDayIndex: number
  endDayIndex: number
  initialCashCents: number
}
type Action = { type: 'advance' | 'reset' | 'clear' | 'reveal' } | { type: 'submit', code: string, side: DemoSide, qty: number } | { type: 'start', round: Round }
interface Session {
  round: Round
  market: DemoMarket
  id: number
  account: DemoAccount
  error: string | null
  accepted: boolean
  revealed: boolean
}

function createSession(round: Round, id = 0): Session {
  const candles = round.instrument.candles.slice(0, round.endDayIndex + 1)
  return {
    round,
    market: { dates: candles.map(bar => bar.date), candlesBySymbol: { [round.instrument.code]: candles } },
    id,
    account: createDemoAccount(round.startDayIndex, round.initialCashCents),
    error: null,
    accepted: false,
    revealed: false,
  }
}

function createRound(dataset = demoDataset, instrument = defaultInstrument, startDayIndex = DEFAULT_START_DAY, initialCashCents = DEMO_INITIAL_CASH_CENTS, mode: TrainingMode = 'assigned'): Round {
  return { mode, dataset, instrument, startDayIndex, endDayIndex: instrument.candles.length - 1, initialCashCents }
}

function reduceSession(session: Session, action: Action): Session {
  if (action.type === 'start') {
    return createSession(action.round, session.id + 1)
  }
  if (action.type === 'reset') {
    return createSession(session.round, session.id + 1)
  }
  if (action.type === 'reveal') {
    return { ...session, revealed: true, error: null, accepted: false }
  }
  if (action.type === 'clear') {
    return { ...session, error: null, accepted: false }
  }
  if (session.revealed || session.account.dayIndex >= session.round.endDayIndex) {
    return session
  }
  const result = action.type === 'advance'
    ? advanceDemoDay(session.account, session.market)
    : submitDemoOrder(session.account, session.market, action as Extract<Action, { type: 'submit' }>)
  return { ...session, account: result.state, error: result.error, accepted: action.type === 'submit' && result.error === null }
}
function formatMoney(v: number) {
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TrainingView() {
  const { t } = useLocale()
  const [session, dispatch] = useReducer(reduceSession, undefined, () => createSession(createRound()))
  const [setupMode, setSetupMode] = useState<TrainingMode>('assigned')
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [tab, setTab] = useState<(typeof TABS)[number]>('positions')
  const [side, setSide] = useState<DemoSide>('buy')
  const [qty, setQty] = useState('100')
  const profile = useDemoProfile()
  const [pools, setPools] = useState<TrainingPools>({ demo: demoDataset, site: null, local: null })
  const [siteDataError, setSiteDataError] = useState(false)
  const { account, error, market, round } = session
  const { mode, instrument, dataset, startDayIndex, endDayIndex } = round
  const showRound = mode === setupMode
  const blind = mode === 'blind'
  const ended = account.dayIndex === endDayIndex
  // Reveal is either the practitioner ending the round or the sample running out; assigned mode is never hidden.
  const revealed = !blind || session.revealed || ended
  const locked = blind && session.revealed
  const stopped = ended || locked || !showRound
  const activeCode = instrument.code
  const currentDate = market.dates[account.dayIndex]
  const current = getDemoCandle(market, activeCode, currentDate)
  const previous = instrument.candles[account.dayIndex - 1]
  const change = current && previous ? (current.close / previous.close - 1) * 100 : null
  const instrumentLabel = `${maskTrainingText(instrument.name, revealed)} · ${maskTrainingText(activeCode, revealed)}`
  const capital = profile?.initialCashCents ?? DEMO_INITIAL_CASH_CENTS
  const quote = current && quoteDemoOrder(current.close, Number(qty), side)
  const valuation = valueDemoAccount(account, market)
  // The curve starts where this exercise starts; the earlier bars are only the observation window.
  const equityPoints = replayDemoEquity(account, market).points.slice(startDayIndex)
  const latestEquity = equityPoints.at(-1)?.equityCents ?? null
  const equityChange = latestEquity === null ? null : latestEquity - account.initialCashCents
  const equityGaps = equityPoints.filter(point => point.reason !== null)
  const visibleCandles = instrument.candles.slice(0, account.dayIndex + 1)
  const positions = account.positions.map(p => ({ ...p, name: instrument.name, cost: p.costBasisCents / p.qty / 100 }))
  const orders = account.orders.map(order => ({ ...order, time: order.submittedDate }))
  const fills = account.fills.map(fill => ({ ...fill, time: fill.date, price: fill.priceCents / 100, fee: fill.feeCents / 100 }))
  const submit = () => {
    setPlaying(false)
    dispatch({ type: 'submit', code: activeCode, side, qty: Number(qty) })
  }
  const advance = () => {
    setPlaying(false)
    dispatch({ type: 'advance' })
  }
  const reset = () => {
    setPlaying(false)
    dispatch({ type: 'reset' })
  }
  const startRound = (next: Round) => {
    setPlaying(false)
    dispatch({ type: 'start', round: next })
  }
  const pnl = valuation.equityCents === null ? null : valuation.equityCents - account.initialCashCents
  const progress = Math.round((account.dayIndex - startDayIndex) / (endDayIndex - startDayIndex) * 100)
  // The profile is browser state, so the account is rebased after mount rather than during rendering.
  // A later change from another tab only renames the practitioner; it never discards a running session.
  useEffect(() => {
    const stored = readDemoProfile(window.localStorage)
    if (stored) {
      dispatch({ type: 'start', round: createRound(demoDataset, defaultInstrument, DEFAULT_START_DAY, stored.initialCashCents) })
    }
  }, [])
  useEffect(() => {
    if (!ENABLE_SITE_DATA) {
      return
    }
    const controller = new AbortController()
    void fetch('/market-data/training.json', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Missing site snapshot')
        }
        const data = parseTrainingDataset(await response.json())
        setPools(previous => ({ ...previous, site: data }))
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSiteDataError(true)
        }
      })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!playing || stopped) {
      return
    }
    const timer = setInterval(dispatch, 1000 * speed, { type: 'advance' })
    return () => clearInterval(timer)
  }, [playing, speed, stopped])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || target?.closest('input, select, textarea, button, [role=combobox], [contenteditable=true]')) {
        return
      }
      if (event.code === 'Space') {
        event.preventDefault()
        setPlaying(false)
        if (!stopped) {
          dispatch({ type: 'advance' })
        }
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
  }, [stopped])

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{ t('quantflow.training.title') }</h1>
        {showRound && (dataset === demoDataset
          ? <DemoBadge />
          : <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{ t('quantflow.training.setup.historical') }</span>)}
      </div>
      {showRound && (
        <p className="mt-2 text-xs text-muted-foreground">
          {dataset === demoDataset
            ? t('quantflow.dataStatus', { mode: t('quantflow.training.setup.synthetic'), date: currentDate, version: dataset.source })
            : t('quantflow.training.setup.snapshot', { source: dataset.source, date: dataset.collectedAt.slice(0, 10) })}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span role="group" aria-label={t('quantflow.training.mode.title')} className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5">
          { (['assigned', 'blind'] as const).map(item => (
            <button
              key={item}
              type="button"
              aria-pressed={setupMode === item}
              onClick={() => {
                setPlaying(false)
                setSetupMode(item)
              }}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${setupMode === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
            >
              { t(`quantflow.training.mode.${item}`) }
            </button>
          )) }
        </span>
        <p className="text-xs text-muted-foreground">{ t(setupMode === 'blind' ? 'quantflow.training.mode.blindHint' : 'quantflow.training.mode.assignedHint') }</p>
      </div>
      <TrainingSetup
        pools={pools}
        mode={setupMode}
        capital={capital}
        importDataset={dataset => setPools(previous => ({ ...previous, local: dataset }))}
        start={(dataset, stock, day, cash) => startRound(createRound(dataset, stock, day, cash, setupMode))}
      />
      {siteDataError && <p role="status" className="mt-2 text-xs text-amber-700">{t('quantflow.training.setup.siteError')}</p>}

      <div className={showRound ? 'mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[190px_minmax(0,1fr)_280px]' : 'hidden'}>
        <aside className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2 xl:col-span-1">
          <h2 className="text-sm font-semibold">{ t('quantflow.training.accountTitle') }</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            { t('quantflow.login.signedInAs') }
            ：
            { profile?.nickname ?? t('quantflow.login.notSignedIn') }
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-1">
            {[
              [t('quantflow.training.equityLabel'), valuation.equityCents],
              [t('quantflow.training.cashLabel'), account.cashCents],
              [t('quantflow.training.marketValue'), valuation.holdingsValueCents],
              [t('quantflow.training.totalPnl'), pnl],
              [t('quantflow.training.initialCash'), account.initialCashCents],
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
            <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="text-lg font-semibold">{instrumentLabel}</h2>
              <span className="font-mono text-xs text-muted-foreground" aria-live="polite">
                {currentDate}
                {current ? ` · ¥${current.close.toFixed(2)}` : ''}
              </span>
            </div>
            { visibleCandles.length > 0 && <TrainingChart key={session.id} candles={visibleCandles} fills={account.fills} /> }
            {blind && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPlaying(false)
                    dispatch({ type: 'reveal' })
                  }}
                  disabled={stopped}
                >
                  {t('quantflow.training.blind.reveal')}
                </Button>
                {stopped && <span className="text-xs text-muted-foreground">{t('quantflow.training.blind.revealedNote')}</span>}
              </div>
            )}
            { valuation.error && <p role="alert" className="mt-2 text-sm text-red-600">{ valuation.error }</p> }
          </div>

          <details className="rounded-lg border bg-card p-4 shadow-sm">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <span>{ t('quantflow.training.equity.title') }</span>
              <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
                { t('quantflow.training.equity.latest') }
                {' '}
                { latestEquity === null ? t('quantflow.training.unavailable') : `¥${formatMoney(latestEquity / 100)}` }
                { ' · ' }
                { t('quantflow.training.equity.change') }
                {' '}
                { equityChange === null ? '—' : `${equityChange >= 0 ? '+' : '-'}¥${formatMoney(Math.abs(equityChange) / 100)}` }
              </span>
            </summary>
            <div className="mt-3">
              { equityPoints.length > 1
                ? <AccountEquityChart points={equityPoints} initialCents={account.initialCashCents} label={t('quantflow.training.equity.label')} />
                : <p className="text-xs text-muted-foreground">{ t('quantflow.training.equity.empty') }</p> }
              { equityGaps.map(gap => (
                <p key={gap.date} className="mt-2 text-xs text-amber-700">
                  { t('quantflow.training.equity.gap', { date: gap.date, reason: gap.reason ?? '' }) }
                </p>
              )) }
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{ t('quantflow.training.equity.note') }</p>
            </div>
          </details>

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
                          { maskTrainingText(p.code, revealed) }
                          {' '}
                          ·
                          {' '}
                          { maskTrainingText(p.name, revealed) }
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
                        <td className="py-2 pr-4 font-mono">{ maskTrainingText(o.code, revealed) }</td>
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
                        <td className="py-2 pr-4 font-mono">{ maskTrainingText(row.code, revealed) }</td>
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

        <div className="min-w-0 space-y-4">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">{ t('quantflow.training.playback') }</h2>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" disabled={stopped} onClick={() => setPlaying(value => !value)}>{ t(playing && !stopped ? 'quantflow.training.pause' : 'quantflow.training.play') }</Button>
              <Button className="flex-1" onClick={advance} disabled={stopped}>{ t('quantflow.training.nextDay') }</Button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              {t('quantflow.training.speed')}
              <select className="rounded-md border bg-background px-2 py-1 text-foreground" value={speed} onChange={event => setSpeed(Number(event.target.value))}>
                {[0.5, 1, 2].map(value => <option key={value} value={value}>{value}</option>)}
              </select>
              {t('quantflow.training.detail.seconds')}
            </label>
          </section>
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">{t('quantflow.training.detail.title')}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {(['open', 'high', 'low', 'close', 'vol', 'change'] as const).map((key) => {
                const pctColor = change === null || change === 0 ? '' : change > 0 ? 'text-red-600' : 'text-emerald-700'
                const value = key === 'change'
                  ? change === null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(2)}%`
                  : !current
                      ? '—'
                      : key === 'vol'
                        ? `${(current.vol / 10_000).toFixed(2)} ${t('quantflow.training.chart.tenThousandShares')}`
                        : `¥${current[key].toFixed(2)}`
                return (
                  <div key={key} className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{t(`quantflow.training.detail.${key}`)}</dt>
                    <dd className={`font-mono font-semibold tabular-nums ${key === 'change' ? pctColor : ''}`}>{value}</dd>
                  </div>
                )
              })}
            </dl>
          </section>
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">{ t('quantflow.training.order.title') }</h2>

            <div className="mt-3 space-y-3">
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
              { ended && !blind && <p role="status" className="text-sm text-muted-foreground">{ t('quantflow.training.ended') }</p> }

              <Button className="w-full" onClick={submit} disabled={stopped || !current || !quote}>{ t('quantflow.training.order.submit') }</Button>
              <details className="text-xs leading-relaxed text-muted-foreground">
                <summary className="cursor-pointer">{ t('quantflow.training.rulesSummary') }</summary>
                <p className="mt-2">{ t('quantflow.training.notice') }</p>
              </details>
            </div>
          </section>
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
