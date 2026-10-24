import type {
  AppState,
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
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
