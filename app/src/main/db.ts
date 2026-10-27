import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { app } from 'electron'
import { createRequire } from 'module'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const nodeRequire = createRequire(__filename)
import type { LancamentoLocal, NovoLancamentoInput, UsuarioCache } from '../shared/types'
import { validarDataServico, validarMinutos, validarMotivo, formatarHoras } from '../shared/validation'
import { v4 as uuidv4 } from 'uuid'

let db: SqlJsDatabase | null = null
let dbPath = ''

const SCHEMA_VERSION = 2

function persist(): void {
  if (!db || !dbPath) return
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

export async function openDb(): Promise<SqlJsDatabase> {
  if (db) return db
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  dbPath = join(dir, 'horas-extras.sqlite')

  const SQL = await initSqlJs({
    locateFile: (file) => {
      try {
        return nodeRequire.resolve(`sql.js/dist/${file}`)
      } catch {
        return join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
      }
    }
  })

  if (existsSync(dbPath)) {
    db = new SQL.Database(readFileSync(dbPath))
  } else {
    db = new SQL.Database()
  }
  migrate(db)
  persist()
  return db
}

function migrate(database: SqlJsDatabase): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS meta (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `)
  database.run(`
    CREATE TABLE IF NOT EXISTS lancamentos (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      data TEXT NOT NULL,
      minutos INTEGER NOT NULL,
      motivo TEXT NOT NULL,
      status TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      ref_id TEXT NOT NULL DEFAULT '',
      recebido_em TEXT NOT NULL DEFAULT '',
      atualizado_em TEXT NOT NULL DEFAULT '',
      motivo_rejeicao TEXT NOT NULL DEFAULT '',
      decidido_por TEXT NOT NULL DEFAULT '',
      decidido_em TEXT NOT NULL DEFAULT ''
    );
  `)
  database.run(`
    CREATE TABLE IF NOT EXISTS usuario_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      email TEXT NOT NULL,
      nome TEXT NOT NULL,
      matricula TEXT NOT NULL,
      unidade_id TEXT NOT NULL,
      perfis TEXT NOT NULL,
      saldo_minutos INTEGER NOT NULL DEFAULT 0,
      saldo_legivel TEXT NOT NULL DEFAULT '0min',
      creditos_min INTEGER NOT NULL DEFAULT 0,
      debitos_min INTEGER NOT NULL DEFAULT 0
    );
  `)
  database.run(`
    CREATE TABLE IF NOT EXISTS config_cache (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `)

  const check = database.exec(`SELECT valor FROM meta WHERE chave = 'schema_version'`)
  let version = 0
  if (check.length && check[0].values.length) {
    version = Number(check[0].values[0][0]) || 0
  } else {
    database.run(`INSERT INTO meta (chave, valor) VALUES (?, ?)`, ['schema_version', '0'])
  }

  if (version < 2) {
    const cols = database.exec(`PRAGMA table_info(lancamentos)`)
    const names = new Set(
      (cols[0]?.values || []).map((row) => String(row[1] || ''))
    )
    if (!names.has('nome')) database.run(`ALTER TABLE lancamentos ADD COLUMN nome TEXT NOT NULL DEFAULT ''`)
    if (!names.has('matricula')) {
      database.run(`ALTER TABLE lancamentos ADD COLUMN matricula TEXT NOT NULL DEFAULT ''`)
    }
    if (!names.has('unidade_id')) {
      database.run(`ALTER TABLE lancamentos ADD COLUMN unidade_id TEXT NOT NULL DEFAULT ''`)
    }
    if (!names.has('criado_por')) {
      database.run(`ALTER TABLE lancamentos ADD COLUMN criado_por TEXT NOT NULL DEFAULT ''`)
    }
    // Rebaixa o cursor para a próxima sync trazer de novo os campos de autor/unidade
    database.run(
      `INSERT OR REPLACE INTO config_cache (chave, valor) VALUES ('cursor', '')`
    )
  }

  database.run(`INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)`, [
    'schema_version',
    String(SCHEMA_VERSION)
  ])
}

export function closeDb(): void {
  if (db) {
    persist()
    db.close()
    db = null
  }
}

function requireDb(): SqlJsDatabase {
  if (!db) throw new Error('Banco local ainda não foi aberto.')
  return db
}

function queryAll(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const database = requireDb()
  const stmt = database.prepare(sql)
  stmt.bind(params as never[])
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, unknown>)
  }
  stmt.free()
  return rows
}

function queryOne(sql: string, params: unknown[] = []): Record<string, unknown> | undefined {
  return queryAll(sql, params)[0]
}

function run(sql: string, params: unknown[] = []): void {
  requireDb().run(sql, params as never[])
  persist()
}

export function setConfig(chave: string, valor: string): void {
  run(
    `INSERT INTO config_cache (chave, valor) VALUES (?, ?)
     ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
    [chave, valor]
  )
}

export function getConfig(chave: string, fallback = ''): string {
  const row = queryOne('SELECT valor FROM config_cache WHERE chave = ?', [chave])
  return row ? String(row.valor) : fallback
}

