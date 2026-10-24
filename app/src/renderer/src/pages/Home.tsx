import { useMemo, useState } from 'react'
import type { AppState, LancamentoLocal } from '../../../shared/types'
import {
  formatarDataBr,
  formatarHoras,
  classeStatus,
  rotuloStatus,
  rotuloTipo
} from '../lib/format'
import { IconClock, IconExport, IconPlus, IconSync } from '../components/Icons'
import { saudacao, primeiroNome } from '../lib/greeting'
import { exportarResumoCsv } from '../lib/exportCsv'
import { alturasBarras, movimentacaoSeisMeses } from '../lib/chartData'

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
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const aguardando = recentes.filter((r) => r.status === 'AGUARDANDO_APROVACAO').length
  const naoSync = recentes.filter(
    (r) => r.status === 'PENDENTE_ENVIO' || r.status === 'RASCUNHO'
  ).length
  const aprovados = recentes.filter((r) => r.status === 'APROVADO').length

  const chart = useMemo(() => movimentacaoSeisMeses(recentes), [recentes])
  const bars = useMemo(() => alturasBarras(chart), [chart])

  const creditos = u?.creditos_min ?? 0
  const debitos = u?.debitos_min ?? 0
  const totalMov = Math.max(1, creditos + debitos)
  const pctCreditos = Math.round((creditos / totalMov) * 100)

  const filtrados = recentes.filter((r) => {
    if (filtroStatus && r.status !== filtroStatus) return false
    if (filtroTipo && r.tipo !== filtroTipo) return false
    if (busca) {
      const q = busca.toLowerCase()
      if (
        !r.motivo.toLowerCase().includes(q) &&
        !rotuloTipo(r.tipo).toLowerCase().includes(q) &&
        !r.data.includes(q)
      ) {
        return false
      }
    }
    return true
  })

  const nome = primeiroNome(u?.nome)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Painel de controle</div>
          <h1>
            {saudacao()}
            {nome ? `, ${nome}` : ''}.
          </h1>
          <p>Acompanhe seu saldo, pendências e a movimentação de horas em um só lugar.</p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              exportarResumoCsv(recentes)
            }}
            disabled={recentes.length === 0}
          >
            <IconExport size={16} />
            Exportar resumo
          </button>
          <button type="button" className="btn btn-primary" onClick={onNovo}>
            <IconPlus size={16} />
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

      <div className="stats stats-4">
        <article className="stat">
          <div className="stat-top">
            Meu saldo
            <span className="stat-icon">
              <IconClock size={18} />
            </span>
          </div>
          <div className="stat-value">{u?.saldo_legivel || formatarHoras(0)}</div>
          <div className="stat-foot">Horas aprovadas disponíveis para compensação</div>
        </article>
        <article className="stat">
          <div className="stat-top">
            Aguardando aprovação
            <span className="stat-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
              <IconClock size={18} />
            </span>
          </div>
          <div className="stat-value">{String(aguardando).padStart(2, '0')}</div>
          <div className="stat-foot">No servidor, aguardando decisão</div>
        </article>
        <article className="stat">
          <div className="stat-top">
            Não sincronizados
            <span className="stat-icon" style={{ background: 'var(--sky)', color: 'var(--blue)' }}>
              <IconSync size={18} />
            </span>
          </div>
          <div className="stat-value">{String(naoSync).padStart(2, '0')}</div>
          <div className="stat-foot">Rascunhos e fila local de envio</div>
        </article>
        <article className="stat">
          <div className="stat-top">
            Aprovados
            <span className="stat-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
              <IconClock size={18} />
            </span>
          </div>
          <div className="stat-value">{String(aprovados).padStart(2, '0')}</div>
          <div className="stat-foot">Já entram no saldo oficial</div>
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Movimentação de horas</h2>
              <p>Horas extras e compensações aprovadas (últimos 6 meses)</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onSync}
              disabled={syncing || !state.online}
            >
              <IconSync size={14} />
              {syncing ? '…' : 'Atualizar'}
            </button>
          </div>
          <div className="chart-area">
            <div className="chart-legend">
              <span>
                <i className="legend-dot" style={{ background: '#2c75c7' }} />
                Horas extras
              </span>
              <span>
                <i className="legend-dot" style={{ background: '#b8d6f6' }} />
                Compensações
              </span>
            </div>
            <div className="bar-chart">
              {bars.map((b, i) => (
                <div className="bar-group" key={chart[i].key}>
                  <div className="bar" style={{ height: `${b.extrasPct}%` }} title={`${chart[i].extras} min`} />
                  <div
                    className="bar secondary"
                    style={{ height: `${b.compsPct}%` }}
                    title={`${chart[i].comps} min`}
                  />
                </div>
              ))}
            </div>
            <div className="chart-labels">
              {chart.map((m) => (
                <span key={m.key}>{m.label}</span>
              ))}
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Saldo consolidado</h2>
              <p>Resumo das horas aprovadas</p>
            </div>
            <button type="button" className="text-link" onClick={onVerTodos}>
              Ver lançamentos
            </button>
          </div>
          <div className="balance-highlight">
            <div className="balance-label">Saldo disponível para compensação</div>
            <div className="balance-num">{u?.saldo_legivel || formatarHoras(0)}</div>
            <div className="balance-note">Calculado automaticamente (extras − compensações)</div>
            <div className="balance-line">
              <span>Horas extras aprovadas</span>
              <strong style={{ marginLeft: 'auto' }}>{formatarHoras(creditos)}</strong>
            </div>
            <div className="progress">
              <span style={{ width: `${pctCreditos}%` }} />
            </div>
            <div className="balance-line">
              <span>Compensações aprovadas</span>
              <strong style={{ marginLeft: 'auto' }}>{formatarHoras(debitos)}</strong>
            </div>
          </div>
          <div className="mini-list">
            <div className="mini-row">
              <div className="unit-icon">
                <IconSync size={16} />
              </div>
              <div className="mini-info">
                <strong>Última sincronização</strong>
                <small>
                  {state.lastSyncAt
                    ? new Date(state.lastSyncAt).toLocaleString('pt-BR')
                    : 'Ainda não sincronizou'}
                </small>
              </div>
              <div className="mini-value">
                {u?.unidade_id || '—'}
                <small>sua unidade</small>
              </div>
            </div>
            <div className="mini-row">
              <div className="unit-icon">
                <IconClock size={16} />
              </div>
              <div className="mini-info">
                <strong>Matrícula {u?.matricula || '—'}</strong>
                <small>{u?.email}</small>
              </div>
              <div className="mini-value">
                {String(recentes.length).padStart(2, '0')}
                <small>registros locais</small>
              </div>
            </div>
          </div>
        </article>
      </div>

      <article className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Lançamentos recentes</h2>
            <p>Últimas movimentações neste dispositivo</p>
          </div>
          <button type="button" className="text-link" onClick={onVerTodos}>
            Ver todos os lançamentos
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
              placeholder="Buscar por motivo, tipo ou data..."
            />
          </div>
          <select className="filter" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="RASCUNHO">Rascunho local</option>
            <option value="PENDENTE_ENVIO">Pendente de envio</option>
            <option value="AGUARDANDO_APROVACAO">Aguardando aprovação</option>
            <option value="APROVADO">Aprovado</option>
            <option value="REJEITADO">Rejeitado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
          <select className="filter" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            <option value="HORA_EXTRA">Hora extra</option>
            <option value="COMPENSACAO">Compensação</option>
          </select>
        </div>
        <div className="table-wrap">
          {filtrados.length === 0 ? (
            <div className="empty">Nenhum lançamento neste filtro. Use “Novo lançamento”.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Data do serviço</th>
                  <th>Duração</th>
                  <th>Motivo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(0, 8).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span
                        className={
                          r.tipo === 'COMPENSACAO' ? 'type-pill type-debit' : 'type-pill type-credit'
                        }
                      >
                        {rotuloTipo(r.tipo)}
                      </span>
                    </td>
                    <td>{formatarDataBr(r.data)}</td>
                    <td>{formatarHoras(r.minutos)}</td>
                    <td style={{ maxWidth: 220, whiteSpace: 'normal' }}>{r.motivo}</td>
                    <td>
                      <span className={classeStatus(r.status)}>{rotuloStatus(r.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="table-foot">
          <span>
            Exibindo {Math.min(8, filtrados.length)} de {filtrados.length} registro(s)
          </span>
        </div>
      </article>
    </div>
  )
}
