import type { LancamentoLocal } from '../../../shared/types'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export interface MesChart {
  label: string
  key: string
  extras: number
  comps: number
}

/** Últimos 6 meses com minutos aprovados (extras x compensações). */
export function movimentacaoSeisMeses(itens: LancamentoLocal[]): MesChart[] {
  const agora = new Date()
  const buckets: MesChart[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({ label: MESES[d.getMonth()], key, extras: 0, comps: 0 })
  }
  const map = new Map(buckets.map((b) => [b.key, b]))
  for (const r of itens) {
    if (r.status !== 'APROVADO') continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.data)) continue
    const key = r.data.slice(0, 7)
    const b = map.get(key)
    if (!b) continue
    if (r.tipo === 'HORA_EXTRA') b.extras += r.minutos
    if (r.tipo === 'COMPENSACAO') b.comps += r.minutos
  }
  return buckets
}

export function alturasBarras(itens: MesChart[]): Array<{ extrasPct: number; compsPct: number }> {
  const max = Math.max(1, ...itens.flatMap((m) => [m.extras, m.comps]))
  return itens.map((m) => ({
    extrasPct: Math.max(4, Math.round((m.extras / max) * 100)),
    compsPct: Math.max(4, Math.round((m.comps / max) * 100))
  }))
}
