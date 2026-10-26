import { request as httpsRequest } from 'https'
import { request as httpRequest } from 'http'
import { URL } from 'url'
import { getApiUrl, getAppVersion } from './config'
import type { ApiResponse, HealthResult } from '../shared/types'

export class ApiClientError extends Error {
  codigo: string
  constructor(codigo: string, mensagem: string) {
    super(mensagem)
    this.codigo = codigo
    this.name = 'ApiClientError'
  }
}

const MSG_ACESSO_WEBAPP =
  'O Google pediu login em vez de devolver JSON. Confira a implantação (Qualquer pessoa) e teste a URL em janela anônima.'

interface RawResponse {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
  url: string
}

function headerGet(headers: RawResponse['headers'], name: string): string | null {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase())
  if (!key) return null
  const v = headers[key]
  if (Array.isArray(v)) return v[0] || null
  return v || null
}

function isGoogleLoginUrl(url: string): boolean {
  return /accounts\.google\.com|ServiceLogin|signin\/oauth|AccountChooser/i.test(url)
}

function isAppsScriptHost(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return (
      host === 'script.google.com' ||
      host.endsWith('.script.google.com') ||
      host.endsWith('.googleusercontent.com')
    )
  } catch {
    return false
  }
}

function isResultEchoUrl(url: string): boolean {
  return /script\.googleusercontent\.com\/macros\/echo/i.test(url)
}

function lookLikeHtml(text: string): boolean {
  const t = text.trim().slice(0, 80).toLowerCase()
  return t.startsWith('<!doctype') || t.startsWith('<html')
}

function rawRequest(urlStr: string, method: 'GET' | 'POST', body?: string): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr)
    const isHttps = u.protocol === 'https:'
    const lib = isHttps ? httpsRequest : httpRequest
    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'ControleHorasExtras/1.0.0',
      Connection: 'close'
    }
    if (method === 'POST' && body != null) {
      headers['Content-Type'] = 'text/plain;charset=utf-8'
      headers['Content-Length'] = Buffer.byteLength(body, 'utf8').toString()
    }

    const req = lib(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        method,
        headers
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers as RawResponse['headers'],
            body: Buffer.concat(chunks).toString('utf8'),
            url: urlStr
          })
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(60000, () => {
      req.destroy(new Error('Tempo esgotado ao falar com o Apps Script.'))
    })
    if (method === 'POST' && body != null) req.write(body, 'utf8')
    req.end()
  })
}

/**
 * Fluxo real do Web App Google:
 * 1) POST/GET em script.google.com/.../exec
 * 2) HTTP 302 → script.googleusercontent.com/macros/echo?...
 * 3) O resultado JSON é lido com GET nesse echo (POST no echo = 405 + HTML).
 * O corpo do POST já foi consumido no passo 1.
 */
async function fetchAppsScript(method: 'GET' | 'POST', body?: string): Promise<RawResponse> {
  let url = getApiUrl()
  let currentMethod: 'GET' | 'POST' = method
  let currentBody: string | undefined = body

  for (let hop = 0; hop < 8; hop++) {
    const res = await rawRequest(url, currentMethod, currentBody)

    if (res.status >= 300 && res.status < 400) {
      const loc = headerGet(res.headers, 'location')
      if (!loc) {
        throw new ApiClientError(
          'ERRO_INTERNO',
          'O Apps Script redirecionou sem Location. Confira se a URL termina em /exec.'
        )
      }
      const next = new URL(loc, url).toString()
      if (isGoogleLoginUrl(next)) {
        throw new ApiClientError('ERRO_INTERNO', MSG_ACESSO_WEBAPP)
      }
      if (!isAppsScriptHost(next)) {
        throw new ApiClientError(
          'ERRO_INTERNO',
          `Redirect inesperado para ${next}. Verifique a publicação do Web App.`
        )
      }

      url = next
      // Após o /exec, o echo só aceita GET (é a URL do resultado)
      if (isResultEchoUrl(next) || currentMethod === 'POST') {
        currentMethod = 'GET'
        currentBody = undefined
      }
      continue
    }

    if (lookLikeHtml(res.body) || isGoogleLoginUrl(res.url)) {
      throw new ApiClientError('ERRO_INTERNO', MSG_ACESSO_WEBAPP)
    }

    return { ...res, url }
  }

  throw new ApiClientError('ERRO_INTERNO', 'Muitos redirecionamentos do Apps Script.')
}

async function postJson<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetchAppsScript('POST', JSON.stringify(payload))

  let json: ApiResponse<T>
  try {
    json = JSON.parse(res.body) as ApiResponse<T>
  } catch {
    throw new ApiClientError(
      'ERRO_INTERNO',
      `Resposta inválida do servidor (HTTP ${res.status}).`
    )
  }

  if (!json.ok) {
    throw new ApiClientError(json.codigo, json.mensagem)
  }
  return json.dados
}

export async function apiHealth(): Promise<HealthResult> {
  try {
    const res = await fetchAppsScript('GET')
    return JSON.parse(res.body) as HealthResult
  } catch (err) {
    return {
      ok: false,
      mensagem: err instanceof Error ? err.message : 'Sem conexão com o servidor.'
    }
  }
}

export async function apiPost<T>(
  acao: string,
  email: string,
  token: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  return postJson<T>({
    v: 1,
    acao,
    email,
    token,
    app: getAppVersion(),
    payload
  })
}

export async function apiLogin(payload: {
  email: string
  senha: string
  nome_maquina: string
}): Promise<import('../shared/types').LoginResult> {
  return postJson({
    v: 1,
    acao: 'login',
    email: payload.email,
    app: getAppVersion(),
    payload: {
      senha: payload.senha,
      nome_maquina: payload.nome_maquina
    }
  })
}
