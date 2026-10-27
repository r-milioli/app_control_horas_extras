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
  login: (payload) => ipcRenderer.invoke('auth:login', payload),
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
  adminListarPainel: async () => {
    const res = await adminOp('listar_painel')
    if (!res.ok) return res
    return {
      ok: true as const,
      usuarios: (res.dados.usuarios as never[]) || [],
      unidades: (res.dados.unidades as never[]) || []
    }
  },
  adminCriarUsuario: async (input: CriarUsuarioInput) => {
    const res = await adminOp('criar_usuario', { ...input })
    if (!res.ok) return res
    return {
      ok: true as const,
      usuario: res.dados.usuario as never,
      senha_inicial: String(res.dados.senha_inicial || '')
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
  adminRedefinirSenha: async (email: string) => {
    const res = await adminOp('redefinir_senha', { email })
    if (!res.ok) return res
    return {
      ok: true as const,
      email: String(res.dados.email || email),
      senha_inicial: String(res.dados.senha_inicial || ''),
      mensagem: res.dados.mensagem ? String(res.dados.mensagem) : undefined
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
  },
  atualizarPerfil: (input) => ipcRenderer.invoke('perfil:atualizar', input),
  alterarSenha: (input) => ipcRenderer.invoke('perfil:alterarSenha', input),
  listarPendencias: () => ipcRenderer.invoke('aprovacoes:pendencias'),
  decidirPendencias: (input) => ipcRenderer.invoke('aprovacoes:decidir', input)
}

contextBridge.exposeInMainWorld('api', api)
