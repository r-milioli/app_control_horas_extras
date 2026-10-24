import type { AppState, LancamentoLocal } from '../../../shared/types'
import { formatarDataBr, formatarHoras, classeStatus, rotuloStatus, rotuloTipo } from '../lib/format'

interface Props {
  state: AppState
  recentes: LancamentoLocal[]
  onSync: () => void
  syncing: boolean
  onNovo: () => void
  onVerTodos: () => void
}

export default function Home({ state, recentes, onSync, syncing, onNovo, onVerTodos }: Props) {
  const u = state.usuario

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Início</div>
          <h1>Olá{u?.nome ? `, ${u.nome.split(' ')[0]}` : ''}.</h1>
          <p>Seu saldo e os lançamentos ficam neste computador. Sincronize quando houver internet.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary" onClick={onSync} disabled={syncing || !state.online}>
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </button>
          <button className="btn btn-primary" onClick={onNovo}>
            Novo lançamento
          </button>
        </div>
      </div>

      {!state.online && (
        <div className="alert alert-warn">
          Sem internet. Seus registros estão salvos e serão enviados depois.
        </div>
      )}
      {state.clockSkewWarning && (
        <div className="alert alert-warn">
          O relógio deste computador parece diferente do servidor. Ajuste a data/hora do Windows.
        </div>
      )}
      {state.pendentesEnvio > 0 && (
        <div className="alert alert-info">
          {state.pendentesEnvio} registro(s) aguardando envio.
        </div>
      )}

      <div className="stats">
        <article className="stat">
          <div className="stat-top">Saldo disponível</div>
          <div className="stat-value">{u?.saldo_legivel || formatarHoras(0)}</div>
          <div className="stat-foot">Só conta o que já foi aprovado</div>
        </article>
        <article className="stat">
          <div className="stat-top">Pendentes de envio</div>
          <div className="stat-value">{String(state.pendentesEnvio).padStart(2, '0')}</div>
          <div className="stat-foot">Fila local para sincronizar</div>
        </article>
        <article className="stat">
          <div className="stat-top">Última sincronização</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {state.lastSyncAt
              ? new Date(state.lastSyncAt).toLocaleString('pt-BR')
              : 'Ainda não'}
          </div>
          <div className="stat-foot">{u?.matricula ? `Matrícula ${u.matricula}` : '—'}</div>
        </article>
      </div>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Lançamentos recentes</h2>
            <p>Últimos registros neste dispositivo</p>
          </div>
          <button className="btn btn-secondary" onClick={onVerTodos}>
            Ver todos
          </button>
        </div>
        <div className="table-wrap">
          {recentes.length === 0 ? (
            <div className="empty">Nenhum lançamento ainda. Clique em “Novo lançamento”.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th>Duração</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentes.slice(0, 8).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className={r.tipo === 'COMPENSACAO' ? 'type-pill type-debit' : 'type-pill type-credit'}>
                        {rotuloTipo(r.tipo)}
                      </span>
                    </td>
                    <td>{formatarDataBr(r.data)}</td>
                    <td>{formatarHoras(r.minutos)}</td>
                    <td>
                      <span className={classeStatus(r.status)}>{rotuloStatus(r.status)}</span>
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
