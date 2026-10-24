/**
 * Teste isolado da API (sem Electron).
 * Uso:
 *   node scripts/test-ativar.mjs
 *   node scripts/test-ativar.mjs email@x.com 123456
 */
import { request as httpsRequest } from 'https'
import { URL } from 'url'

const API_URL =
  process.env.API_URL ||
  'https://script.google.com/macros/s/AKfycbxeuhsahyc7oUgOydujDv4k9-kEfgpy4tq-jJQ9Oc9SkH9B7GVR4BCZtpYTKzXHK5ZbUA/exec'

const email = process.argv[2] || 'robson.milioli@gmail.com'
const codigo = process.argv[3] || '947163'

function rawRequest(urlStr, method, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr)
    const headers = {
      Accept: 'application/json, text/plain, text/html, */*',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Connection: 'close'
    }
    if (method === 'POST' && body != null) {
      headers['Content-Type'] = 'text/plain;charset=utf-8'
      headers['Content-Length'] = Buffer.byteLength(body, 'utf8')
    }
    const req = httpsRequest(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        headers
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
            url: urlStr
          })
        )
      }
    )
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

function extractContinueUrl(html) {
  const m = html.match(/<form[^>]*\baction=["']([^"']+)["']/i)
  if (!m) return null
  return m[1].replace(/&amp;/g, '&')
}

async function call(method, body) {
  let url = API_URL
  for (let hop = 0; hop < 10; hop++) {
    console.log(`\n[hop ${hop}] ${method} ${url.slice(0, 90)}...`)
    const res = await rawRequest(url, method, body)
    console.log(`  status=${res.status} bytes=${res.body.length}`)
    const loc = res.headers.location
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url).toString()
      console.log(`  Location → ${url.slice(0, 100)}...`)
      continue
    }
    const t = res.body.trim()
    if (t.startsWith('<!') || t.startsWith('<html') || /<form/i.test(t)) {
      const cont = extractContinueUrl(res.body)
      console.log(`  HTML detectado. form action=${cont ? cont.slice(0, 100) + '...' : 'NENHUM'}`)
      console.log(`  preview: ${t.replace(/\s+/g, ' ').slice(0, 200)}`)
      if (cont) {
        url = cont
        continue
      }
      return res
    }
    console.log(`  body: ${t.slice(0, 500)}`)
    return res
  }
}

const payload = JSON.stringify({
  v: 1,
  acao: 'ativar',
  email,
  app: '1.0.0',
  payload: { codigo, nome_maquina: 'TESTE-SCRIPT' }
})

console.log('API_URL =', API_URL)
console.log('email =', email, 'codigo =', codigo)

const health = await call('GET')
console.log('\n=== GET resultado ===')
console.log(health.body.slice(0, 300))

const act = await call('POST', payload)
console.log('\n=== POST ativar resultado ===')
console.log(act.body.slice(0, 800))