/** Limpa dados locais ao trocar de usuário (logout). */
export function limparDadosSessaoLocal(): void {
  const database = db
  if (!database) return
  database.run('DELETE FROM lancamentos')
  database.run('DELETE FROM usuario_cache')
  database.run(`DELETE FROM config_cache WHERE chave IN ('last_sync_at', 'cursor', 'clock_skew')`)
  persist()
}

export function salvarUsuarioCache(u: UsuarioCache): void {
  run(
    `INSERT INTO usuario_cache (id, email, nome, matricula, unidade_id, perfis, saldo_minutos, saldo_legivel, creditos_min, debitos_min)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email=excluded.email, nome=excluded.nome, matricula=excluded.matricula,
       unidade_id=excluded.unidade_id, perfis=excluded.perfis,
       saldo_minutos=excluded.saldo_minutos, saldo_legivel=excluded.saldo_legivel,
       creditos_min=excluded.creditos_min, debitos_min=excluded.debitos_min`,
    [
      u.email,
      u.nome,
      u.matricula,
      u.unidade_id,
      u.perfis,
      u.saldo_minutos,
      u.saldo_legivel,
      u.creditos_min,
      u.debitos_min
    ]
  )
}

export function lerUsuarioCache(): UsuarioCache | null {
  const row = queryOne('SELECT * FROM usuario_cache WHERE id = 1')
  if (!row) return null
  return {
    email: String(row.email),
    nome: String(row.nome),
    matricula: String(row.matricula),
    unidade_id: String(row.unidade_id),
    perfis: String(row.perfis),
    saldo_minutos: Number(row.saldo_minutos),
    saldo_legivel: String(row.saldo_legivel),
    creditos_min: Number(row.creditos_min),
    debitos_min: Number(row.debitos_min)
  }
}

export function atualizarSaldoCache(saldo: {
  minutos: number
  legivel: string
  creditos_min: number
  debitos_min: number
}): void {
  run(`UPDATE usuario_cache SET saldo_minutos=?, saldo_legivel=?, creditos_min=?, debitos_min=? WHERE id=1`, [
    saldo.minutos,
    saldo.legivel,
    saldo.creditos_min,
    saldo.debitos_min
  ])
}

function rowToLancamento(r: Record<string, unknown>): LancamentoLocal {
  return {
    id: String(r.id),
    tipo: r.tipo as LancamentoLocal['tipo'],
    data: String(r.data),
    minutos: Number(r.minutos),
    motivo: String(r.motivo),
    status: r.status as LancamentoLocal['status'],
    criado_em: String(r.criado_em),
    ref_id: String(r.ref_id || ''),
    recebido_em: String(r.recebido_em || ''),
    atualizado_em: String(r.atualizado_em || ''),
    motivo_rejeicao: String(r.motivo_rejeicao || ''),
    decidido_por: String(r.decidido_por || ''),
    decidido_em: String(r.decidido_em || ''),
    nome: String(r.nome || ''),
    matricula: String(r.matricula || ''),
    unidade_id: String(r.unidade_id || ''),
    criado_por: String(r.criado_por || '')
  }
}

export function listarLancamentos(): LancamentoLocal[] {
  return queryAll('SELECT * FROM lancamentos ORDER BY criado_em DESC').map(rowToLancamento)
}

export function contarPendentesEnvio(): number {
  const row = queryOne(`SELECT COUNT(*) AS c FROM lancamentos WHERE status = 'PENDENTE_ENVIO'`)
  return Number(row?.c || 0)
}

export function listarPendentesEnvio(limit: number): LancamentoLocal[] {
  return queryAll(
    `SELECT * FROM lancamentos WHERE status = 'PENDENTE_ENVIO' ORDER BY criado_em ASC LIMIT ?`,
    [limit]
  ).map(rowToLancamento)
}

