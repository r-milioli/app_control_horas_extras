export function saudacao(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function primeiroNome(nome: string | undefined): string {
  if (!nome) return ''
  return nome.trim().split(/\s+/)[0] || ''
}
