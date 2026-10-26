const MIN_MINUTOS = 30
const MAX_MINUTOS = 1440
const MOTIVO_MIN = 5
const MOTIVO_MAX = 500

export function hojeIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function validarMinutos(minutos: number): string | null {
  if (!Number.isInteger(minutos)) return 'A duração deve ser um número inteiro de minutos.'
  if (minutos < MIN_MINUTOS || minutos > MAX_MINUTOS) {
    return `A duração deve ser de ${MIN_MINUTOS} a ${MAX_MINUTOS} minutos.`
  }
  if (minutos % 30 !== 0) return 'A duração deve ser em intervalos de 30 minutos.'
  return null
}

export function validarDataServico(data: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return 'Data inválida. Use AAAA-MM-DD.'
  if (data > hojeIsoDate()) return 'A data do serviço não pode ser futura.'
  return null
}

export function validarMotivo(motivo: string): string | null {
  const t = motivo.trim()
  if (t.length < MOTIVO_MIN || t.length > MOTIVO_MAX) {
    return `O motivo deve conter de ${MOTIVO_MIN} a ${MOTIVO_MAX} caracteres.`
  }
  return null
}

export function formatarHoras(minutos: number): string {
  const neg = minutos < 0
  const abs = Math.abs(minutos)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  let s = ''
  if (h > 0 && m > 0) s = `${h}h${String(m).padStart(2, '0')}`
  else if (h > 0) s = `${h}h`
  else s = `${m}min`
  return neg ? `-${s}` : s
}

export function rotuloStatus(status: string): string {
  switch (status) {
    case 'RASCUNHO':
      return 'Rascunho local'
    case 'PENDENTE_ENVIO':
      return 'Pendente de envio'
    case 'AGUARDANDO_APROVACAO':
      return 'Aguardando aprovação'
    case 'APROVADO':
      return 'Aprovado'
    case 'REJEITADO':
      return 'Rejeitado'
    case 'CANCELADO':
      return 'Cancelado'
    default:
      return status
  }
}

export function rotuloTipo(tipo: string): string {
  switch (tipo) {
    case 'HORA_EXTRA':
      return 'Hora extra'
    case 'COMPENSACAO':
      return 'Compensação'
    case 'ESTORNO':
      return 'Estorno'
    default:
      return tipo
  }
}

/** Política de senha forte (espelha o backend). */
export const SENHA_MIN = 8

export function validarSenhaForte(senha: string): string | null {
  const s = senha || ''
  if (
    s.length < SENHA_MIN ||
    !/[A-Z]/.test(s) ||
    !/[a-z]/.test(s) ||
    !/[0-9]/.test(s) ||
    !/[^A-Za-z0-9]/.test(s)
  ) {
    return `A senha deve ter no mínimo ${SENHA_MIN} caracteres, com letra maiúscula, minúscula, número e caractere especial.`
  }
  return null
}

export function mensagemErroApi(codigo: string, mensagem: string): string {
  const map: Record<string, string> = {
    NAO_AUTORIZADO: 'Acesso não autorizado. Ative o dispositivo novamente.',
    USUARIO_INATIVO: 'Seu usuário está inativo. Fale com o administrador.',
    SENHA_INVALIDA: 'E-mail ou senha inválidos.',
    VALIDACAO: 'Dados inválidos.',
    VERSAO_ANTIGA: 'Esta versão do app está desatualizada. Atualize para continuar.',
    BLOQUEADO: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
    OCUPADO: 'O servidor está ocupado. Tente novamente em instantes.',
    ACAO_INVALIDA: 'Ação não reconhecida pelo servidor.',
    ERRO_INTERNO: 'Erro interno no servidor. Tente mais tarde.'
  }
  // Prefere a mensagem específica do servidor/cliente quando existir
  if (mensagem && mensagem.trim()) {
    if (codigo === 'VALIDACAO' || codigo === 'ERRO_INTERNO') return mensagem
  }
  return map[codigo] || mensagem || 'Falha na comunicação com o servidor.'
}
