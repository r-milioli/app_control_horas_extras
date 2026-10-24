import { useState } from 'react'
import type { LancamentoLocal } from '../../../shared/types'
import {
  classeStatus,
  classeTipo,
  formatarDataBr,
  formatarHoras,
  rotuloStatus,
  rotuloTipo
} from '../lib/format'

interface Props {
  itens: LancamentoLocal[]
  online: boolean
  onRefresh: () => void
  notify: (msg: string) => void
  onNovo: () => void
}

export default function MeusRegistros({ itens, online, onRefresh, notify, onNovo }: Props) {
  const [filtro, setFiltro] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtrados = itens.filter((r) => !filtro || r.status === filtro)

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
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Operação</div>
          <h1>Meus registros</h1>
          <p>Consulte o histórico deste dispositivo. Registros enviados não podem ser editados.</p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={onNovo}>
            Novo lançamento
          </button>
        </div>
      </div>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Todos os lançamentos</h2>
            <p>{filtrados.length} registro(s)</p>
          </div>
          <select
            className="filter"
            style={{ padding: '10px 11px', borderRadius: 9, border: '1px solid var(--line)' }}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
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
                    <td style={{ maxWidth: 240, whiteSpace: 'normal' }}>
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
                            className="btn btn-secondary"
                            style={{ padding: '8px 10px', fontSize: 12 }}
                            disabled={busyId === r.id}
                            onClick={() => void finalizar(r.id)}
                          >
                            Finalizar
                          </button>
                        )}
                        {r.status === 'AGUARDANDO_APROVACAO' && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '8px 10px', fontSize: 12 }}
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
      </article>
    </div>
  )
}