export function criarLancamento(input: NovoLancamentoInput): LancamentoLocal {
  const errMin = validarMinutos(input.minutos)
  if (errMin) throw new Error(errMin)
  const errData = validarDataServico(input.data)
  if (errData) throw new Error(errData)
  const errMotivo = validarMotivo(input.motivo)
  if (errMotivo) throw new Error(errMotivo)

  const usuario = lerUsuarioCache()
  const agora = new Date().toISOString()
  const item: LancamentoLocal = {
    id: uuidv4(),
    tipo: input.tipo,
    data: input.data,
    minutos: input.minutos,
    motivo: input.motivo.trim(),
    status: input.finalizar ? 'PENDENTE_ENVIO' : 'RASCUNHO',
    criado_em: agora,
    ref_id: input.ref_id || '',
    recebido_em: '',
    atualizado_em: agora,
    motivo_rejeicao: '',
    decidido_por: '',
    decidido_em: '',
    nome: usuario?.nome || '',
    matricula: usuario?.matricula || '',
    unidade_id: usuario?.unidade_id || '',
    criado_por: (usuario?.email || '').trim().toLowerCase()
  }

  run(
    `INSERT INTO lancamentos
     (id, tipo, data, minutos, motivo, status, criado_em, ref_id, recebido_em, atualizado_em, motivo_rejeicao, decidido_por, decidido_em, nome, matricula, unidade_id, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.tipo,
      item.data,
      item.minutos,
      item.motivo,
      item.status,
      item.criado_em,
      item.ref_id,
      item.recebido_em,
      item.atualizado_em,
      item.motivo_rejeicao,
      item.decidido_por,
      item.decidido_em,
      item.nome,
      item.matricula,
      item.unidade_id,
      item.criado_por
    ]
  )

  return item
}

export function finalizarLancamento(id: string): LancamentoLocal {
  const row = queryOne('SELECT * FROM lancamentos WHERE id = ?', [id])
  if (!row) throw new Error('Lançamento não encontrado.')
  if (row.status !== 'RASCUNHO') throw new Error('Só é possível finalizar rascunhos.')
  const agora = new Date().toISOString()
  run(`UPDATE lancamentos SET status = 'PENDENTE_ENVIO', atualizado_em = ? WHERE id = ?`, [agora, id])
  return rowToLancamento({ ...row, status: 'PENDENTE_ENVIO', atualizado_em: agora })
}

export function atualizarStatusAposEnvio(
  id: string,
  status: string,
  extras: Partial<LancamentoLocal> = {}
): void {
  const agora = new Date().toISOString()
  const current = queryOne('SELECT * FROM lancamentos WHERE id = ?', [id])
  if (!current) return
  run(
    `UPDATE lancamentos SET
      status = ?,
      recebido_em = ?,
      atualizado_em = ?,
      motivo_rejeicao = ?,
      decidido_por = ?,
      decidido_em = ?
     WHERE id = ?`,
    [
      status,
      extras.recebido_em || String(current.recebido_em || ''),
      extras.atualizado_em || agora,
      extras.motivo_rejeicao || String(current.motivo_rejeicao || ''),
      extras.decidido_por || String(current.decidido_por || ''),
      extras.decidido_em || String(current.decidido_em || ''),
      id
    ]
  )
}

export function upsertMudancaServidor(m: Record<string, string>): void {
  const existente = queryOne('SELECT id FROM lancamentos WHERE id = ?', [m.id])
  const item = {
    id: m.id,
    tipo: m.tipo || 'HORA_EXTRA',
    data: m.data || '',
    minutos: Number(m.minutos) || 0,
    motivo: m.motivo || '',
    status: m.status || 'AGUARDANDO_APROVACAO',
    criado_em: m.criado_em || new Date().toISOString(),
    ref_id: m.ref_id || '',
    recebido_em: m.recebido_em || '',
    atualizado_em: m.atualizado_em || new Date().toISOString(),
    motivo_rejeicao: m.motivo_rejeicao || '',
    decidido_por: m.decidido_por || '',
    decidido_em: m.decidido_em || '',
    nome: m.nome || '',
    matricula: m.matricula || '',
    unidade_id: String(m.unidade_id || '').trim(),
    criado_por: String(m.criado_por || '').trim().toLowerCase()
  }

  if (existente) {
    run(
      `UPDATE lancamentos SET
        tipo=?, data=?, minutos=?, motivo=?, status=?,
        ref_id=?, recebido_em=?, atualizado_em=?,
        motivo_rejeicao=?, decidido_por=?, decidido_em=?,
        nome=?, matricula=?, unidade_id=?, criado_por=?
       WHERE id=?`,
      [
        item.tipo,
        item.data,
        item.minutos,
        item.motivo,
        item.status,
        item.ref_id,
        item.recebido_em,
        item.atualizado_em,
        item.motivo_rejeicao,
        item.decidido_por,
        item.decidido_em,
        item.nome,
        item.matricula,
        item.unidade_id,
        item.criado_por,
        item.id
      ]
    )
  } else {
    run(
      `INSERT INTO lancamentos
       (id, tipo, data, minutos, motivo, status, criado_em, ref_id, recebido_em, atualizado_em, motivo_rejeicao, decidido_por, decidido_em, nome, matricula, unidade_id, criado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.tipo,
        item.data,
        item.minutos,
        item.motivo,
        item.status,
        item.criado_em,
        item.ref_id,
        item.recebido_em,
        item.atualizado_em,
        item.motivo_rejeicao,
        item.decidido_por,
        item.decidido_em,
        item.nome,
        item.matricula,
        item.unidade_id,
        item.criado_por
      ]
    )
  }
}

export function marcarCanceladoLocal(id: string): void {
  const agora = new Date().toISOString()
  run(`UPDATE lancamentos SET status = 'CANCELADO', atualizado_em = ? WHERE id = ?`, [agora, id])
}

export function obterLancamento(id: string): LancamentoLocal | null {
  const row = queryOne('SELECT * FROM lancamentos WHERE id = ?', [id])
  return row ? rowToLancamento(row) : null
}

export { formatarHoras }
