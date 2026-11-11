import type { LearningTopicId } from '@/i18n/learning'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Layers3 } from 'lucide-react'
import { learningCopy } from '@/i18n/learning'

const copy = learningCopy.diagram

function CandleDiagram() {
  return (
    <div className="grid gap-5 sm:grid-cols-2" role="img" aria-label={copy.candleLabel}>
      {[true, false].map(up => (
        <div key={String(up)} className="rounded-2xl border border-border/70 bg-background/60 p-4">
          <p className="text-center text-sm font-medium">{up ? copy.up : copy.down}</p>
          <svg viewBox="0 0 280 235" className="mx-auto mt-3 w-full max-w-[280px]" aria-hidden="true">
            <path d="M35 35H245 M35 75H245 M35 155H245 M35 195H245" fill="none" stroke="currentColor" opacity="0.09" strokeDasharray="4 5" />
            <path d="M120 35V195" stroke={up ? '#e54d61' : '#169b80'} strokeWidth="3" />
            <rect x="96" y="75" width="48" height="80" rx="3" fill={up ? '#e54d61' : '#169b80'} />
            <g fill="currentColor" fontSize="13">
              <text x="158" y="40">{copy.high}</text>
              <text x="158" y="80">{up ? copy.closeTwelve : copy.openTwelve}</text>
              <text x="158" y="160">{up ? copy.openTen : copy.closeTen}</text>
              <text x="158" y="200">{copy.low}</text>
              <text x="120" y="229" textAnchor="middle" opacity="0.6" fontSize="11">{copy.candleUnit}</text>
            </g>
          </svg>
        </div>
      ))}
    </div>
  )
}

function VolumeDiagram() {
  const bars = [26, 34, 30, 46, 58, 70]
  return (
    <div role="img" aria-label={copy.volumeLabel}>
      <p className="mb-5 text-sm font-medium">{copy.volumeTitle}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        {[true, false].map(increasing => (
          <div key={String(increasing)} className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <p className="text-sm font-medium text-primary">{increasing ? copy.volumeUp : copy.volumeDown}</p>
            <svg viewBox="0 0 280 225" className="mt-3 w-full" aria-hidden="true">
              <path d="M25 35H265 M25 75H265 M25 115H265 M25 195H265" stroke="currentColor" opacity="0.1" strokeDasharray="3 5" />
              <path d="M40 100L80 80L120 88L160 58L200 65L240 29" fill="none" stroke="#427bea" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {bars.map((height, index) => (
                <rect key={index} x={29 + index * 40} y={195 - (increasing ? height : bars[bars.length - 1 - index])} width="22" height={increasing ? height : bars[bars.length - 1 - index]} rx="3" fill="#7cb3f7" opacity={0.45 + index * 0.08} />
              ))}
              <g fill="currentColor" opacity="0.65" fontSize="11">
                <text x="25" y="20">{copy.price}</text>
                <text x="25" y="123">{copy.volume}</text>
                <text x="215" y="216">{copy.time}</text>
              </g>
            </svg>
            <p className="text-center text-xs text-muted-foreground">{increasing ? copy.active : copy.quiet}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function EtfDiagram() {
  const assets = [copy.etfAssetA, copy.etfAssetB, copy.etfAssetC, copy.etfMore]
  return (
    <div>
      <p className="text-sm font-medium">{copy.etfTitle}</p>
      <p className="mt-1 text-xs text-muted-foreground">{copy.etfSubtitle}</p>
      <div className="my-6 grid items-center gap-4 sm:grid-cols-[1fr_auto_1.3fr]">
        <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <Layers3 className="size-10 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold">{copy.etfUnit}</p>
        </div>
        <ArrowRight className="mx-auto size-5 rotate-90 text-primary/50 sm:rotate-0" aria-hidden="true" />
        <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
          <p className="mb-3 text-center text-xs text-muted-foreground">{copy.etfBasket}</p>
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset, index) => (
              <span key={asset} className={`rounded-xl px-2 py-4 text-center text-xs font-medium ${index % 2 ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'}`}>{asset}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-xl border border-dashed px-3 py-3 text-xs">
        <span>{copy.etfExchange}</span>
        <span className="text-primary">↔</span>
        <span>{copy.etfNav}</span>
        <span className="text-muted-foreground">{copy.etfDifference}</span>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">{copy.etfNote}</p>
    </div>
  )
}

function RiskDiagram() {
  const values = [
    { title: copy.start, value: '100', height: 112 },
    { title: copy.after, value: '80', height: 90 },
    { title: copy.recover, value: '100', height: 112 },
  ]
  return (
    <div>
      <p className="text-sm font-medium">{copy.riskTitle}</p>
      <div className="mt-7 grid grid-cols-3 gap-3">
        {values.map((value, index) => (
          <div key={value.title} className="flex flex-col items-center">
            <div className="flex h-40 w-full max-w-28 flex-col items-center justify-end">
              <span className="mb-2 font-mono text-2xl font-semibold tracking-tight">{value.value}</span>
              <div className={`w-full rounded-t-xl ${index === 1 ? 'bg-sky-200 dark:bg-sky-800' : 'bg-primary/70'}`} style={{ height: value.height }} />
            </div>
            <span className="mt-3 text-center text-xs text-muted-foreground">{value.title}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
          <ArrowDownRight className="size-4" aria-hidden="true" />
          {copy.loss}
        </span>
        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-300">
          <ArrowUpRight className="size-4" aria-hidden="true" />
          {copy.gain}
        </span>
      </div>
      <p className="mt-4 rounded-xl bg-background/70 py-3 text-center font-mono text-sm">{copy.formula}</p>
    </div>
  )
}

export default function LearningDiagram({ topic }: { topic: LearningTopicId }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-50/90 via-sky-50/60 to-white p-4 text-foreground sm:p-6 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-950">
      {topic === 'candles' && <CandleDiagram />}
      {topic === 'volume' && <VolumeDiagram />}
      {topic === 'etf' && <EtfDiagram />}
      {topic === 'risk' && <RiskDiagram />}
    </div>
  )
}
