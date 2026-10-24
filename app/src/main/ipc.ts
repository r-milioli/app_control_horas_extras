import { ipcMain, app } from 'electron'
import { hostname } from 'os'
import { apiAtivar, apiHealth, apiPost, ApiClientError } from './api'
import {
  estaAtivado,
  lerCredenciais,
  limparCredenciais,
  salvarCredenciais,
  salvarSessaoUsuario
} from './auth'
import {
  contarPendentesEnvio,
  criarLancamento,
  finalizarLancamento,
  getConfig,
  listarLancamentos,
  lerUsuarioCache,
  marcarCanceladoLocal,
  obterLancamento,
  salvarUsuarioCache
} from './db'
import { executarSync } from './sync'
import { formatarHoras, mensagemErroApi } from '../shared/validation'
import type { AppState, NovoLancamentoInput } from '../shared/types'

function buildState(online: boolean): AppState {
  const usuario = lerUsuarioCache()
  return {
    activated: estaAtivado(),
    online,
    usuario,
    pendentesEnvio: contarPendentesEnvio(),
    clockSkewWarning: getConfig('clock_skew', '0') === '1',
    lastSyncAt: getConfig('last_sync_at', '') || null
  }
}

let lastOnline = true

export function registerIpc(): void {
  ipcMain.handle('app:getState', async () => {
    const health = await apiHealth()
    lastOnline = !!health.ok
    return buildState(lastOnline)
  })

  ipcMain.handle('app:health', async () => {
    const health = await apiHealth()
    lastOnline = !!health.ok
    return health
  })

  ipcMain.handle('auth:ativar', async (_e, payload: { email: string; codigo: string; pin?: string }) => {
    try {
      const dados = await apiAtivar({
        email: payload.email.trim(),
        codigo: payload.codigo.trim(),
        nome_maquina: hostname() || 'Windows',
        pin: payload.pin
      })

      if (dados.etapa === 'DEFINIR_PIN') {
        return { ok: true as const, etapa: 'DEFINIR_PIN' as const, mensagem: dados.mensagem, email: dados.email }
      }

      if (dados.etapa === 'CONCLUIDO' && dados.token && dados.usuario) {
        salvarCredenciais(dados.usuario.email, dados.token)
        const usuario = {
          email: dados.usuario.email,
          nome: dados.usuario.nome,
          matricula: dados.usuario.matricula,
          unidade_id: dados.usuario.unidade_id,
          perfis: (dados.usuario.perfis || []).join(','),
          saldo_minutos: 0,
          saldo_legivel: formatarHoras(0),
          creditos_min: 0,
          debitos_min: 0
        }
        salvarUsuarioCache(usuario)
        salvarSessaoUsuario(usuario)
        return { ok: true as const, etapa: 'CONCLUIDO' as const, usuario }
      }

      return {
        ok: false as const,
        codigo: 'ERRO_INTERNO',
        mensagem:
          'Resposta inesperada na ativação (o servidor não devolveu token). Verifique se o Web App está publicado como “Qualquer pessoa” e tente de novo.'
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        return {
          ok: false as const,
          codigo: err.codigo,
          mensagem: mensagemErroApi(err.codigo, err.message)
        }
      }
      return {
        ok: false as const,
        codigo: 'ERRO_INTERNO',
        mensagem: err instanceof Error ? err.message : 'Falha na ativação.'
      }
    }
  })

  ipcMain.handle('auth:logout', async () => {
    limparCredenciais()
    return { ok: true }
  })

  ipcMain.handle('lancamentos:listar', async () => listarLancamentos())

  ipcMain.handle('lancamentos:criar', async (_e, input: NovoLancamentoInput) => {
    try {
      const item = criarLancamento(input)
      return { ok: true as const, item }
    } catch (err) {
      return {
        ok: false as const,
        mensagem: err instanceof Error ? err.message : 'Não foi possível salvar.'
      }
    }
  })

  ipcMain.handle('lancamentos:finalizar', async (_e, id: string) => {
    try {
      const item = finalizarLancamento(id)
      return { ok: true as const, item }
    } catch (err) {
      return {
        ok: false as const,
        mensagem: err instanceof Error ? err.message : 'Não foi possível finalizar.'
      }
    }
  })

  ipcMain.handle('lancamentos:cancelar', async (_e, id: string) => {
    const creds = lerCredenciais()
    if (!creds) {
      return { ok: false as const, mensagem: 'Dispositivo não ativado.' }
    }
    const local = obterLancamento(id)
    if (!local) return { ok: false as const, mensagem: 'Lançamento não encontrado.' }
    if (local.status !== 'AGUARDANDO_APROVACAO') {
      return { ok: false as const, mensagem: 'Só é possível cancelar registros aguardando aprovação.' }
    }
    try {
      await apiPost('cancelar', creds.email, creds.token, { id })
      marcarCanceladoLocal(id)
      return { ok: true as const }
    } catch (err) {
      if (err instanceof ApiClientError) {
        return { ok: false as const, mensagem: mensagemErroApi(err.codigo, err.message) }
      }
      return {
        ok: false as const,
        mensagem: err instanceof Error ? err.message : 'Falha ao cancelar.'
      }
    }
  })

  ipcMain.handle('sync:run', async () => {
    try {
      const result = await executarSync()
      lastOnline = result.ok || lastOnline
      return { ...result, state: buildState(lastOnline) }
    } catch (err) {
      lastOnline = false
      return {
        ok: false,
        enviados: 0,
        falhas: 0,
        mudancas: 0,
        mensagem: err instanceof Error ? err.message : 'Falha na sincronização.',
        clockSkewWarning: false,
        state: buildState(false)
      }
    }
  })

  ipcMain.handle('app:machineName', async () => hostname() || 'Windows')
  ipcMain.handle('app:version', async () => app.getVersion())
}
