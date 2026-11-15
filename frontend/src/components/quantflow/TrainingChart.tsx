'use client'

import type { PointerEvent } from 'react'
import type { Candle } from '@/lib/mock-data'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks'
import { aggregateTrainingWeeks, trailingMean, trainingWeek } from '@/lib/demo-chart'
import { bollSeries, kdjSeries, macdSeries, rsiSeries } from '@/lib/demo-indicators'

export interface ChartFill {
  date: string
  side: 'buy' | 'sell'
  priceCents: number
  status: string
  code: string
  qty: number
}

type ViewMode = 'candle' | 'line'
type IndicatorKey = 'macd' | 'kdj' | 'rsi' | 'boll'
type Point = number | null

interface PanelLine {
  key: string
  label: string
  color: string
  values: Point[]
}

const SERIES = [
  { period: 5, color: '#C07B14' },
  { period: 10, color: '#7C3AED' },
  { period: 20, color: '#0284C7' },
] as const
const INDICATORS = [
  { key: 'macd', params: 'MACD(12,26,9)', labelKey: 'quantflow.training.chart.indicatorMacd' },
  { key: 'kdj', params: 'KDJ(9,3,3)', labelKey: 'quantflow.training.chart.indicatorKdj' },
  { key: 'rsi', params: 'RSI(14)', labelKey: 'quantflow.training.chart.indicatorRsi' },
  { key: 'boll', params: 'BOLL(20,2)', labelKey: 'quantflow.training.chart.indicatorBoll' },
] as const satisfies { key: IndicatorKey, params: string, labelKey: string }[]
const UP = '#DC2626'
const DOWN = '#059669'
const BOLL_LINE = '#64748B'
const LINE_CLOSE = '#2563EB'
const LINE_FILL = 'rgba(37, 99, 235, 0.10)'
const FAST_LINE = '#0EA5E9'
const SLOW_LINE = '#C07B14'
const THIRD_LINE = '#7C3AED'
const MIN_BARS = 5
const MAX_BARS = 150
const ZOOM_STEP = 4
const PANEL_PLOT_HEIGHT = 78
const LEFT = 14
const RIGHT = 76

