export type PerfilApp = 'POLICIAL' | 'COMANDANTE' | 'ADMIN'

export function parsePerfis(raw: string | undefined | null): PerfilApp[] {
  const list = String(raw || '')
    .split(',')
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean) as PerfilApp[]
  const allowed: PerfilApp[] = ['POLICIAL', 'COMANDANTE', 'ADMIN']
  const unique = [...new Set(list.filter((p) => allowed.includes(p)))]
  return unique.length ? unique : ['POLICIAL']
}

export function rotuloPerfil(p: PerfilApp): string {
  switch (p) {
    case 'ADMIN':
      return 'Administrador'
    case 'COMANDANTE':
      return 'Comandante'
    default:
      return 'Policial'
  }
}

export function iniciaisNome(nome: string | undefined): string {
  if (!nome) return '?'
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
