'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function HomeEntry() {
  useEffect(() => {
    window.location.replace(`/zh/${window.location.search}${window.location.hash}`)
  }, [])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
      <h1 className="text-2xl font-semibold">QuantFlow AI</h1>
      <Link className="text-primary underline underline-offset-4" href="/zh/">进入中文首页</Link>
    </main>
  )
}
