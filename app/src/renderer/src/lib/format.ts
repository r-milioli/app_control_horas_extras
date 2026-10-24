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

export function classeStatus(status: string): string {
  if (status === 'APROVADO') return 'status status-approved'
  if (status === 'REJEITADO' || status === 'CANCELADO') return 'status status-rejected'
  if (status === 'RASCUNHO' || status === 'PENDENTE_ENVIO') return 'status status-draft'
  return 'status status-pending'
}

export function rotuloTipo(tipo: string): string {
  if (tipo === 'HORA_EXTRA') return 'Hora extra'
  if (tipo === 'COMPENSACAO') return 'Compensação'
  if (tipo === 'ESTORNO') return 'Estorno'
  return tipo
}

export function classeTipo(tipo: string): string {
  return tipo === 'COMPENSACAO' ? 'type-pill type-debit' : 'type-pill type-credit'
}

export function formatarDataBr(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

export function hojeIsoDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
