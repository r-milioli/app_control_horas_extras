import { apiPost, ApiClientError } from './api'
import { lerCredenciais } from './auth'
import {
  atualizarSaldoCache,
  atualizarStatusAposEnvio,
  getConfig,
  listarPendentesEnvio,
  setConfig,
  upsertMudancaServidor
} from './db'
import { SYNC_LOTE_MAX } from './config'
import type { SyncResult } from '../shared/types'
import { mensagemErroApi } from '../shared/validation'

const CLOCK_SKEW_MS = 5 * 60 * 1000

export interface SyncOutcome {
  ok: boolean
  enviados: number
  falhas: number
  mudancas: number
  mensagem: string
  clockSkewWarning: boolean
  servidor_em?: string
}

export async function executarSync(): Promise<SyncOutcome> {
  const creds = lerCredenciais()
  if (!creds) {
    return {
      ok: false,
      enviados: 0,
      falhas: 0,
      mudancas: 0,
      mensagem: 'Dispositivo não ativado.',
      clockSkewWarning: false
    }
  }

  const pendentes = listarPendentesEnvio(SYNC_LOTE_MAX)
  const cursor = getConfig('cursor', '')
  const payload = {
    lancamentos: pendentes.map((l) => ({
      id: l.id,
      tipo: l.tipo,
      data: l.data,
      minutos: l.minutos,
      motivo: l.motivo,
      criado_em: l.criado_em,
      ref_id: l.ref_id
    })),
    cursor
  }

  let dados: SyncResult
  try {
    dados = await apiPost<SyncResult>('sync', creds.email, creds.token, payload)
  } catch (err) {
    if (err instanceof ApiClientError) {
      return {
        ok: false,
        enviados: 0,
        falhas: pendentes.length,
        mudancas: 0,
        mensagem: mensagemErroApi(err.codigo, err.message),
        clockSkewWarning: false
      }
    }
    throw err
  }

  let enviadosOk = 0
  let falhas = 0
  for (const r of dados.enviados || []) {
    if (r.ok && r.status) {
      atualizarStatusAposEnvio(r.id, r.status)
      enviadosOk++
    } else if (!r.ok) {
      falhas++
    }
  }

  for (const m of dados.mudancas || []) {
    upsertMudancaServidor(m)
  }

  if (dados.cursor) setConfig('cursor', dados.cursor)
  if (dados.config?.versao_minima) setConfig('versao_minima', dados.config.versao_minima)
  if (dados.config?.dias_alerta_pendencia != null) {
    setConfig('dias_alerta_pendencia', String(dados.config.dias_alerta_pendencia))
  }

  if (dados.saldo) {
    atualizarSaldoCache({
      minutos: dados.saldo.minutos,
      legivel: dados.saldo.legivel,
      creditos_min: dados.saldo.creditos_min,
      debitos_min: dados.saldo.debitos_min
    })
  }

  setConfig('last_sync_at', new Date().toISOString())
  if (dados.servidor_em) setConfig('servidor_em', dados.servidor_em)

  let clockSkewWarning = false
  if (dados.servidor_em) {
    const serverMs = Date.parse(dados.servidor_em)
    if (!Number.isNaN(serverMs) && Math.abs(Date.now() - serverMs) > CLOCK_SKEW_MS) {
      clockSkewWarning = true
      setConfig('clock_skew', '1')
    } else {
      setConfig('clock_skew', '0')
    }
  }

  const partes: string[] = []
  if (enviadosOk) partes.push(`${enviadosOk} enviado(s)`)
  if (dados.mudancas?.length) partes.push(`${dados.mudancas.length} atualização(ões)`)
  if (falhas) partes.push(`${falhas} falha(s) no envio`)
  if (!partes.length) partes.push('Nada pendente')

  return {
    ok: falhas === 0,
    enviados: enviadosOk,
    falhas,
    mudancas: dados.mudancas?.length || 0,
    mensagem: `Sincronização concluída. ${partes.join(', ')}.`,
    clockSkewWarning,
    servidor_em: dados.servidor_em
  }
}
