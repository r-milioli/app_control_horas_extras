import type {
  AppState,
  CriarUnidadeInput,
  CriarUsuarioInput,
  DecidirResultado,
  DecisaoAprovacao,
  HealthResult,
  LancamentoLocal,
  NovoLancamentoInput,
  PendenciaAprovacao,
  UsuarioCache
} from '../shared/types'

export interface ElectronAPI {
  getState: () => Promise<AppState>
  health: () => Promise<HealthResult>
  login: (payload: {
    email: string
    senha: string
  }) => Promise<
    { ok: true; usuario: UsuarioCache } | { ok: false; codigo: string; mensagem: string }
  >
  logout: () => Promise<{ ok: boolean }>
  listarLancamentos: () => Promise<LancamentoLocal[]>
  criarLancamento: (
    input: NovoLancamentoInput
  ) => Promise<{ ok: true; item: LancamentoLocal } | { ok: false; mensagem: string }>
  finalizarLancamento: (
    id: string
  ) => Promise<{ ok: true; item: LancamentoLocal } | { ok: false; mensagem: string }>
  cancelarLancamento: (id: string) => Promise<{ ok: true } | { ok: false; mensagem: string }>
  sync: () => Promise<{
    ok: boolean
    enviados: number
    falhas: number
    mudancas: number
    mensagem: string
    clockSkewWarning: boolean
    state: AppState
  }>
  machineName: () => Promise<string>
  version: () => Promise<string>
  adminOp: (
    op: string,
    payload?: Record<string, unknown>
  ) => Promise<{ ok: true; dados: Record<string, unknown> } | { ok: false; mensagem: string }>
  /** Helpers tipados (mesmo canal adminOp) */
  adminListarUsuarios: () => Promise<
    { ok: true; usuarios: import('../shared/types').AdminUsuario[] } | { ok: false; mensagem: string }
  >
  adminListarUnidades: () => Promise<
    { ok: true; unidades: import('../shared/types').AdminUnidade[] } | { ok: false; mensagem: string }
  >
  /** Usuários + unidades em uma única ida ao Apps Script */
  adminListarPainel: () => Promise<
    | {
        ok: true
        usuarios: import('../shared/types').AdminUsuario[]
        unidades: import('../shared/types').AdminUnidade[]
      }
    | { ok: false; mensagem: string }
  >
  adminCriarUsuario: (
    input: CriarUsuarioInput
  ) => Promise<
    | {
        ok: true
        usuario: import('../shared/types').AdminUsuario
        senha_inicial: string
      }
    | { ok: false; mensagem: string }
  >
  adminCriarUnidade: (
    input: CriarUnidadeInput
  ) => Promise<{ ok: true; id: string; nome: string } | { ok: false; mensagem: string }>
  adminRedefinirSenha: (
    email: string
  ) => Promise<
    | { ok: true; email: string; senha_inicial: string; mensagem?: string }
    | { ok: false; mensagem: string }
  >
  adminAtualizarUsuario: (input: {
    email: string
    nome?: string
    matricula?: string
    unidade_id?: string
    perfis?: string[]
    ativo?: 'SIM' | 'NAO'
  }) => Promise<
    { ok: true; usuario: import('../shared/types').AdminUsuario } | { ok: false; mensagem: string }
  >
  adminAtualizarUnidade: (input: {
    id: string
    nome?: string
    comandante_email?: string
    ativa?: 'SIM' | 'NAO'
  }) => Promise<
    { ok: true; unidade: import('../shared/types').AdminUnidade } | { ok: false; mensagem: string }
  >
  atualizarPerfil: (input: {
    nome: string
  }) => Promise<{ ok: true; mensagem?: string } | { ok: false; mensagem: string }>
  alterarSenha: (input: {
    senha_atual: string
    senha_nova: string
  }) => Promise<{ ok: true; mensagem?: string } | { ok: false; mensagem: string }>
  listarPendencias: () => Promise<
    | {
        ok: true
        pendencias: PendenciaAprovacao[]
        dias_alerta_pendencia: number
      }
    | { ok: false; mensagem: string }
  >
  decidirPendencias: (input: {
    ids: string[]
    decisao: DecisaoAprovacao
    senha: string
    motivo_rejeicao?: string
  }) => Promise<
    { ok: true; resultados: DecidirResultado[] } | { ok: false; mensagem: string }
  >
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
