import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
// eslint-disable-next-line test/no-import-node-test
import { after, before, test } from 'node:test'
import { createPreviewServer, parsePort } from '../scripts/preview-static.mjs'

let temporaryDirectory
let server
let port

before(async () => {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'quantflow-static-test-'))
  const root = path.join(temporaryDirectory, 'out')
  await mkdir(path.join(root, 'zh', 'docs', 'rules'), { recursive: true })
  await mkdir(path.join(root, 'no-index'))
  await mkdir(path.join(temporaryDirectory, 'outside'))
  const files = {
    'index.html': '<html>Root entry</html>',
    '404.html': '<html>Custom 404</html>',
    'zh/docs/rules/index.html': '<html>交易规则</html>',
    'style.css': 'body { color: blue }',
    'search.js': 'export const ready = true',
    'entry.json': '{"ok":true}',
    'icon.svg': '<svg />',
    'search.wasm': new Uint8Array([0, 97, 115, 109]),
    'robots.txt': 'User-agent: *',
    'no-index/hidden.txt': 'directory contents',
    '.env': 'not public',
  }
  await Promise.all(Object.entries(files).map(([name, data]) => writeFile(path.join(root, name), data)))
  await writeFile(path.join(temporaryDirectory, 'outside', 'secret.txt'), 'private')
  await symlink(path.join(temporaryDirectory, 'outside'), path.join(root, 'linked'), 'junction')
  server = await createPreviewServer(root)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  port = server.address().port
})

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
  if (temporaryDirectory) {
    const relative = path.relative(path.resolve(tmpdir()), temporaryDirectory)
    assert.ok(relative.startsWith('quantflow-static-test-') && !relative.includes(path.sep))
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})

function get(target, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path: target, method }, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}

test('port defaults to 7000 and rejects unknown or invalid arguments', () => {
  assert.equal(parsePort([]), 7000)
  assert.equal(parsePort(['--port', '7300']), 7300)
  for (const args of [['--host', '0.0.0.0'], ['--port'], ['--port', '0'], ['--port', '65536'], ['--port', '7.1'], ['--port', '7000', 'extra']]) {
    assert.throws(() => parsePort(args))
  }
})

test('root and a nested exported page are served without an application server', async () => {
  const root = await get('/')
  assert.equal(root.status, 200)
  assert.equal(root.body.toString(), '<html>Root entry</html>')
  const deep = await get('/zh/docs/rules/?query=1')
  assert.equal(deep.status, 200)
  assert.equal(deep.body.toString(), '<html>交易规则</html>')
  assert.equal(deep.headers['content-type'], 'text/html; charset=utf-8')
})

test('directory indexes redirect to a trailing slash while preserving the query', async () => {
  const response = await get('/zh/docs/rules?q=fees')
  assert.equal(response.status, 308)
  assert.equal(response.headers.location, '/zh/docs/rules/?q=fees')
})

test('missing paths and directories without indexes use a real 404, never SPA fallback or listing', async () => {
  for (const target of ['/unknown', '/en/', '/zh/unknown/', '/no-index/', '/style.css/']) {
    const response = await get(target)
    assert.equal(response.status, 404, target)
    assert.equal(response.body.toString(), '<html>Custom 404</html>', target)
  }
})

test('static assets have usable MIME types and HEAD returns matching headers without a body', async () => {
  const types = {
    '/style.css': 'text/css; charset=utf-8',
    '/search.js': 'text/javascript; charset=utf-8',
    '/entry.json': 'application/json; charset=utf-8',
    '/icon.svg': 'image/svg+xml',
    '/search.wasm': 'application/wasm',
    '/robots.txt': 'text/plain; charset=utf-8',
  }
  for (const [target, type] of Object.entries(types)) {
    const response = await get(target)
    const head = await get(target, 'HEAD')
    assert.equal(response.status, 200, target)
    assert.equal(response.headers['content-type'], type, target)
    assert.equal(head.headers['content-length'], response.headers['content-length'], target)
    assert.equal(head.body.length, 0, target)
  }
  const missingHead = await get('/unknown', 'HEAD')
  assert.equal(missingHead.status, 404)
  assert.equal(missingHead.body.length, 0)
})

test('malformed URIs, traversal, hidden files and Windows alternate paths are rejected', async () => {
  const invalid = ['/../outside/secret.txt', '/%2e%2e/outside/secret.txt', '/%5c..%5coutside%5csecret.txt', '/%00', '/%E0%A4', '/.env', '/index.html:stream', '//outside/secret.txt', '/zh%2fdocs/rules/', '/no-index./hidden.txt']
  for (const target of invalid) {
    const response = await get(target)
    assert.equal(response.status, 400, target)
    assert.equal(response.body.toString(), '400 Bad Request', target)
  }
})

test('filesystem links cannot expose a file outside the export directory', async () => {
  const response = await get('/linked/secret.txt')
  assert.equal(response.status, 404)
  assert.equal(response.body.toString(), '<html>Custom 404</html>')
})

test('only GET and HEAD are accepted', async () => {
  const response = await get('/', 'POST')
  assert.equal(response.status, 405)
  assert.equal(response.headers.allow, 'GET, HEAD')
})
