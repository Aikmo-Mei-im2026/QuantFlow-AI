export function EquityChart({
  nav,
  benchmark,
  height = 240,
}: {
  nav: number[]
  benchmark: number[]
  height?: number
}) {
  const width = 720
  const pad = 10
  const all = [...nav, ...benchmark]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const range = max - min || 1
  const step = width / (nav.length - 1)
  const toPath = (series: number[]) =>
    series
      .map((v, i) => `${(i * step).toFixed(1)},${(height - pad - ((v - min) / range) * (height - pad * 2)).toFixed(1)}`)
      .join(' L')

  const navPath = toPath(nav)
  const benchPath = toPath(benchmark)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="净值与基准曲线">
      <path d={`M${benchPath}`} fill="none" stroke="#9CA3AF" strokeWidth="1.6" strokeDasharray="5 4" />
      <path d={`M${navPath}`} fill="none" stroke="var(--primary)" strokeWidth="2.2" />
      <path d={`M${navPath} L${width},${height} L0,${height} Z`} fill="var(--primary)" opacity="0.06" />
    </svg>
  )
}

const UP = '#EF4444'
const DOWN = '#10B981'

export function CandleChart({
  candles,
  height = 260,
}: {
  candles: { date: string, open: number, high: number, low: number, close: number, vol: number }[]
  height?: number
}) {
  const width = 720
  const padTop = 12
  const padBottom = 22
  const plotH = height - padTop - padBottom
  const min = Math.min(...candles.map(c => c.low))
  const max = Math.max(...candles.map(c => c.high))
  const range = max - min || 1
  const step = width / candles.length
  const bodyW = Math.max(2, step * 0.55)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="K 线图">
      {candles.map((c, i) => {
        const x = i * step + step / 2
        const y = (v: number) => padTop + ((max - v) / range) * plotH
        const up = c.close >= c.open
        const color = up ? UP : DOWN
        const top = y(Math.max(c.open, c.close))
        const bottom = y(Math.min(c.open, c.close))
        return (
          <g key={c.date}>
            <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1" />
            <rect
              x={x - bodyW / 2}
              y={top}
              width={bodyW}
              height={Math.max(1.5, bottom - top)}
              fill={up ? color : '#FFFFFF'}
              stroke={color}
              strokeWidth="1"
            />
          </g>
        )
      })}
    </svg>
  )
}
