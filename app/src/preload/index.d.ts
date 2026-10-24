import type {
  AppState,
  CriarUnidadeInput,
  CriarUsuarioInput,
  HealthResult,
  LancamentoLocal,
  NovoLancamentoInput,
  UsuarioCache
} from '../shared/types'

export interface ElectronAPI {
  getState: () => Promise<AppState>
  health: () => Promise<HealthResult>
  ativar: (payload: {
    email: string
    codigo: string
    pin?: string
  }) => Promise<
    | { ok: true; etapa: 'DEFINIR_PIN'; mensagem?: string; email?: string }
    | { ok: true; etapa: 'CONCLUIDO'; usuario: UsuarioCache }
    | { ok: false; codigo: string; mensagem: string }
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
        codigo_ativacao: string
        expira_em: string
      }
    | { ok: false; mensagem: string }
  >
  adminCriarUnidade: (
    input: CriarUnidadeInput
  ) => Promise<{ ok: true; id: string; nome: string } | { ok: false; mensagem: string }>
  adminEmitirCodigo: (
    email: string
  ) => Promise<
    { ok: true; email: string; codigo: string; expira_em: string } | { ok: false; mensagem: string }
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
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
