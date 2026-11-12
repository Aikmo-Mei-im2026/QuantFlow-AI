import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">页面不存在</h1>
      <p>请检查网址，或返回首页继续学习。</p>
      <Link className="text-primary underline underline-offset-4" href="/zh">返回首页</Link>
    </main>
  )
}
