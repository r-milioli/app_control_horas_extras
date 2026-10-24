import type { LancamentoLocal } from '../../../shared/types'
import { formatarDataBr, formatarHoras, rotuloStatus, rotuloTipo } from './format'

function esc(v: string): string {
  const t = v.replace(/^[=+\-@]/, "'$&")
  if (/[;"\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

export function exportarResumoCsv(itens: LancamentoLocal[], nomeArquivo = 'resumo-horas.csv'): void {
  const header = ['ID', 'Tipo', 'Data', 'Duracao', 'Minutos', 'Status', 'Motivo']
  const lines = [
    header.join(';'),
    ...itens.map((r) =>
      [
        esc(r.id),
        esc(rotuloTipo(r.tipo)),
        esc(formatarDataBr(r.data)),
        esc(formatarHoras(r.minutos)),
        String(r.minutos),
        esc(rotuloStatus(r.status)),
        esc(r.motivo)
      ].join(';')
    )
  ]
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(url)
}
