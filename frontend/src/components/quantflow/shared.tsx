'use client'

import { useLocale } from '@/hooks'

export function DemoBadge() {
  const { t } = useLocale()
  return (
    <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700">
      { t('quantflow.demoBadge') }
    </span>
  )
}

export function DataStatusLine({ date = '2026-09-30', version = 'demo-v2' }: { date?: string, version?: string }) {
  const { t } = useLocale()
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      { t('quantflow.dataStatus', { mode: 'demo / 合成样例', date, version }) }
    </p>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useLocale()
  const styles: Record<string, string> = {
    pending: 'text-blue-600',
    filled: 'text-green-600',
    rejected: 'text-red-600',
    running: 'text-blue-600',
    succeeded: 'text-green-600',
    failed: 'text-red-600',
    interrupted: 'text-amber-600',
  }
  const labels: Record<string, string> = {
    pending: t('quantflow.common.statusPending'),
    filled: t('quantflow.common.statusFilled'),
    rejected: t('quantflow.common.statusRejected'),
    running: t('quantflow.common.statusRunning'),
    succeeded: t('quantflow.common.statusSucceeded'),
    failed: t('quantflow.common.statusFailed'),
    interrupted: t('quantflow.common.statusInterrupted'),
  }
  return <span className={styles[status] ?? 'text-muted-foreground'}>{ labels[status] ?? status }</span>
}

export function SideLabel({ side }: { side: 'buy' | 'sell' }) {
  const { t } = useLocale()
  return side === 'buy'
    ? <span className="text-red-600">{ t('quantflow.common.sideBuy') }</span>
    : <span className="text-green-600">{ t('quantflow.common.sideSell') }</span>
}
