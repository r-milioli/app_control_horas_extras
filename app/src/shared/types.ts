export const APP_VERSION = '1.0.0'

export type TipoLancamento = 'HORA_EXTRA' | 'COMPENSACAO' | 'ESTORNO'

export type StatusLocal =
  | 'RASCUNHO'
  | 'PENDENTE_ENVIO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'CANCELADO'

export interface UsuarioCache {
  email: string
  nome: string
  matricula: string
  unidade_id: string
  perfis: string
  saldo_minutos: number
  saldo_legivel: string
  creditos_min: number
  debitos_min: number
}

export interface LancamentoLocal {
  id: string
  tipo: TipoLancamento
  data: string
  minutos: number
  motivo: string
  status: StatusLocal
  criado_em: string
  ref_id: string
  recebido_em: string
  atualizado_em: string
  motivo_rejeicao: string
  decidido_por: string
  decidido_em: string
}

export interface NovoLancamentoInput {
  tipo: 'HORA_EXTRA' | 'COMPENSACAO'
  data: string
  minutos: number
  motivo: string
  finalizar: boolean
  ref_id?: string
}

export interface ApiErrorBody {
  ok: false
  codigo: string
  mensagem: string
}

export interface ApiSuccessBody<T = unknown> {
  ok: true
  dados: T
}

export type ApiResponse<T = unknown> = ApiSuccessBody<T> | ApiErrorBody

export interface AtivarResult {
  etapa: 'DEFINIR_PIN' | 'CONCLUIDO'
  mensagem?: string
  email?: string
  token?: string
  dispositivo_id?: string
  usuario?: {
    email: string
    nome: string
    matricula: string
    unidade_id: string
    perfis: string[]
  }
}

export interface SyncResult {
  enviados: Array<{
    id: string
    ok: boolean
    status?: string
    duplicado?: boolean
    codigo?: string
    mensagem?: string
  }>
  mudancas: Array<Record<string, string>>
  cursor: string
  saldo: {
    matricula: string
    minutos: number
    legivel: string
    creditos_min: number
    debitos_min: number
    estornos_extra_min?: number
    estornos_comp_min?: number
    extrato?: unknown[]
  }
  config: {
    versao_minima: string
    dias_alerta_pendencia: number
  }
  servidor_em: string
}

export interface AppState {
  activated: boolean
  online: boolean
  usuario: UsuarioCache | null
  pendentesEnvio: number
  clockSkewWarning: boolean
  lastSyncAt: string | null
}

export interface HealthResult {
  ok: boolean
  dados?: {
    servico: string
    versao_api: number
    hora: string
  }
  mensagem?: string
}