/** A chart of the supplied, already truncated history; never fetches or peeks at later bars. */
export default function TrainingChart({ candles: dailyCandles, fills = [], height = 480 }: { candles: Candle[], fills?: ChartFill[], height?: number }) {
  const { t } = useLocale()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<{ pointerId: number, startX: number, startOffset: number } | null>(null)
  const [enabled, setEnabled] = useState<number[]>([5, 10, 20])
  const [windowSize, setWindowSize] = useState(60)
  const [offset, setOffset] = useState(0)
  const [mode, setMode] = useState<ViewMode>('candle')
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily')
  const [indicator, setIndicator] = useState<IndicatorKey>('macd')
  const [bollOn, setBollOn] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [inspection, setInspection] = useState<{ date: string, y: number | null } | null>(null)
  const [width, setWidth] = useState(1000)
  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))))
    observer.observe(container)
    return () => observer.disconnect()
  }, [])
  const latestDate = dailyCandles.at(-1)?.date
  const [viewDate, setViewDate] = useState(latestDate)
  if (latestDate !== viewDate) {
    setViewDate(latestDate)
    setOffset(0)
    setInspection(null)
  }
  const candles = useMemo(() => period === 'daily' ? dailyCandles : aggregateTrainingWeeks(dailyCandles), [dailyCandles, period])
  const closes = useMemo(() => candles.map(candle => candle.close), [candles])
  const averages = useMemo(() => SERIES.map(series => ({
    ...series,
    values: trailingMean(closes, series.period),
  })), [closes])
  const macd = useMemo(() => macdSeries(closes), [closes])
  const kdj = useMemo(() => kdjSeries(candles), [candles])
  const rsi = useMemo(() => rsiSeries(closes), [closes])
  const boll = useMemo(() => bollSeries(closes), [closes])
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
  const baseBottom = Math.max(360, height)
  const priceBottom = baseBottom - 134
  const volumeTop = priceBottom + 32
  const volumeBottom = baseBottom - 30
  const panelSplit = baseBottom + 12
  const panelLabelY = panelSplit + 14
  const panelTop = panelLabelY + 8
  const panelBottom = panelTop + PANEL_PLOT_HEIGHT
  const chartHeight = panelBottom + 24
  const dateAxisY = panelBottom + 17
  const priceHeight = priceBottom - top
  const priceValues = [
    ...shown.flatMap(candle => [candle.low, candle.high]),
    ...averages.filter(series => enabled.includes(series.period)).flatMap(series => series.values.slice(start, end).filter((v): v is number => v !== null)),
    ...(bollOn ? [boll.upper, boll.mid, boll.lower].flatMap(series => series.slice(start, end).filter((v): v is number => v !== null)) : []),
  ]
  const min = priceValues.length ? Math.min(...priceValues) : 0
  const max = priceValues.length ? Math.max(...priceValues) : 1
  const margin = Math.max((max - min) * 0.12, max * 0.005, 0.01)
  const low = Math.max(0, min - margin)
  const high = max + margin
  const step = (width - LEFT - RIGHT) / Math.max(1, shown.length)
  const x = (i: number) => LEFT + (i + 0.5) * step
  const y = (price: number) => top + ((high - price) / (high - low)) * priceHeight
  const maxVolume = Math.max(1, ...shown.map(candle => candle.vol))
  const bodyWidth = Math.max(2, Math.min(28, step * 0.62))
  const dates = new Set(shown.map(candle => candle.date))
  const weekDates = period === 'weekly' ? new Map(shown.map(bar => [trainingWeek(bar.date), bar.date])) : null
  const shownFills = fills.flatMap(fill => {
    const barDate = weekDates ? weekDates.get(trainingWeek(fill.date)) : fill.date
    return fill.status === 'filled' && barDate && dates.has(barDate) ? [{ ...fill, barDate }] : []
  })
  const chartY = inspection?.y === null || inspection?.y === undefined ? (active ? y(active.close) : top) : Math.max(top, Math.min(priceBottom, inspection.y))
  const inspectedPrice = high - ((chartY - top) / priceHeight) * (high - low)
  const tickIndices = [...new Set([0, Math.floor((shown.length - 1) / 2), shown.length - 1])].filter(i => i >= 0)
  const panelLines: PanelLine[] = indicator === 'macd'
    ? [
        { key: 'dif', label: 'DIF', color: FAST_LINE, values: macd.dif },
        { key: 'dea', label: 'DEA', color: SLOW_LINE, values: macd.dea },
      ]
    : indicator === 'kdj'
      ? [
          { key: 'k', label: 'K', color: FAST_LINE, values: kdj.k },
          { key: 'd', label: 'D', color: SLOW_LINE, values: kdj.d },
          { key: 'j', label: 'J', color: THIRD_LINE, values: kdj.j },
        ]
      : indicator === 'rsi'
        ? [{ key: 'rsi', label: 'RSI', color: FAST_LINE, values: rsi }]
        : [
            { key: 'upper', label: 'UP', color: FAST_LINE, values: boll.upper },
            { key: 'mid', label: 'MID', color: SLOW_LINE, values: boll.mid },
            { key: 'lower', label: 'LOW', color: THIRD_LINE, values: boll.lower },
          ]
  const panelParams = INDICATORS.find(item => item.key === indicator)?.params ?? ''
  const panelReferences = indicator === 'kdj' ? [20, 80] : indicator === 'rsi' ? [30, 70] : indicator === 'macd' ? [0] : []
  const panelBars = indicator === 'macd' ? macd.hist : null
  const panelValues = [
    ...panelLines.flatMap(line => line.values.slice(start, end).filter((v): v is number => v !== null)),
    ...(panelBars ? panelBars.slice(start, end).filter((v): v is number => v !== null) : []),
  ]
  const panelRawMin = panelValues.length ? Math.min(...panelValues) : -1
  const panelRawMax = panelValues.length ? Math.max(...panelValues) : 1
  const panelPad = Math.max((panelRawMax - panelRawMin) * 0.12, Math.abs(panelRawMax) * 0.02, 0.01)
  const panelLow = indicator === 'rsi' ? 0 : Math.min(panelRawMin, ...panelReferences) - panelPad
  const panelHigh = indicator === 'rsi' ? 100 : Math.max(panelRawMax, ...panelReferences) + panelPad
  const panelY = (value: number) => panelTop + ((panelHigh - value) / Math.max(0.0001, panelHigh - panelLow)) * PANEL_PLOT_HEIGHT
  const panelDigits = indicator === 'macd' || indicator === 'boll' ? 2 : 1
  const activePanel = panelLines.map(line => ({ ...line, value: line.values[start + activeIndex] }))
  const activeHist = panelBars ? panelBars[start + activeIndex] : null
  const activeBoll = [boll.upper, boll.mid, boll.lower]
    .map(series => series[start + activeIndex])
    .filter((value): value is number => value !== null && value !== undefined)
  const panelBarValues = panelBars ? panelBars.slice(start, end) : null
  const panelReadout = [
    ...activePanel.map(line => ({
      label: line.label,
      color: line.color,
      text: line.value === null || line.value === undefined ? t('quantflow.training.chart.warmup') : line.value.toFixed(panelDigits),
    })),
    ...(activeHist === null || activeHist === undefined
      ? []
      : [{
          label: t('quantflow.training.chart.macdHist'),
          color: activeHist >= 0 ? UP : DOWN,
          text: activeHist.toFixed(panelDigits),
        }]),
  ]
  const linePath = (values: Point[], toX: (i: number) => number, toY: (value: number) => number) => {
    let connected = false
    return values.map((value, i) => {
      if (value === null || !Number.isFinite(value)) {
        connected = false
        return ''
      }
      const command = connected ? 'L' : 'M'
      connected = true
      return `${command}${toX(i).toFixed(2)},${toY(value).toFixed(2)}`
    }).join(' ')
  }
  const closeValues = shown.map(candle => candle.close)
  const closePath = linePath(closeValues, x, y)
  const closeArea = shown.length
    ? `${closePath} L${x(shown.length - 1).toFixed(2)},${priceBottom.toFixed(2)} L${x(0).toFixed(2)},${priceBottom.toFixed(2)} Z`
    : ''
  const zoomBy = (delta: number) => {
    const limit = Math.max(MIN_BARS, Math.min(MAX_BARS, candles.length))
    const next = Math.max(Math.min(MIN_BARS, limit), Math.min(limit, count + delta))
    if (next === count) {
      return
    }
    setWindowSize(next)
    setOffset(previous => Math.min(previous, Math.max(0, candles.length - next)))
  }
  const zoomRef = useRef(zoomBy)

  useEffect(() => {
    zoomRef.current = zoomBy
  })

  // React registers `wheel` as a passive listener, so preventDefault needs a native subscription.
  useEffect(() => {
    const node = svgRef.current
    if (!node) {
      return
    }
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) {
        return
      }
      event.preventDefault()
      zoomRef.current(event.deltaY > 0 ? ZOOM_STEP : -ZOOM_STEP)
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      node.removeEventListener('wheel', onWheel)
    }
  }, [candles.length])

  const pointerX = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return (event.clientX - bounds.left) * width / bounds.width
  }

  const startDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (!shown.length || (event.pointerType === 'mouse' && event.button !== 0)) {
      return
    }
    // Without capture the pan stops at the chart edge and a release outside leaves the grab cursor stuck.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    catch {
      // A pointer the browser never activated cannot be captured; panning still works inside the chart.
    }
    dragRef.current = { pointerId: event.pointerId, startX: pointerX(event), startOffset: actualOffset }
    setDragging(true)
  }

  const dragBy = (event: PointerEvent<SVGSVGElement>) => {
    const session = dragRef.current
    if (!session || session.pointerId !== event.pointerId) {
      return
    }
    const bars = Math.round((pointerX(event) - session.startX) / step)
    setOffset(Math.max(0, Math.min(maxOffset, session.startOffset + bars)))
  }

  const endDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return
    }
    dragRef.current = null
    setDragging(false)
  }

  const inspectPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (!shown.length) {
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    const cursorY = (event.clientY - bounds.top) * chartHeight / bounds.height
    const selected = Math.max(0, Math.min(shown.length - 1, Math.floor((pointerX(event) - LEFT) / step)))
    setInspection({ date: shown[selected].date, y: cursorY })
  }

  const movePointer = (event: PointerEvent<SVGSVGElement>) => {
    dragBy(event)
    inspectPointer(event)
  }

  return (
    <div ref={containerRef} className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-0.5 rounded border p-0.5" role="group" aria-label={t('quantflow.training.chart.viewGroup')}>
            { (['candle', 'line'] as const).map(view => (
              <button
                key={view}
                type="button"
                aria-pressed={mode === view}
                onClick={() => setMode(view)}
                className={`rounded px-2 py-1 transition-colors ${mode === view ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                { t(view === 'candle' ? 'quantflow.training.chart.viewCandle' : 'quantflow.training.chart.viewLine') }
              </button>
            )) }
          </span>
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
          <button
            type="button"
            aria-pressed={bollOn}
            onClick={() => setBollOn(previous => !previous)}
            className={`rounded border px-2 py-1 transition-colors ${bollOn ? 'border-current bg-muted/40' : 'border-transparent opacity-40'}`}
            style={{ color: BOLL_LINE }}
            title={t('quantflow.training.chart.bollToggle')}
          >
            BOLL
            (20,2)
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={count <= MIN_BARS} onClick={() => zoomBy(-ZOOM_STEP)} aria-label={t('quantflow.training.chart.zoomIn')}>＋</Button>
          <span className="min-w-12 text-center">
            { count }
            {' '}
            { t('quantflow.training.chart.bars') }
          </span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={windowSize >= MAX_BARS || windowSize >= candles.length} onClick={() => zoomBy(ZOOM_STEP)} aria-label={t('quantflow.training.chart.zoomOut')}>−</Button>
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
        <div className="flex items-center rounded-full border bg-muted/30 p-0.5 text-xs" role="group" aria-label={t('quantflow.training.chart.period')}>
          {(['daily', 'weekly'] as const).map(item => (
            <button
              key={item}
              type="button"
              aria-pressed={period === item}
              className={`rounded-full px-3 py-1.5 ${period === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              onClick={() => {
                setPeriod(item)
                setOffset(0)
                setInspection(null)
              }}
            >
              {t(`quantflow.training.chart.${item}`)}
            </button>
          ))}
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
                { bollOn && (
                  <span style={{ color: BOLL_LINE }}>
                    BOLL
                    {' '}
                    { t('quantflow.training.chart.bollBand') }
                    {' '}
                    { activeBoll.length === 3 ? activeBoll.map(value => value.toFixed(2)).join(' / ') : t('quantflow.training.chart.warmup') }
                  </span>
                ) }
              </div>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${chartHeight}`}
                className={`w-full touch-pan-y select-none rounded bg-background outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                role="img"
                tabIndex={0}
                aria-label={t('quantflow.training.chart.label')}
                onPointerDown={startDrag}
                onPointerMove={movePointer}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onLostPointerCapture={endDrag}
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
                      <line x1={LEFT} x2={width - RIGHT} y1={tickY} y2={tickY} stroke="currentColor" className="text-border" strokeDasharray="3 5" />
                      <text x={width - RIGHT + 10} y={tickY + 4} fontSize="12" fill="currentColor" className="text-muted-foreground">{ price.toFixed(2) }</text>
                    </g>
                  )
                }) }
                <line x1={LEFT} x2={width - RIGHT} y1={volumeTop - 12} y2={volumeTop - 12} stroke="currentColor" className="text-border" />
                <text x={LEFT} y={volumeTop - 18} fontSize="11" fill="currentColor" className="text-muted-foreground">{ t('quantflow.training.chart.volumeAxis') }</text>
                <text x={width - RIGHT + 10} y={volumeTop + 8} fontSize="11" fill="currentColor" className="text-muted-foreground">
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
                      { mode === 'candle' && (
                        <>
                          <line x1={x(i)} x2={x(i)} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth="1.3" />
                          <rect x={x(i) - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={Math.max(1.5, bodyBottom - bodyTop)} fill={color} rx="0.5" />
                        </>
                      ) }
                      <rect x={x(i) - bodyWidth / 2} y={volumeBottom - volumeHeight} width={bodyWidth} height={volumeHeight} fill={color} opacity="0.7" />
                    </g>
                  )
                }) }
                { mode === 'line' && (
                  <g>
                    <path d={closeArea} fill={LINE_FILL} stroke="none" />
                    <path d={closePath} fill="none" stroke={LINE_CLOSE} strokeWidth="1.8" strokeLinejoin="round" />
                  </g>
                ) }
                { bollOn && (
                  <g>
                    { [boll.upper, boll.mid, boll.lower].map((series, band) => (
                      <path
                        key={band}
                        d={linePath(series.slice(start, end), x, y)}
                        stroke={BOLL_LINE}
                        strokeWidth={band === 1 ? '1.4' : '1.1'}
                        strokeDasharray={band === 1 ? undefined : '5 3'}
                        fill="none"
                        opacity={band === 1 ? '0.9' : '0.7'}
                      />
                    )) }
                  </g>
                ) }
                { averages.filter(series => enabled.includes(series.period)).map(series => (
                  <path key={series.period} d={linePath(series.values.slice(start, end), x, y)} stroke={series.color} fill="none" strokeWidth="1.6" />
                )) }
                <g aria-label={panelParams}>
                  <line x1={LEFT} x2={width - RIGHT} y1={panelSplit} y2={panelSplit} stroke="currentColor" className="text-border" />
                  <text x={LEFT} y={panelLabelY} fontSize="11" fontFamily="var(--font-mono), ui-monospace, monospace" fill="currentColor" className="text-muted-foreground">
                    { panelParams }
                    { panelReadout.map(item => (
                      <tspan key={item.label} dx="12" fill={item.color}>{ `${item.label} ${item.text}` }</tspan>
                    )) }
                  </text>
                  <text x={width - RIGHT + 10} y={panelTop + 9} fontSize="10" fill="currentColor" className="text-muted-foreground">{ panelHigh.toFixed(panelDigits) }</text>
                  <text x={width - RIGHT + 10} y={panelBottom} fontSize="10" fill="currentColor" className="text-muted-foreground">{ panelLow.toFixed(panelDigits) }</text>
                  { panelReferences.map(reference => (
                    <g key={reference}>
                      <line x1={LEFT} x2={width - RIGHT} y1={panelY(reference)} y2={panelY(reference)} stroke="currentColor" className="text-border" strokeDasharray="3 5" />
                      <text x={width - RIGHT + 10} y={panelY(reference) + 4} fontSize="10" fill="currentColor" className="text-muted-foreground">{ reference.toFixed(panelDigits) }</text>
                    </g>
                  )) }
                  { panelBarValues?.map((value, i) => {
                    if (value === null || value === undefined) {
                      return null
                    }
                    const zero = panelY(0)
                    const level = panelY(value)
                    return (
                      <rect
                        key={shown[i].date}
                        x={x(i) - bodyWidth / 2}
                        y={Math.min(zero, level)}
                        width={bodyWidth}
                        height={Math.max(0.8, Math.abs(level - zero))}
                        fill={value >= 0 ? UP : DOWN}
                        opacity="0.55"
                      />
                    )
                  }) }
                  { panelLines.map(line => (
                    <path key={line.key} d={linePath(line.values.slice(start, end), x, panelY)} stroke={line.color} strokeWidth="1.4" fill="none" />
                  )) }
                </g>
                { shownFills.map((fill, fillIndex) => {
                  const i = shown.findIndex(candle => candle.date === fill.barDate)
                  const buy = fill.side === 'buy'
                  const sameDateOffset = shownFills.slice(0, fillIndex).filter(item => item.barDate === fill.barDate && item.side === fill.side).length * 17
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
                  <text key={shown[i].date} x={x(i)} y={dateAxisY} textAnchor={i === 0 ? 'start' : i === shown.length - 1 ? 'end' : 'middle'} fontSize="12" fill="currentColor" className="text-muted-foreground">{ shown[i].date.slice(5) }</text>
                )) }
                { inspection && (
                  <g pointerEvents="none">
                    <line x1={x(activeIndex)} x2={x(activeIndex)} y1={top} y2={panelBottom} stroke="var(--primary)" strokeDasharray="4 4" opacity="0.65" />
                    <line x1={LEFT} x2={width - RIGHT} y1={chartY} y2={chartY} stroke="var(--primary)" strokeDasharray="4 4" opacity="0.65" />
                    <rect x={width - RIGHT + 3} y={chartY - 10} width={70} height={20} rx="3" fill="var(--primary)" />
                    <text x={width - RIGHT + 38} y={chartY + 4} textAnchor="middle" fontSize="12" fill="white">{ inspectedPrice.toFixed(2) }</text>
                  </g>
                ) }
              </svg>
              <label className="mt-1 flex w-fit items-center gap-2 text-xs text-muted-foreground">
                { t('quantflow.training.chart.indicatorLabel') }
                <select className="rounded-md border border-input bg-background px-2 py-1 font-mono text-foreground" value={indicator} onChange={event => setIndicator(event.target.value as IndicatorKey)}>
                  { INDICATORS.map(item => <option key={item.key} value={item.key}>{t(item.labelKey)}</option>) }
                </select>
              </label>
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
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                { t('quantflow.training.chart.interactionHint') }
              </p>
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
