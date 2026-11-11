'use client'

import type { PointerEvent } from 'react'
import type { Candle } from '@/lib/mock-data'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks'
import { trailingMean } from '@/lib/demo-chart'

export interface ChartFill {
  date: string
  side: 'buy' | 'sell'
  priceCents: number
  status: string
  code: string
  qty: number
}

const SERIES = [
  { period: 5, color: '#C07B14' },
  { period: 10, color: '#7C3AED' },
  { period: 20, color: '#0284C7' },
] as const
const UP = '#DC2626'
const DOWN = '#059669'
const WIDTH = 1000
const LEFT = 14
const RIGHT = 76
const PLOT_WIDTH = WIDTH - LEFT - RIGHT

/** A chart of the supplied, already truncated history; never fetches or peeks at later bars. */
export default function TrainingChart({ candles, fills = [], height = 480 }: { candles: Candle[], fills?: ChartFill[], height?: number }) {
  const { t } = useLocale()
  const [enabled, setEnabled] = useState<number[]>([5, 10, 20])
  const [windowSize, setWindowSize] = useState(40)
  const [offset, setOffset] = useState(0)
  const [inspection, setInspection] = useState<{ date: string, y: number | null } | null>(null)
  const averages = useMemo(() => SERIES.map(series => ({
    ...series,
    values: trailingMean(candles.map(candle => candle.close), series.period),
  })), [candles])
  const count = Math.min(windowSize, candles.length)
  const maxOffset = Math.max(0, candles.length - count)
  const actualOffset = Math.min(offset, maxOffset)
  const end = candles.length - actualOffset
  const start = Math.max(0, end - count)
  const shown = candles.slice(start, end)
  const index = Math.max(0, shown.findIndex(candle => candle.date === inspection?.date))
  const activeIndex = inspection && shown.some(candle => candle.date === inspection.date) ? index : shown.length - 1
  const active = shown[activeIndex]
  const activeAverages = averages.map(series => ({ ...series, value: series.values[start + activeIndex] }))
  const top = 24
  const chartHeight = Math.max(360, height)
  const priceBottom = chartHeight - 134
  const volumeTop = priceBottom + 32
  const volumeBottom = chartHeight - 30
  const priceHeight = priceBottom - top
  const priceValues = [
    ...shown.flatMap(candle => [candle.low, candle.high]),
    ...averages.filter(series => enabled.includes(series.period)).flatMap(series => series.values.slice(start, end).filter((v): v is number => v !== null)),
  ]
  const min = priceValues.length ? Math.min(...priceValues) : 0
  const max = priceValues.length ? Math.max(...priceValues) : 1
  const margin = Math.max((max - min) * 0.12, max * 0.005, 0.01)
  const low = Math.max(0, min - margin)
  const high = max + margin
  const step = PLOT_WIDTH / Math.max(1, shown.length)
  const x = (i: number) => LEFT + (i + 0.5) * step
  const y = (price: number) => top + ((high - price) / (high - low)) * priceHeight
  const maxVolume = Math.max(1, ...shown.map(candle => candle.vol))
  const bodyWidth = Math.max(2, Math.min(28, step * 0.62))
  const dates = new Set(shown.map(candle => candle.date))
  const shownFills = fills.filter(fill => fill.status === 'filled' && dates.has(fill.date))
  const chartY = inspection?.y === null || inspection?.y === undefined ? (active ? y(active.close) : top) : Math.max(top, Math.min(priceBottom, inspection.y))
  const inspectedPrice = high - ((chartY - top) / priceHeight) * (high - low)
  const tickIndices = [...new Set([0, Math.floor((shown.length - 1) / 2), shown.length - 1])].filter(i => i >= 0)

  const inspectPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (!shown.length) {
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    const cursorX = (event.clientX - bounds.left) * WIDTH / bounds.width
    const cursorY = (event.clientY - bounds.top) * chartHeight / bounds.height
    const selected = Math.max(0, Math.min(shown.length - 1, Math.floor((cursorX - LEFT) / step)))
    setInspection({ date: shown[selected].date, y: cursorY })
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-primary/10 px-2 py-1 font-semibold text-primary">{ t('quantflow.training.chart.daily') }</span>
          { SERIES.map(series => (
            <button
              key={series.period}
              type="button"
              aria-pressed={enabled.includes(series.period)}
              onClick={() => setEnabled(previous => previous.includes(series.period) ? previous.filter(period => period !== series.period) : [...previous, series.period])}
              className={`rounded border px-2 py-1 transition-colors ${enabled.includes(series.period) ? 'border-current bg-muted/40' : 'border-transparent opacity-40'}`}
              style={{ color: series.color }}
              title={t('quantflow.training.chart.toggle', { period: series.period })}
            >
              MA
              { series.period }
            </button>
          )) }
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={count <= 10} onClick={() => setWindowSize(Math.max(10, count - 10))} aria-label={t('quantflow.training.chart.zoomIn')}>＋</Button>
          <span className="min-w-12 text-center">
            { count }
            {' '}
            { t('quantflow.training.chart.bars') }
          </span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={windowSize >= 90 || windowSize >= candles.length} onClick={() => setWindowSize(size => Math.min(90, size + 10))} aria-label={t('quantflow.training.chart.zoomOut')}>−</Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={actualOffset === 0}
            onClick={() => {
              setOffset(0)
              setInspection(null)
            }}
          >
            { t('quantflow.training.chart.latest') }
          </Button>
        </div>
      </div>

      { active
        ? (
            <>
              <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 py-2 font-mono text-xs" aria-live="off">
                <span className="font-medium text-foreground">{ active.date }</span>
                <span className="text-muted-foreground">
                  { t('quantflow.training.chart.open') }
                  <span className="text-foreground">{ active.open.toFixed(2) }</span>
                </span>
                <span className="text-muted-foreground">
                  { t('quantflow.training.chart.high') }
                  <span className="text-foreground">{ active.high.toFixed(2) }</span>
                </span>
                <span className="text-muted-foreground">
                  { t('quantflow.training.chart.low') }
                  <span className="text-foreground">{ active.low.toFixed(2) }</span>
                </span>
                <span className="text-muted-foreground">
                  { t('quantflow.training.chart.close') }
                  <span style={{ color: active.close >= active.open ? UP : DOWN }}>{ active.close.toFixed(2) }</span>
                </span>
                <span className="text-muted-foreground">
                  { t('quantflow.training.chart.volume') }
                  { (active.vol / 10_000).toFixed(2) }
                  {' '}
                  { t('quantflow.training.chart.tenThousandShares') }
                </span>
              </div>
              <div className="mb-1 flex min-h-5 flex-wrap gap-x-4 font-mono text-[11px]">
                { activeAverages.filter(series => enabled.includes(series.period)).map(series => (
                  <span key={series.period} style={{ color: series.color }}>
                    MA
                    { series.period }
                    {' '}
                    { series.value === null || series.value === undefined ? t('quantflow.training.chart.warmup') : series.value.toFixed(2) }
                  </span>
                )) }
              </div>
              <svg
                viewBox={`0 0 ${WIDTH} ${chartHeight}`}
                className="w-full touch-pan-y rounded bg-background outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                role="img"
                tabIndex={0}
                aria-label={t('quantflow.training.chart.label')}
                onPointerMove={inspectPointer}
                onPointerLeave={() => setInspection(null)}
                onKeyDown={event => {
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                    return
                  }
                  event.preventDefault()
                  const next = Math.max(0, Math.min(shown.length - 1, activeIndex + (event.key === 'ArrowLeft' ? -1 : 1)))
                  setInspection({ date: shown[next].date, y: null })
                }}
              >
                { Array.from({ length: 5 }, (_, tick) => {
                  const price = high - tick * (high - low) / 4
                  const tickY = y(price)
                  return (
                    <g key={tick}>
                      <line x1={LEFT} x2={WIDTH - RIGHT} y1={tickY} y2={tickY} stroke="currentColor" className="text-border" strokeDasharray="3 5" />
                      <text x={WIDTH - RIGHT + 10} y={tickY + 4} fontSize="12" fill="currentColor" className="text-muted-foreground">{ price.toFixed(2) }</text>
                    </g>
                  )
                }) }
                <line x1={LEFT} x2={WIDTH - RIGHT} y1={volumeTop - 12} y2={volumeTop - 12} stroke="currentColor" className="text-border" />
                <text x={LEFT} y={volumeTop - 18} fontSize="11" fill="currentColor" className="text-muted-foreground">{ t('quantflow.training.chart.volumeAxis') }</text>
                <text x={WIDTH - RIGHT + 10} y={volumeTop + 8} fontSize="11" fill="currentColor" className="text-muted-foreground">
                  { (maxVolume / 10_000).toFixed(0) }
                  {' '}
                  { t('quantflow.training.chart.tenThousand') }
                </text>
                { shown.map((candle, i) => {
                  const color = candle.close >= candle.open ? UP : DOWN
                  const bodyTop = y(Math.max(candle.open, candle.close))
                  const bodyBottom = y(Math.min(candle.open, candle.close))
                  const volumeHeight = candle.vol / maxVolume * (volumeBottom - volumeTop)
                  return (
                    <g key={candle.date}>
                      <line x1={x(i)} x2={x(i)} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth="1.3" />
                      <rect x={x(i) - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={Math.max(1.5, bodyBottom - bodyTop)} fill={color} rx="0.5" />
                      <rect x={x(i) - bodyWidth / 2} y={volumeBottom - volumeHeight} width={bodyWidth} height={Math.max(1, volumeHeight)} fill={color} opacity="0.5" />
                    </g>
                  )
                }) }
                { averages.filter(series => enabled.includes(series.period)).map(series => {
                  let connected = false
                  const path = series.values.slice(start, end).map((value, i) => {
                    if (value === null) {
                      connected = false
                      return ''
                    }
                    const command = connected ? 'L' : 'M'
                    connected = true
                    return `${command}${x(i).toFixed(2)},${y(value).toFixed(2)}`
                  }).join(' ')
                  return <path key={series.period} d={path} stroke={series.color} fill="none" strokeWidth="1.6" />
                }) }
                { shownFills.map((fill, fillIndex) => {
                  const i = shown.findIndex(candle => candle.date === fill.date)
                  const buy = fill.side === 'buy'
                  const sameDateOffset = shownFills.slice(0, fillIndex).filter(item => item.date === fill.date && item.side === fill.side).length * 17
                  const markerY = buy ? Math.min(priceBottom + 10, y(shown[i].low) + 17 + sameDateOffset) : Math.max(top - 6, y(shown[i].high) - 15 - sameDateOffset)
                  return (
                    <g key={`${fill.date}-${fill.side}-${fillIndex}`}>
                      <title>{ t('quantflow.training.chart.fill', { date: fill.date, side: t(buy ? 'quantflow.common.sideBuy' : 'quantflow.common.sideSell'), qty: fill.qty, price: (fill.priceCents / 100).toFixed(2) }) }</title>
                      <circle cx={x(i)} cy={markerY} r="8" fill={buy ? UP : DOWN} />
                      <text x={x(i)} y={markerY + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">{ buy ? 'B' : 'S' }</text>
                    </g>
                  )
                }) }
                { tickIndices.map(i => (
                  <text key={shown[i].date} x={x(i)} y={chartHeight - 8} textAnchor={i === 0 ? 'start' : i === shown.length - 1 ? 'end' : 'middle'} fontSize="12" fill="currentColor" className="text-muted-foreground">{ shown[i].date.slice(5) }</text>
                )) }
                { inspection && (
                  <g pointerEvents="none">
                    <line x1={x(activeIndex)} x2={x(activeIndex)} y1={top} y2={volumeBottom} stroke="var(--primary)" strokeDasharray="4 4" opacity="0.65" />
                    <line x1={LEFT} x2={WIDTH - RIGHT} y1={chartY} y2={chartY} stroke="var(--primary)" strokeDasharray="4 4" opacity="0.65" />
                    <rect x={WIDTH - RIGHT + 3} y={chartY - 10} width={70} height={20} rx="3" fill="var(--primary)" />
                    <text x={WIDTH - RIGHT + 38} y={chartY + 4} textAnchor="middle" fontSize="12" fill="white">{ inspectedPrice.toFixed(2) }</text>
                  </g>
                ) }
              </svg>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>{ t('quantflow.training.chart.legend') }</span>
                <span>
                  { shown[0].date }
                  {' '}
                  —
                  {' '}
                  { shown[shown.length - 1].date }
                </span>
              </div>
              { maxOffset > 0 && (
                <label className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  { t('quantflow.training.chart.history') }
                  <input
                    type="range"
                    min={0}
                    max={maxOffset}
                    value={maxOffset - actualOffset}
                    onChange={event => {
                      setOffset(maxOffset - Number(event.target.value))
                      setInspection(null)
                    }}
                    className="min-w-0 flex-1 accent-primary"
                    aria-label={t('quantflow.training.chart.moveWindow')}
                  />
                  { t('quantflow.training.chart.latest') }
                </label>
              ) }
            </>
          )
        : <p className="py-20 text-center text-sm text-muted-foreground">{ t('quantflow.training.chart.empty') }</p> }
    </div>
  )
}
