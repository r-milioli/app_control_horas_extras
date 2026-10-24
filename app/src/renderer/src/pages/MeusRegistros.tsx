import { useMemo, useState } from 'react'
import type { LancamentoLocal } from '../../../shared/types'
import {
  classeStatus,
  classeTipo,
  formatarDataBr,
  formatarHoras,
  rotuloStatus,
  rotuloTipo
} from '../lib/format'
import { IconPlus } from '../components/Icons'

interface Props {
  itens: LancamentoLocal[]
  online: boolean
  onRefresh: () => void
  notify: (msg: string) => void
  onNovo: () => void
}

export default function MeusRegistros({ itens, online, onRefresh, notify, onNovo }: Props) {
  const [filtro, setFiltro] = useState('')
  const [busca, setBusca] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtrados = useMemo(() => {
    return itens.filter((r) => {
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
  }, [itens, filtro, busca])

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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Operação</div>
          <h1>Lançamentos</h1>
          <p>Consulte os registros e acompanhe o histórico de cada movimentação.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onNovo}>
            <IconPlus size={16} />
            Novo lançamento
          </button>
        </div>
      </div>

      <article className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Todos os lançamentos</h2>
            <p>Os registros enviados não podem ser editados ou apagados.</p>
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
                        <span className="motivo-rejeicao">Motivo da rejeição: {r.motivo_rejeicao}</span>
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
                        {r.status === 'AGUARDANDO_APROVACAO' && (
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
            Exibindo {filtrados.length} de {itens.length} registro(s)
          </span>
        </div>
      </article>
    </div>
  )
}
