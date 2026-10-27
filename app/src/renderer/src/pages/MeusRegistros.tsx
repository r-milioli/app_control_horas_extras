import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  DecisaoAprovacao,
  LancamentoLocal,
  PendenciaAprovacao
} from '../../../shared/types'
import {
  classeStatus,
  classeTipo,
  formatarDataBr,
  formatarHoras,
  rotuloStatus,
  rotuloTipo
} from '../lib/format'
import { IconPlus } from '../components/Icons'
import ModalDecidir from '../components/ModalDecidir'

type Aba = 'meus' | 'aprovacoes'

interface Props {
  itens: LancamentoLocal[]
  online: boolean
  podeAprovar: boolean
  emailUsuario: string
  unidadeId: string
  onRefresh: () => void
  notify: (msg: string) => void
  onNovo: () => void
}

function emailEq(a: string | undefined, b: string | undefined): boolean {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

function unidadeEq(a: string | undefined, b: string | undefined): boolean {
  return String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase()
}

/** Registros do próprio usuário. Legados sem autor: só rascunho/pendente de envio. */
function isProprio(r: LancamentoLocal, email: string): boolean {
  const autor = String(r.criado_por || '').trim()
  if (!autor) {
    return r.status === 'RASCUNHO' || r.status === 'PENDENTE_ENVIO'
  }
  return emailEq(autor, email)
}

function localParaPendencia(r: LancamentoLocal): PendenciaAprovacao {
  return {
    id: r.id,
    tipo: r.tipo,
    ref_id: r.ref_id || '',
    matricula: r.matricula || '',
    nome: r.nome || 'Policial',
    unidade_id: r.unidade_id || '',
    data: r.data,
    minutos: r.minutos,
    minutos_legivel: formatarHoras(r.minutos),
    motivo: r.motivo,
    criado_por: r.criado_por || '',
    criado_em: r.criado_em,
    recebido_em: r.recebido_em,
    atualizado_em: r.atualizado_em,
    status: r.status,
    antiga: false
  }
}

export default function MeusRegistros({
  itens,
  online,
  podeAprovar,
  emailUsuario,
  unidadeId,
  onRefresh,
  notify,
  onNovo
}: Props) {
  const [aba, setAba] = useState<Aba>('meus')
  const [filtro, setFiltro] = useState('')
  const [busca, setBusca] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const [pendencias, setPendencias] = useState<PendenciaAprovacao[]>([])
  const [carregandoPend, setCarregandoPend] = useState(false)
  const [erroPend, setErroPend] = useState('')
  const [fonteLocal, setFonteLocal] = useState(false)

  const [modal, setModal] = useState<{
    pendencia: PendenciaAprovacao
    decisao: DecisaoAprovacao
  } | null>(null)
  const [decidindo, setDecidindo] = useState(false)

  const meusItens = useMemo(
    () => itens.filter((r) => isProprio(r, emailUsuario)),
    [itens, emailUsuario]
  )

  const pendenciasLocais = useMemo(() => {
    if (!podeAprovar) return [] as PendenciaAprovacao[]
    return itens
      .filter(
        (r) =>
          r.status === 'AGUARDANDO_APROVACAO' &&
          !isProprio(r, emailUsuario) &&
          (!r.unidade_id || !unidadeId || unidadeEq(r.unidade_id, unidadeId))
      )
      .map(localParaPendencia)
  }, [itens, emailUsuario, unidadeId, podeAprovar])

  const carregarPendencias = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!podeAprovar) return
      if (!opts?.silent) setCarregandoPend(true)
      setErroPend('')

      const aplicarLocal = (aviso?: string) => {
        setPendencias(pendenciasLocais)
        setFonteLocal(true)
        if (aviso) setErroPend(aviso)
      }

      try {
        if (!online) {
          aplicarLocal(
            'Sem internet. Mostrando pendências já sincronizadas neste computador.'
          )
          return
        }

        if (typeof window.api?.listarPendencias !== 'function') {
          aplicarLocal(
            'Recurso de aprovações indisponível neste build. Reinicie o aplicativo. Usando lista local.'
          )
          return
        }

        const res = await window.api.listarPendencias()
        if (!res.ok) {
          aplicarLocal(`${res.mensagem} Mostrando pendências locais sincronizadas.`)
          if (!opts?.silent) notify(res.mensagem)
          return
        }

        if (res.pendencias.length > 0) {
          setPendencias(res.pendencias)
          setFonteLocal(false)
          return
        }

        // API ok mas vazia: se o sync local tiver itens da unidade, usa como rede de segurança
        if (pendenciasLocais.length > 0) {
          setPendencias(pendenciasLocais)
          setFonteLocal(true)
          setErroPend(
            'O servidor não retornou pendências; exibindo registros da unidade já sincronizados. Confira se o Apps Script está publicado com a versão atual.'
          )
          return
        }

        setPendencias([])
        setFonteLocal(false)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha ao carregar pendências.'
        aplicarLocal(msg)
        if (!opts?.silent) notify(msg)
      } finally {
        if (!opts?.silent) setCarregandoPend(false)
      }
    },
    [podeAprovar, online, notify, pendenciasLocais]
  )

  useEffect(() => {
    if (!podeAprovar) {
      setPendencias([])
      setFonteLocal(false)
      setAba((atual) => (atual === 'aprovacoes' ? 'meus' : atual))
      return
    }
    void carregarPendencias({ silent: true })
  }, [podeAprovar, online, carregarPendencias])

  useEffect(() => {
    if (aba === 'aprovacoes' && podeAprovar) {
      void carregarPendencias()
    }
  }, [aba, podeAprovar, carregarPendencias])

  const filtrados = useMemo(() => {
    return meusItens.filter((r) => {
      if (filtro && r.status !== filtro) return false
      if (busca) {
        const q = busca.toLowerCase()
        if (
          !r.motivo.toLowerCase().includes(q) &&
          !rotuloTipo(r.tipo).toLowerCase().includes(q) &&
          !formatarDataBr(r.data).includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [meusItens, filtro, busca])

  async function finalizar(id: string) {
    setBusyId(id)
    try {
      const res = await window.api.finalizarLancamento(id)
      if (!res.ok) notify(res.mensagem)
      else {
        notify('Pronto para sincronizar.')
        onRefresh()
      }
    } finally {
      setBusyId(null)
    }
  }

  async function cancelar(id: string) {
    if (!online) {
      notify('É preciso estar online para cancelar no servidor.')
      return
    }
    if (!confirm('Cancelar este lançamento? Esta ação não pode ser desfeita.')) return
    setBusyId(id)
    try {
      const res = await window.api.cancelarLancamento(id)
      if (!res.ok) notify(res.mensagem)
      else {
        notify('Lançamento cancelado.')
        onRefresh()
      }
    } finally {
      setBusyId(null)
    }
  }

  async function confirmarDecisao(
    senha: string,
    motivoDecisao: string
  ): Promise<string | null> {
    if (!modal) return 'Nenhum lançamento selecionado.'
    if (typeof window.api?.decidirPendencias !== 'function') {
      return 'Recurso indisponível. Reinicie o aplicativo.'
    }
    setDecidindo(true)
    try {
      const res = await window.api.decidirPendencias({
        ids: [modal.pendencia.id],
        decisao: modal.decisao,
        senha,
        motivo_rejeicao: motivoDecisao
      })
      if (!res.ok) return res.mensagem
      const item = res.resultados[0]
      if (!item?.ok) {
        return item?.mensagem || 'Não foi possível registrar a decisão.'
      }
      notify(modal.decisao === 'APROVAR' ? 'Lançamento aprovado.' : 'Lançamento rejeitado.')
      setModal(null)
      await carregarPendencias({ silent: true })
      onRefresh()
      return null
    } finally {
      setDecidindo(false)
    }
  }

  const qtdPend = pendencias.length || (!fonteLocal ? pendenciasLocais.length : 0)
  const badgeCount = Math.max(pendencias.length, pendenciasLocais.length)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Operação</div>
          <h1>Lançamentos</h1>
          <p>
            {podeAprovar
              ? 'Consulte seus registros e aprove os lançamentos da unidade.'
              : 'Consulte os registros e acompanhe o histórico de cada movimentação.'}
          </p>
        </div>
        <div className="actions">
          {aba === 'meus' && (
            <button type="button" className="btn btn-primary" onClick={onNovo}>
              <IconPlus size={16} />
              Novo lançamento
            </button>
          )}
          {aba === 'aprovacoes' && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={carregandoPend}
              onClick={() => void carregarPendencias()}
            >
              {carregandoPend ? 'Atualizando…' : 'Atualizar lista'}
            </button>
          )}
        </div>
      </div>

      {podeAprovar && (
        <div className="subtabs" role="tablist" aria-label="Seções de lançamentos">
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'meus'}
            className={aba === 'meus' ? 'active' : ''}
            onClick={() => setAba('meus')}
          >
            Meus lançamentos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'aprovacoes'}
            className={aba === 'aprovacoes' ? 'active' : ''}
            onClick={() => setAba('aprovacoes')}
          >
            Aprovações
            {badgeCount > 0 && <span className="subtab-count">{badgeCount}</span>}
          </button>
        </div>
      )}

      {podeAprovar && badgeCount > 0 && aba === 'meus' && (
        <button type="button" className="alert-banner" onClick={() => setAba('aprovacoes')}>
          <strong>
            {badgeCount === 1
              ? '1 lançamento aguardando sua aprovação'
              : `${badgeCount} lançamentos aguardando sua aprovação`}
          </strong>
          <span>Abrir lista de aprovações</span>
        </button>
      )}

      {aba === 'meus' && (
        <article className="panel table-panel">
          <div className="panel-head">
            <div>
              <h2>Meus lançamentos</h2>
              <p>Enviar e cancelar valem só para os seus registros.</p>
            </div>
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
                placeholder="Buscar registro..."
              />
            </div>
            <select className="filter" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="RASCUNHO">Rascunho local</option>
              <option value="PENDENTE_ENVIO">Pendente de envio</option>
              <option value="AGUARDANDO_APROVACAO">Aguardando aprovação</option>
              <option value="APROVADO">Aprovado</option>
              <option value="REJEITADO">Rejeitado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          <div className="table-wrap">
            {filtrados.length === 0 ? (
              <div className="empty">Nenhum registro neste filtro.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Data</th>
                    <th>Duração</th>
                    <th>Motivo</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className={classeTipo(r.tipo)}>{rotuloTipo(r.tipo)}</span>
                      </td>
                      <td>{formatarDataBr(r.data)}</td>
                      <td>{formatarHoras(r.minutos)}</td>
                      <td style={{ maxWidth: 280, whiteSpace: 'normal' }}>
                        {r.motivo}
                        {r.status === 'REJEITADO' && r.motivo_rejeicao && (
                          <span className="motivo-rejeicao">
                            Motivo da rejeição: {r.motivo_rejeicao}
                          </span>
                        )}
                        {r.status === 'APROVADO' && r.motivo_rejeicao && (
                          <span className="motivo-obs">Observação: {r.motivo_rejeicao}</span>
                        )}
                      </td>
                      <td>
                        <span className={classeStatus(r.status)}>{rotuloStatus(r.status)}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          {r.status === 'RASCUNHO' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={busyId === r.id}
                              onClick={() => void finalizar(r.id)}
                            >
                              Finalizar
                            </button>
                          )}
                          {r.status === 'AGUARDANDO_APROVACAO' && isProprio(r, emailUsuario) && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              disabled={busyId === r.id}
                              onClick={() => void cancelar(r.id)}
                            >
                              Cancelar
                            </button>
                          )}
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
              Exibindo {filtrados.length} de {meusItens.length} registro(s)
            </span>
          </div>
        </article>
      )}

      {aba === 'aprovacoes' && podeAprovar && (
        <article className="panel table-panel">
          <div className="panel-head">
            <div>
              <h2>Pendências de aprovação</h2>
              <p>
                {qtdPend === 0
                  ? 'Nenhum lançamento da unidade aguardando decisão.'
                  : qtdPend === 1
                    ? '1 lançamento aguardando a aprovação do comandante.'
                    : `${qtdPend} lançamentos aguardando a aprovação do comandante.`}
              </p>
            </div>
          </div>

          {erroPend && <div className="inline-warn">{erroPend}</div>}
          {fonteLocal && !erroPend && (
            <div className="inline-warn">Lista com base na sincronização local.</div>
          )}

          <div className="table-wrap">
            {carregandoPend && pendencias.length === 0 ? (
              <div className="empty">Carregando pendências…</div>
            ) : pendencias.length === 0 ? (
              <div className="empty">
                Nada para aprovar agora.
                <div className="cell-meta" style={{ marginTop: 8 }}>
                  O policial precisa sincronizar o envio. Depois, use Sincronizar e Atualizar
                  lista. Seu perfil precisa incluir COMANDANTE e a mesma unidade_id do
                  lançamento.
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Policial</th>
                    <th>Tipo</th>
                    <th>Data</th>
                    <th>Duração</th>
                    <th>Motivo</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendencias.map((p) => (
                    <tr key={p.id} className={p.antiga ? 'row-alerta' : undefined}>
                      <td style={{ whiteSpace: 'normal' }}>
                        <strong>{p.nome || 'Policial'}</strong>
                        {p.matricula ? <div className="cell-meta">{p.matricula}</div> : null}
                      </td>
                      <td>
                        <span className={classeTipo(p.tipo)}>{rotuloTipo(p.tipo)}</span>
                      </td>
                      <td>{formatarDataBr(p.data)}</td>
                      <td>{p.minutos_legivel || formatarHoras(Number(p.minutos) || 0)}</td>
                      <td style={{ maxWidth: 260, whiteSpace: 'normal' }}>{p.motivo}</td>
                      <td>
                        <span className="status status-pending">
                          {p.antiga ? 'Aguardando (atrasada)' : 'Aguardando aprovação'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={!online || decidindo}
                            onClick={() => setModal({ pendencia: p, decisao: 'APROVAR' })}
                          >
                            Aprovar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={!online || decidindo}
                            onClick={() => setModal({ pendencia: p, decisao: 'REJEITAR' })}
                          >
                            Rejeitar
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
              {pendencias.length} pendência(s)
              {pendencias.some((p) => p.antiga) ? ' · destaque em amarelo = atrasada' : ''}
            </span>
          </div>
        </article>
      )}

      <ModalDecidir
        open={!!modal}
        pendencia={modal?.pendencia ?? null}
        decisao={modal?.decisao ?? 'APROVAR'}
        busy={decidindo}
        onCancel={() => {
          if (!decidindo) setModal(null)
        }}
        onConfirm={(senha, motivo) => confirmarDecisao(senha, motivo)}
      />
    </div>
  )
}
