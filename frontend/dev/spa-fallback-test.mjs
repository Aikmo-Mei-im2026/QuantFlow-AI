// 本地模拟 Qoder Sites 路由行为的一次性验证服务器（不提交、不上传）：
// 1. 字面文件路径（含 .html）按 out/ 内真实文件返回；
// 2. 其余未知路径一律返回 out/index.html 且状态 200（模拟 prepare_site 的 spa 回退壳）；
// 3. 仅监听 127.0.0.1。
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = path.resolve(fileURLToPath(new URL('../', import.meta.url)))
const out = path.join(frontend, 'out')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pf_fragment': 'application/octet-stream',
  '.pf_index': 'application/octet-stream',
  '.pf_meta': 'application/octet-stream',
  '.wasm': 'application/wasm',
}

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0])
  if (clean.includes('..') || clean.includes('\0')) return null
  const target = path.join(out, clean.replace(/^\/+/, ''))
  if (!target.startsWith(out)) return null
  try {
    const info = await stat(target)
    if (info.isFile()) return target
  } catch { /* fallthrough */ }
  return null
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end()
      return
    }
    const file = await resolveFile(req.url)
    if (file) {
      const body = req.method === 'HEAD' ? '' : await readFile(file)
      res.writeHead(200, {
        'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'content-length': String((await stat(file)).size),
      })
      res.end(body)
      return
    }
    const shell = await readFile(path.join(out, 'index.html'))
    res.writeHead(200, { 'content-type': MIME['.html'] })
    res.end(req.method === 'HEAD' ? '' : shell)
  } catch {
    res.writeHead(500).end()
  }
})

server.listen(7100, '127.0.0.1', () => {
  console.log('fallback test server on http://127.0.0.1:7100/')
})
