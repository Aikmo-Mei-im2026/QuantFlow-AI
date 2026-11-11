import { Buffer } from 'node:buffer'
import { readFile, realpath, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const exportDirectory = fileURLToPath(new URL('../out/', import.meta.url))
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.wasm': 'application/wasm',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

export function parsePort(args) {
  if (args.length === 0) {
    return 7000
  }
  if (args.length !== 2 || args[0] !== '--port' || !/^\d+$/.test(args[1])) {
    throw new Error('用法：node scripts/preview-static.mjs [--port 7000]')
  }
  const port = Number(args[1])
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('端口必须为 1–65535 的整数。')
  }
  return port
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

async function findEntry(root, candidate) {
  try {
    const resolved = await realpath(candidate)
    if (!isInside(root, resolved)) {
      return null
    }
    return { filename: resolved, info: await stat(resolved) }
  }
  catch (error) {
    if (['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'ELOOP'].includes(error.code)) {
      return null
    }
    throw error
  }
}

function parseTarget(target) {
  if (!target.startsWith('/') || target.startsWith('//')) {
    return null
  }
  const queryIndex = target.indexOf('?')
  const rawPath = queryIndex === -1 ? target : target.slice(0, queryIndex)
  const query = queryIndex === -1 ? '' : target.slice(queryIndex)
  let pathname
  try {
    pathname = decodeURIComponent(rawPath)
  }
  catch {
    return null
  }
  // Reject Windows aliases/alternate streams, dot segments and encoded separators.
  if (/[\\:"<>|?*#]/.test(pathname) || /%2f/i.test(rawPath) || [...pathname].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
    return null
  }
  const segments = pathname.split('/').slice(1)
  if (pathname.endsWith('/')) {
    segments.pop()
  }
  if (segments.some(segment => !segment || segment.startsWith('.') || /[. ]$/.test(segment))) {
    return null
  }
  return { segments, trailingSlash: pathname.endsWith('/'), query }
}

/** Local preview only: serve exported files with directory indexes and real 404s. */
export async function createPreviewServer(directory = exportDirectory) {
  const root = await realpath(directory)
  if (!(await stat(root)).isDirectory()) {
    throw new Error('静态输出目录不存在，请先完成构建。')
  }

  return createServer((request, response) => {
    const send = (statusCode, body, type = 'text/plain; charset=utf-8', extra = {}) => {
      response.writeHead(statusCode, {
        'Content-Type': type,
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        ...extra,
      })
      response.end(request.method === 'HEAD' ? undefined : body)
    }
    const sendFile = async (entry, statusCode) => {
      const body = await readFile(entry.filename)
      send(statusCode, body, contentTypes[path.extname(entry.filename).toLowerCase()] || 'application/octet-stream')
    }
    const notFound = async () => {
      const fallback = await findEntry(root, path.join(root, '404.html'))
      if (fallback?.info.isFile()) {
        await sendFile(fallback, 404)
      }
      else {
        send(404, '404 Not Found')
      }
    }
    const handle = async () => {
      if (!['GET', 'HEAD'].includes(request.method)) {
        send(405, '405 Method Not Allowed', undefined, { Allow: 'GET, HEAD' })
        return
      }
      const target = parseTarget(request.url || '/')
      if (!target) {
        send(400, '400 Bad Request')
        return
      }
      const filename = path.resolve(root, ...target.segments)
      const entry = isInside(root, filename) ? await findEntry(root, filename) : null
      if (entry?.info.isDirectory()) {
        const index = await findEntry(root, path.join(entry.filename, 'index.html'))
        if (index?.info.isFile()) {
          if (!target.trailingSlash) {
            const location = `/${target.segments.map(encodeURIComponent).join('/')}/${target.query}`
            send(308, '', undefined, { Location: location })
          }
          else {
            await sendFile(index, 200)
          }
          return
        }
      }
      else if (entry?.info.isFile() && !target.trailingSlash) {
        await sendFile(entry, 200)
        return
      }
      await notFound()
    }
    handle().catch(() => {
      if (!response.headersSent) {
        send(500, '500 Internal Server Error')
      }
      else {
        response.destroy()
      }
    })
  })
}

async function main() {
  const port = parsePort(process.argv.slice(2))
  const server = await createPreviewServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
  process.stdout.write(`静态预览：http://127.0.0.1:${port}/ （仅本机；目录 frontend/out）\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`静态预览启动失败：${error.code || error.message}\n`)
    process.exitCode = 1
  })
}
