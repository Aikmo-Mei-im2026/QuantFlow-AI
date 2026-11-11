import { spawnSync } from 'node:child_process'
import { cp, lstat, realpath, rm } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const frontend = await realpath(fileURLToPath(new URL('../', import.meta.url)))
const output = path.join(frontend, 'out')

function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(frontend, script), ...args], {
    cwd: frontend,
    stdio: 'inherit',
  })
  if (result.error || result.status !== 0) {
    throw new Error(`后处理失败：${script}（${result.error?.code || result.status}）`)
  }
}

async function clearGeneratedIndex(parent) {
  const expectedParent = path.join(frontend, parent)
  if (await realpath(expectedParent) !== expectedParent) {
    throw new Error('索引父目录不能指向项目外部或使用链接目录。')
  }
  const target = path.join(expectedParent, '_pagefind')
  let info
  try {
    info = await lstat(target)
  }
  catch (error) {
    if (error.code === 'ENOENT') {
      return
    }
    throw error
  }
  if (!info.isDirectory() || info.isSymbolicLink() || await realpath(target) !== target) {
    throw new Error('只允许清理项目内生成的_pagefind目录。')
  }
  await rm(target, { recursive: true })
}

// Refuse to process a missing or redirected export directory.
if (await realpath(output) !== output) {
  throw new Error('请先在项目内生成out静态目录。')
}
run('node_modules/next-sitemap/bin/next-sitemap.mjs', ['--config', 'next-sitemap.config.mjs'])
// Next copies public before postbuild; remove old hashes from that copy.
await clearGeneratedIndex('out')
run('node_modules/pagefind/lib/runner/bin.cjs', ['--site', 'out', '--output-path', 'out/_pagefind'])
// Keep the same generated index available during next dev. Neither copy is committed.
await clearGeneratedIndex('public')
await cp(path.join(output, '_pagefind'), path.join(frontend, 'public', '_pagefind'), { recursive: true })
await cp(path.join(frontend, 'LICENSE'), path.join(output, 'LICENSE.txt'))
