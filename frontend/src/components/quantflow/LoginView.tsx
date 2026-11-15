'use client'

import type { DemoProfile, DemoProfileError } from '@/lib/demo-profile'
import { LogOut, ShieldOff, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDemoProfile, useLocale } from '@/hooks'
import { announceDemoProfileChange, clearDemoProfile, DEMO_CASH_OPTIONS_CENTS, DEMO_NICKNAME_MAX, normaliseDemoProfile, writeDemoProfile } from '@/lib/demo-profile'
import { DemoBadge } from './shared'

function formatCentsAsYuan(cents: number) {
  return (cents / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

/** Remounted whenever the stored profile changes, so the fields always start from what this browser holds. */
function ProfileForm({ profile }: { profile: DemoProfile | null }) {
  const { t, currentLocale } = useLocale()
  const router = useRouter()
  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [cash, setCash] = useState<number>(profile?.initialCashCents ?? DEMO_CASH_OPTIONS_CENTS[1])
  const [error, setError] = useState<DemoProfileError | 'storageUnavailable' | null>(null)

  const save = () => {
    const result = normaliseDemoProfile({ nickname, initialCashCents: cash }, new Date().toISOString())
    if (result.error !== null || result.profile === null) {
      setError(result.error)
      return
    }
    if (!writeDemoProfile(window.localStorage, result.profile)) {
      setError('storageUnavailable')
      return
    }
    announceDemoProfileChange(window)
    router.push(`/${currentLocale}/training`)
  }

  return (
    <form
      className="mt-6 rounded-2xl border bg-card p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <h2 className="text-sm font-semibold">
        { profile === null ? t('quantflow.login.formTitleNew') : t('quantflow.login.formTitleEdit') }
      </h2>
      <div className="mt-4">
        <Label htmlFor="demo-nickname">{ t('quantflow.login.nickname') }</Label>
        <Input
          id="demo-nickname"
          className="mt-2"
          value={nickname}
          maxLength={DEMO_NICKNAME_MAX}
          autoComplete="off"
          placeholder={t('quantflow.login.nicknamePlaceholder')}
          onChange={(event) => {
            setNickname(event.target.value)
            setError(null)
          }}
        />
      </div>
      <fieldset className="mt-5">
        <legend className="text-sm font-medium">{ t('quantflow.login.cash') }</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          { DEMO_CASH_OPTIONS_CENTS.map(cents => (
            <label
              key={cents}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${cash === cents ? 'border-primary bg-primary/5 font-semibold' : 'hover:bg-accent'}`}
            >
              <input
                type="radio"
                name="initial-cash"
                className="accent-blue-600"
                checked={cash === cents}
                onChange={() => {
                  setCash(cents)
                  setError(null)
                }}
              />
              <span className="font-mono tabular-nums">
                ¥
                { formatCentsAsYuan(cents) }
              </span>
            </label>
          )) }
        </div>
      </fieldset>
      { error !== null && (
        <p role="alert" className="mt-4 text-sm text-red-600">{ t(`quantflow.login.errors.${error}`) }</p>
      ) }
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button type="submit">{ profile === null ? t('quantflow.login.submit') : t('quantflow.login.update') }</Button>
        <Link className="text-sm text-primary underline-offset-4 hover:underline" href={`/${currentLocale}`}>
          { t('quantflow.login.skip') }
        </Link>
      </div>
    </form>
  )
}

export default function LoginView() {
  const { t, currentLocale } = useLocale()
  const profile = useDemoProfile()
  const [signedOut, setSignedOut] = useState(false)

  if (profile === undefined) {
    return <p className="text-sm text-muted-foreground">{ t('quantflow.login.loading') }</p>
  }

  const signOut = () => {
    clearDemoProfile(window.localStorage)
    announceDemoProfileChange(window)
    setSignedOut(true)
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{ t('quantflow.login.title') }</h1>
        <DemoBadge />
      </div>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{ t('quantflow.login.intro') }</p>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <ShieldOff aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p className="text-xs leading-6">{ t('quantflow.login.warning') }</p>
      </div>

      { signedOut && profile === null && (
        <p className="mt-4 rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground">{ t('quantflow.login.signedOutNote') }</p>
      ) }

      { profile !== null && (
        <div className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">{ t('quantflow.login.currentTitle') }</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[120px_1fr]">
            <dt className="text-muted-foreground">{ t('quantflow.login.signedInAs') }</dt>
            <dd className="flex items-center gap-2 font-semibold">
              <UserRound aria-hidden="true" className="size-4 text-primary" />
              { profile.nickname }
            </dd>
            <dt className="text-muted-foreground">{ t('quantflow.login.cash') }</dt>
            <dd className="font-mono tabular-nums">
              ¥
              { formatCentsAsYuan(profile.initialCashCents) }
            </dd>
            <dt className="text-muted-foreground">{ t('quantflow.login.savedAt') }</dt>
            <dd className="break-words font-mono text-xs">{ profile.savedAt }</dd>
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="outline" onClick={signOut}>
              <LogOut aria-hidden="true" className="size-4" />
              { t('quantflow.login.signOut') }
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${currentLocale}/training`}>{ t('quantflow.login.goTraining') }</Link>
            </Button>
          </div>
        </div>
      ) }

      <ProfileForm key={profile?.savedAt ?? 'none'} profile={profile} />

      <p className="mt-5 text-xs leading-6 text-muted-foreground">{ t('quantflow.login.note') }</p>
    </div>
  )
}
