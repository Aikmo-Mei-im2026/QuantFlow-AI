'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Qoder Sites 不支持无扩展名 URL 的静态映射，未知路径回退到本入口壳（SPA 回退）。
// 因此由该壳组件按当前 URL 做客户端路由：已知路由软跳转渲染真实页面，未知路径渲染 404。
// 新增页面时需同步更新 ROUTES。
const ROUTES = new Set([
  '/zh',
  '/zh/docs',
  '/zh/docs/factors',
  '/zh/docs/rules',
  '/zh/experiments',
  '/zh/lab',
  '/zh/training',
  '/zh/workspace',
])

// 熔断保险丝：旧版本曾用硬跳转造成「同一路径反复重载」的无限循环并消耗站点额度。
// 本壳只做软跳转不会触发；但若未来改动重新引入硬跳转循环，同一标签页短时间内
// 反复进入同一路径即熔断，停止自动跳转并提示，防止请求失控。
const FUSE_KEY = 'quantflow-shell-entry'
const FUSE_LIMIT = 3
const FUSE_WINDOW_MS = 10000

interface ShellEntry {
  p: string
  t: number
}

function recordShellEntry(pathname: string) {
  try {
    const now = Date.now()
    const entries = JSON.parse(window.sessionStorage.getItem(FUSE_KEY) || '[]') as ShellEntry[]
    const recent = entries.filter(entry => now - entry.t < FUSE_WINDOW_MS)
    recent.push({ p: pathname, t: now })
    window.sessionStorage.setItem(FUSE_KEY, JSON.stringify(recent))
    return recent.filter(entry => entry.p === pathname).length > FUSE_LIMIT
  }
  catch {
    return false
  }
}

type EntryMode = 'boot' | 'not-found' | 'fused'

export default function HomeEntry() {
  const router = useRouter()
  const [mode, setMode] = useState<EntryMode>('boot')

  useEffect(() => {
    const { pathname, search, hash } = window.location
    const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
    if (recordShellEntry(normalized)) {
      setMode('fused')
      return
    }
    if (normalized === '/' || normalized === '/index.html') {
      router.replace(`/zh${search}${hash}`)
      return
    }
    if (ROUTES.has(normalized)) {
      router.replace(`${normalized}${search}${hash}`)
      return
    }
    setMode('not-found')
  }, [router])

  if (mode === 'fused') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
        <p className="text-sm text-muted-foreground">跳转异常</p>
        <h1 className="text-2xl font-semibold">页面跳转次数过多，已停止自动跳转。</h1>
        <p>可能是页面在反复刷新。请稍候片刻再试，或直接打开首页。</p>
        <Link className="text-primary underline underline-offset-4" href="/zh">返回首页</Link>
      </main>
    )
  }

  if (mode === 'not-found') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
        <p className="text-sm text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold">页面不存在</h1>
        <p>请检查网址，或返回首页继续学习。</p>
        <Link className="text-primary underline underline-offset-4" href="/zh">返回首页</Link>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
      <h1 className="text-2xl font-semibold">QuantFlow AI</h1>
      <Link className="text-primary underline underline-offset-4" href="/zh">进入中文首页</Link>
    </main>
  )
}
