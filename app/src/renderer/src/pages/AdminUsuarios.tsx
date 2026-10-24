import { FormEvent, useCallback, useEffect, useState } from 'react'
import type { AdminUnidade, AdminUsuario } from '../../../shared/types'
import { IconPlus, IconUsers } from '../components/Icons'
import { rotuloPerfil, type PerfilApp } from '../lib/roles'

interface Props {
  online: boolean
  notify: (msg: string) => void
}

export default function AdminUsuarios({ online, notify }: Props) {
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([])
  const [unidades, setUnidades] = useState<AdminUnidade[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalUser, setModalUser] = useState(false)
  const [perfilInicial, setPerfilInicial] = useState<'POLICIAL' | 'COMANDANTE' | 'ADMIN'>('POLICIAL')
  const [modalUnidade, setModalUnidade] = useState(false)
  const [editUser, setEditUser] = useState<AdminUsuario | null>(null)
  const [editUnidade, setEditUnidade] = useState<AdminUnidade | null>(null)
  const [codigoInfo, setCodigoInfo] = useState<{
    email: string
    codigo: string
    expira_em: string
  } | null>(null)

  const carregar = useCallback(async () => {
    if (!online) {
      setLoading(false)
      notify('É preciso estar online para carregar a administração.')
      return
    }
    setLoading(true)
    try {
      const [u, un] = await Promise.all([
        window.api.adminListarUsuarios(),
        window.api.adminListarUnidades()
      ])
      if (!u.ok) {
        notify(u.mensagem)
        return
      }
      if (!un.ok) {
        notify(un.mensagem)
        return
      }
      setUsuarios(u.usuarios)
      setUnidades(un.unidades)
    } finally {
      setLoading(false)
    }
  }, [online, notify])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const filtrados = usuarios.filter((u) => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (
      u.nome.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.matricula.toLowerCase().includes(q) ||
      u.unidade_id.toLowerCase().includes(q)
    )
  })

  const ativos = usuarios.filter((u) => String(u.ativo).toUpperCase() === 'SIM').length
  const unidadesAtivas = unidades.filter((u) => String(u.ativa).toUpperCase() === 'SIM').length

  async function emitirCodigo(email: string) {
    if (!online) {
      notify('É preciso estar online.')
      return
    }
    const res = await window.api.adminEmitirCodigo(email)
    if (!res.ok) {
      notify(res.mensagem)
      return
    }
    setCodigoInfo({ email: res.email, codigo: res.codigo, expira_em: res.expira_em })
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Acesso e estrutura</div>
          <h1>Usuários e unidades</h1>
          <p>Cadastre policiais, comandantes, administradores e a estrutura de unidades.</p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!online}
            onClick={() => setModalUnidade(true)}
          >
            <IconPlus size={16} />
            Nova unidade
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!online}
            onClick={() => {
              setPerfilInicial('POLICIAL')
              setModalUser(true)
            }}
          >
            <IconPlus size={16} />
            Novo policial
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!online}
            onClick={() => {
              setPerfilInicial('COMANDANTE')
              setModalUser(true)
            }}
          >
            <IconPlus size={16} />
            Novo comandante
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!online}
            onClick={() => {
              setPerfilInicial('ADMIN')
              setModalUser(true)
            }}
          >
            <IconPlus size={16} />
            Novo administrador
          </button>
        </div>
      </div>

      {!online && (
        <div className="alert alert-warn">Sem internet. A administração exige conexão.</div>
      )}

      <div className="stats stats-4">
        <article className="stat">
          <div className="stat-top">
            Usuários ativos
            <span className="stat-icon">
              <IconUsers size={18} />
            </span>
          </div>
          <div className="stat-value">{ativos}</div>
          <div className="stat-foot">Cadastro centralizado</div>
        </article>
        <article className="stat">
          <div className="stat-top">Unidades cadastradas</div>
          <div className="stat-value">{unidadesAtivas}</div>
          <div className="stat-foot">Estrutura operacional</div>
        </article>
        <article className="stat">
          <div className="stat-top">Total de usuários</div>
          <div className="stat-value">{usuarios.length}</div>
          <div className="stat-foot">Inclui inativos</div>
        </article>
        <article className="stat">
          <div className="stat-top">Comandantes</div>
          <div className="stat-value">
            {usuarios.filter((u) => u.perfis?.includes('COMANDANTE')).length}
          </div>
          <div className="stat-foot">Com perfil de aprovação</div>
        </article>
      </div>

      <article className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Usuários</h2>
            <p>Nome e matrícula vêm deste cadastro. Ao criar, um código de ativação é gerado.</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void carregar()} disabled={!online || loading}>
            Atualizar
          </button>
        </div>
        <div className="table-tools">
          <div className="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail, matrícula ou unidade..."
            />
          </div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="empty">Carregando…</div>
          ) : filtrados.length === 0 ? (
            <div className="empty">Nenhum usuário encontrado.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Matrícula</th>
                  <th>E-mail</th>
                  <th>Unidade</th>
                  <th>Perfil</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => (
                  <tr key={u.email}>
                    <td>{u.nome}</td>
                    <td>{u.matricula}</td>
                    <td>{u.email}</td>
                    <td>{u.unidade_id}</td>
                    <td>{(u.perfis || []).map((p) => rotuloPerfil(p as PerfilApp)).join(', ')}</td>
                    <td>
                      <span
                        className={
                          String(u.ativo).toUpperCase() === 'SIM'
                            ? 'status status-approved'
                            : 'status status-draft'
                        }
                      >
                        {String(u.ativo).toUpperCase() === 'SIM' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={!online}
                          onClick={() => setEditUser(u)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={!online}
                          onClick={() => void emitirCodigo(u.email)}
                        >
                          Novo código
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="table-foot">
          <span>
            Exibindo {filtrados.length} de {usuarios.length} usuário(s)
          </span>
        </div>
      </article>

      <article className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Unidades</h2>
            <p>Companhias / destacamentos usados no cadastro de usuários.</p>
          </div>
        </div>
        <div className="table-wrap">
          {unidades.length === 0 ? (
            <div className="empty">Nenhuma unidade. Cadastre a primeira para vincular usuários.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Comandante (e-mail)</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {unidades.map((un) => (
                  <tr key={un.id}>
                    <td>{un.id}</td>
                    <td>{un.nome}</td>
                    <td>{un.comandante_email || '—'}</td>
                    <td>
                      <span
                        className={
                          String(un.ativa).toUpperCase() === 'SIM'
                            ? 'status status-approved'
                            : 'status status-draft'
                        }
                      >
                        {String(un.ativa).toUpperCase() === 'SIM' ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={!online}
                        onClick={() => setEditUnidade(un)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </article>

      {modalUser && (
        <ModalCriarUsuario
          key={perfilInicial}
          unidades={unidades}
          perfilInicial={perfilInicial}
          onClose={() => setModalUser(false)}
          onCreated={(info) => {
            setModalUser(false)
            setCodigoInfo(info)
            void carregar()
          }}
          notify={notify}
        />
      )}

      {modalUnidade && (
        <ModalCriarUnidade
          onClose={() => setModalUnidade(false)}
          onCreated={() => {
            setModalUnidade(false)
            notify('Unidade criada.')
            void carregar()
          }}
          notify={notify}
        />
      )}

      {codigoInfo && (
        <ModalCodigoAtivacao info={codigoInfo} onClose={() => setCodigoInfo(null)} notify={notify} />
      )}

      {editUser && (
        <ModalEditarUsuario
          usuario={editUser}
          unidades={unidades}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            setEditUser(null)
            notify('Usuário atualizado.')
            void carregar()
          }}
        />
      )}

      {editUnidade && (
        <ModalEditarUnidade
          unidade={editUnidade}
          onClose={() => setEditUnidade(null)}
          onSaved={() => {
            setEditUnidade(null)
            notify('Unidade atualizada.')
            void carregar()
          }}
        />
      )}
    </div>
  )
}

function ModalCriarUsuario({
  unidades,
  perfilInicial,
  onClose,
  onCreated,
  notify
}: {
  unidades: AdminUnidade[]
  perfilInicial: 'POLICIAL' | 'COMANDANTE' | 'ADMIN'
  onClose: () => void
  onCreated: (info: { email: string; codigo: string; expira_em: string }) => void
  notify: (msg: string) => void
}) {
  const titulos = {
    POLICIAL: { h: 'Novo policial', p: 'Usuário que lança horas extras e compensações.' },
    COMANDANTE: {
      h: 'Novo comandante',
      p: 'Aprova lançamentos da unidade. Definirá um PIN na primeira ativação.'
    },
    ADMIN: {
      h: 'Novo administrador',
      p: 'Acesso ao painel central. Definirá um PIN na primeira ativação.'
    }
  } as const

  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [unidadeId, setUnidadeId] = useState(unidades[0]?.id || '')
  const [perfilBase, setPerfilBase] = useState<'POLICIAL' | 'COMANDANTE' | 'ADMIN'>(perfilInicial)
  const [tambémPolicial, setTambemPolicial] = useState(perfilInicial !== 'POLICIAL')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (!unidadeId) {
      setErro('Cadastre uma unidade antes de criar usuários.')
      return
    }
    const perfis = new Set<string>([perfilBase])
    if (tambémPolicial && perfilBase !== 'POLICIAL') perfis.add('POLICIAL')
    setLoading(true)
    try {
      const res = await window.api.adminCriarUsuario({
        email: email.trim(),
        nome: nome.trim(),
        matricula: matricula.trim(),
        unidade_id: unidadeId,
        perfis: Array.from(perfis)
      })
      if (!res.ok) {
        setErro(res.mensagem)
        return
      }
      notify('Usuário cadastrado.')
      onCreated({
        email: res.usuario.email,
        codigo: res.codigo_ativacao,
        expira_em: res.expira_em
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop open" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>{titulos[perfilInicial].h}</h2>
            <p>{titulos[perfilInicial].p} O código de ativação aparece só uma vez.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={loading} aria-label="Fechar">
            ✕
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="field">
              <label htmlFor="au-nome">Nome</label>
              <input id="au-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="au-email">E-mail</label>
              <input id="au-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="au-mat">Matrícula</label>
              <input id="au-mat" required value={matricula} onChange={(e) => setMatricula(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="au-un">Unidade</label>
              <select id="au-un" required value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
                {unidades.length === 0 && <option value="">Nenhuma unidade</option>}
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id} — {u.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="au-perfil">Função</label>
              <select
                id="au-perfil"
                value={perfilBase}
                onChange={(e) => {
                  const p = e.target.value as typeof perfilBase
                  setPerfilBase(p)
                  if (p !== 'POLICIAL') setTambemPolicial(true)
                }}
              >
                <option value="POLICIAL">Policial</option>
                <option value="COMANDANTE">Comandante</option>
                <option value="ADMIN">Administrador</option>
              </select>
              <div className="field-hint">Você pode ajustar aqui se abriu o botão errado.</div>
            </div>
            {perfilBase !== 'POLICIAL' && (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={tambémPolicial}
                  onChange={(e) => setTambemPolicial(e.target.checked)}
                />
                Também pode lançar as próprias horas (perfil Policial)
              </label>
            )}
            {erro && <div className="alert alert-error">{erro}</div>}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando…' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalCriarUnidade({
  onClose,
  onCreated,
  notify
}: {
  onClose: () => void
  onCreated: () => void
  notify: (msg: string) => void
}) {
  const [id, setId] = useState('')
  const [nome, setNome] = useState('')
  const [comandante, setComandante] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await window.api.adminCriarUnidade({
        id: id.trim().toUpperCase(),
        nome: nome.trim(),
        comandante_email: comandante.trim() || undefined
      })
      if (!res.ok) {
        setErro(res.mensagem)
        return
      }
      onCreated()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop open" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>Nova unidade</h2>
            <p>Ex.: ID CENTRAL ou 1BPM. O ID não deve ter espaços.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={loading} aria-label="Fechar">
            ✕
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="field">
              <label htmlFor="un-id">ID da unidade</label>
              <input
                id="un-id"
                required
                value={id}
                onChange={(e) => setId(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                placeholder="Ex.: 1BPM"
              />
            </div>
            <div className="field">
              <label htmlFor="un-nome">Nome</label>
              <input
                id="un-nome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: 1º BPM"
              />
            </div>
            <div className="field">
              <label htmlFor="un-cmd">E-mail do comandante (opcional)</label>
              <input
                id="un-cmd"
                type="email"
                value={comandante}
                onChange={(e) => setComandante(e.target.value)}
              />
            </div>
            {erro && <div className="alert alert-error">{erro}</div>}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando…' : 'Criar unidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalCodigoAtivacao({
  info,
  onClose,
  notify
}: {
  info: { email: string; codigo: string; expira_em: string }
  onClose: () => void
  notify: (msg: string) => void
}) {
  return (
    <div className="modal-backdrop open" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>Código de ativação</h2>
            <p>Entregue este código ao usuário. Ele vale 72 horas e só pode ser usado uma vez.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>E-mail</label>
            <input readOnly value={info.email} />
          </div>
          <div className="field">
            <label>Código</label>
            <input readOnly value={info.codigo} className="codigo-destaque" />
          </div>
          <div className="field-hint">
            Expira em {info.expira_em ? new Date(info.expira_em).toLocaleString('pt-BR') : '—'}
          </div>
          <div className="alert alert-info">
            Anote agora: o código não fica legível na planilha (só o hash).
          </div>
        </div>
        <div className="modal-foot">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(info.codigo)
                notify('Código copiado.')
              } catch {
                notify('Não foi possível copiar. Anote manualmente: ' + info.codigo)
              }
            }}
          >
            Copiar código
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

function perfilBaseDe(perfis: string[]): 'POLICIAL' | 'COMANDANTE' | 'ADMIN' {
  const set = new Set(perfis.map((p) => String(p).toUpperCase()))
  if (set.has('ADMIN')) return 'ADMIN'
  if (set.has('COMANDANTE')) return 'COMANDANTE'
  return 'POLICIAL'
}

function ModalEditarUsuario({
  usuario,
  unidades,
  onClose,
  onSaved
}: {
  usuario: AdminUsuario
  unidades: AdminUnidade[]
  onClose: () => void
  onSaved: () => void
}) {
  const [nome, setNome] = useState(usuario.nome)
  const [matricula, setMatricula] = useState(usuario.matricula)
  const [unidadeId, setUnidadeId] = useState(usuario.unidade_id)
  const [perfilBase, setPerfilBase] = useState<'POLICIAL' | 'COMANDANTE' | 'ADMIN'>(() =>
    perfilBaseDe(usuario.perfis || [])
  )
  const [tambémPolicial, setTambemPolicial] = useState(() => {
    const set = new Set((usuario.perfis || []).map((p) => String(p).toUpperCase()))
    const base = perfilBaseDe(usuario.perfis || [])
    return base !== 'POLICIAL' && set.has('POLICIAL')
  })
  const [ativo, setAtivo] = useState(String(usuario.ativo).toUpperCase() === 'SIM')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (!unidadeId) {
      setErro('Selecione uma unidade.')
      return
    }
    const perfis = new Set<string>([perfilBase])
    if (tambémPolicial && perfilBase !== 'POLICIAL') perfis.add('POLICIAL')
    setLoading(true)
    try {
      const res = await window.api.adminAtualizarUsuario({
        email: usuario.email,
        nome: nome.trim(),
        matricula: matricula.trim(),
        unidade_id: unidadeId,
        perfis: Array.from(perfis),
        ativo: ativo ? 'SIM' : 'NAO'
      })
      if (!res.ok) {
        setErro(res.mensagem)
        return
      }
      onSaved()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-backdrop open"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>Editar usuário</h2>
            <p>Corrija dados, unidade, função ou situação. O e-mail não muda.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={loading} aria-label="Fechar">
            ✕
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="field">
              <label>E-mail</label>
              <input readOnly value={usuario.email} />
            </div>
            <div className="field">
              <label htmlFor="eu-nome">Nome</label>
              <input id="eu-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="eu-mat">Matrícula</label>
              <input
                id="eu-mat"
                required
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
              />
              <div className="field-hint">Só pode alterar se ainda não houver lançamentos com esta matrícula.</div>
            </div>
            <div className="field">
              <label htmlFor="eu-un">Unidade</label>
              <select id="eu-un" required value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id} — {u.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="eu-perfil">Função</label>
              <select
                id="eu-perfil"
                value={perfilBase}
                onChange={(e) => {
                  const p = e.target.value as typeof perfilBase
                  setPerfilBase(p)
                  if (p !== 'POLICIAL') setTambemPolicial(true)
                }}
              >
                <option value="POLICIAL">Policial</option>
                <option value="COMANDANTE">Comandante</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            {perfilBase !== 'POLICIAL' && (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={tambémPolicial}
                  onChange={(e) => setTambemPolicial(e.target.checked)}
                />
                Também pode lançar as próprias horas (perfil Policial)
              </label>
            )}
            <label className="check-row">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              Usuário ativo
            </label>
            {!ativo && (
              <div className="field-hint">
                Ao desativar, os dispositivos deste usuário deixam de autenticar.
              </div>
            )}
            {erro && <div className="alert alert-error">{erro}</div>}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalEditarUnidade({
  unidade,
  onClose,
  onSaved
}: {
  unidade: AdminUnidade
  onClose: () => void
  onSaved: () => void
}) {
  const [nome, setNome] = useState(unidade.nome)
  const [comandante, setComandante] = useState(unidade.comandante_email || '')
  const [ativa, setAtiva] = useState(String(unidade.ativa).toUpperCase() === 'SIM')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await window.api.adminAtualizarUnidade({
        id: unidade.id,
        nome: nome.trim(),
        comandante_email: comandante.trim(),
        ativa: ativa ? 'SIM' : 'NAO'
      })
      if (!res.ok) {
        setErro(res.mensagem)
        return
      }
      onSaved()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-backdrop open"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>Editar unidade</h2>
            <p>Ajuste nome, comandante responsável ou situação. O ID não muda.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={loading} aria-label="Fechar">
            ✕
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="field">
              <label>ID</label>
              <input readOnly value={unidade.id} />
            </div>
            <div className="field">
              <label htmlFor="edun-nome">Nome</label>
              <input id="edun-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="edun-cmd">E-mail do comandante</label>
              <input
                id="edun-cmd"
                type="email"
                value={comandante}
                onChange={(e) => setComandante(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <label className="check-row">
              <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
              Unidade ativa
            </label>
            {erro && <div className="alert alert-error">{erro}</div>}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
