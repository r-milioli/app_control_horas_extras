import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from './index.d'
import type { CriarUnidadeInput, CriarUsuarioInput } from '../shared/types'

async function adminOp(op: string, payload: Record<string, unknown> = {}) {
  return ipcRenderer.invoke('admin:op', op, payload) as Promise<
    { ok: true; dados: Record<string, unknown> } | { ok: false; mensagem: string }
  >
}

const api: ElectronAPI = {
  getState: () => ipcRenderer.invoke('app:getState'),
  health: () => ipcRenderer.invoke('app:health'),
  ativar: (payload) => ipcRenderer.invoke('auth:ativar', payload),
  logout: () => ipcRenderer.invoke('auth:logout'),
  listarLancamentos: () => ipcRenderer.invoke('lancamentos:listar'),
  criarLancamento: (input) => ipcRenderer.invoke('lancamentos:criar', input),
  finalizarLancamento: (id) => ipcRenderer.invoke('lancamentos:finalizar', id),
  cancelarLancamento: (id) => ipcRenderer.invoke('lancamentos:cancelar', id),
  sync: () => ipcRenderer.invoke('sync:run'),
  machineName: () => ipcRenderer.invoke('app:machineName'),
  version: () => ipcRenderer.invoke('app:version'),
  adminOp,
  adminListarUsuarios: async () => {
    const res = await adminOp('listar_usuarios')
    if (!res.ok) return res
    return { ok: true as const, usuarios: (res.dados.usuarios as never[]) || [] }
  },
  adminListarUnidades: async () => {
    const res = await adminOp('listar_unidades')
    if (!res.ok) return res
    return { ok: true as const, unidades: (res.dados.unidades as never[]) || [] }
  },
  adminCriarUsuario: async (input: CriarUsuarioInput) => {
    const res = await adminOp('criar_usuario', { ...input })
    if (!res.ok) return res
    return {
      ok: true as const,
      usuario: res.dados.usuario as never,
      codigo_ativacao: String(res.dados.codigo_ativacao || ''),
      expira_em: String(res.dados.expira_em || '')
    }
  },
  adminCriarUnidade: async (input: CriarUnidadeInput) => {
    const res = await adminOp('criar_unidade', { ...input })
    if (!res.ok) return res
    return {
      ok: true as const,
      id: String(res.dados.id || ''),
      nome: String(res.dados.nome || '')
    }
  },
  adminEmitirCodigo: async (email: string) => {
    const res = await adminOp('emitir_codigo', { email })
    if (!res.ok) return res
    return {
      ok: true as const,
      email: String(res.dados.email || email),
      codigo: String(res.dados.codigo || ''),
      expira_em: String(res.dados.expira_em || '')
    }
  },
  adminAtualizarUsuario: async (input) => {
    const res = await adminOp('atualizar_usuario', { ...input })
    if (!res.ok) return res
    return { ok: true as const, usuario: res.dados.usuario as never }
  },
  adminAtualizarUnidade: async (input) => {
    const res = await adminOp('atualizar_unidade', { ...input })
    if (!res.ok) return res
    return { ok: true as const, unidade: res.dados.unidade as never }
  }
}

contextBridge.exposeInMainWorld('api', api)
