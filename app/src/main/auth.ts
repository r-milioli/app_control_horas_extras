import { safeStorage, app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { UsuarioCache } from '../shared/types'

interface Credenciais {
  email: string
  token: string
}

function vaultPath(): string {
  const dir = join(app.getPath('userData'), 'secure')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'creds.bin')
}

function metaPath(): string {
  return join(app.getPath('userData'), 'secure', 'session.json')
}

export function salvarCredenciais(email: string, token: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Cofre do Windows indisponível. Não é possível guardar o token com segurança.')
  }
  const payload = Buffer.from(JSON.stringify({ email, token } satisfies Credenciais), 'utf8')
  const encrypted = safeStorage.encryptString(payload.toString('utf8'))
  writeFileSync(vaultPath(), encrypted)
}

export function lerCredenciais(): Credenciais | null {
  const path = vaultPath()
  if (!existsSync(path)) return null
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    const encrypted = readFileSync(path)
    const plain = safeStorage.decryptString(encrypted)
    const data = JSON.parse(plain) as Credenciais
    if (!data.email || !data.token) return null
    return data
  } catch {
    return null
  }
}

export function limparCredenciais(): void {
  const path = vaultPath()
  if (existsSync(path)) {
    writeFileSync(path, Buffer.alloc(0))
  }
  const meta = metaPath()
  if (existsSync(meta)) {
    writeFileSync(meta, '{}')
  }
}

export function salvarSessaoUsuario(usuario: UsuarioCache): void {
  const dir = join(app.getPath('userData'), 'secure')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(metaPath(), JSON.stringify({ activated: true, email: usuario.email }, null, 2))
}

export function estaAtivado(): boolean {
  return lerCredenciais() !== null
}
