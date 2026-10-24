import { useCallback, useEffect, useState } from 'react'
import type { AppState, LancamentoLocal } from '../../shared/types'
import Ativacao from './pages/Ativacao'
import Home from './pages/Home'
import NovoLancamento from './pages/NovoLancamento'
import MeusRegistros from './pages/MeusRegistros'

type Page = 'home' | 'novo' | 'registros'

export default function App() {
  const [booting, setBooting] = useState(true)
  const [state, setState] = useState<AppState | null>(null)
  const [page, setPage] = useState<Page>('home')
  const [lancamentos, setLancamentos] = useState<LancamentoLocal[]>([])
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState('')

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 3500)
  }, [])

  const refresh = useCallback(async (opts?: { autoSync?: boolean }) => {
    const s = await window.api.getState()
    setState(s)
    if (s.activated) {
      const list = await window.api.listarLancamentos()
      setLancamentos(list)
      if (opts?.autoSync && s.online) {
        setSyncing(true)
        try {
          const result = await window.api.sync()
          setState(result.state)
          const list2 = await window.api.listarLancamentos()
          setLancamentos(list2)
          if (result.enviados > 0 || result.mudancas > 0) {
            notify(result.mensagem)
          }
          if (result.clockSkewWarning) {
            notify('Atenção: o relógio deste computador parece incorreto.')
          }
        } finally {
          setSyncing(false)
        }
      }
    }
    setBooting(false)
  }, [notify])

  useEffect(() => {
    void refresh({ autoSync: true })
  }, [refresh])

  async function handleSync() {
    setSyncing(true)
    try {
      const result = await window.api.sync()
      setState(result.state)
      setLancamentos(await window.api.listarLancamentos())
      notify(result.mensagem)
    } finally {
      setSyncing(false)
    }
  }

  if (booting || !state) {
    return <div className="loading-screen">Carregando…</div>
  }

  if (!state.activated) {
    return (
      <>
        <Ativacao
          notify={notify}
          onDone={() => {
            void refresh({ autoSync: true })
          }}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    )
  }

  const titles: Record<Page, string> = {
    home: 'Visão geral',
    novo: 'Novo lançamento',
    registros: 'Meus registros'
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-text" style={{ padding: '2px 10px 10px' }}>
          <div className="brand-title">CONTROLE DE HORAS</div>
          <div className="brand-sub">PMERJ · Sistema interno</div>
        </div>
        <div className="nav-label">Principal</div>
        <nav className="nav">
          <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>
            <span>Início</span>
          </button>
          <button className={page === 'novo' ? 'active' : ''} onClick={() => setPage('novo')}>
            <span>Novo lançamento</span>
          </button>
          <button className={page === 'registros' ? 'active' : ''} onClick={() => setPage('registros')}>
            <span>Meus registros</span>
            {state.pendentesEnvio > 0 && <span className="count">{state.pendentesEnvio}</span>}
          </button>
        </nav>
        <div className="sidebar-bottom">
          <strong>{state.usuario?.nome || 'Usuário'}</strong>
          <small>{state.usuario?.email}</small>
          <small style={{ marginTop: 8 }}>Unidade {state.usuario?.unidade_id || '—'}</small>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="crumb">
            PMERJ <span style={{ padding: '0 7px', color: '#b2bfce' }}>/</span>
            <strong>{titles[page]}</strong>
          </div>
          <div className="top-actions">
            <div className={`connection ${state.online ? '' : 'offline'}`}>
              <span className="dot" />
              <span>{state.online ? 'Conectado' : 'Sem internet'}</span>
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: '9px 12px' }}
              onClick={() => void handleSync()}
              disabled={syncing || !state.online}
            >
              {syncing ? 'Sincronizando…' : 'Sincronizar'}
            </button>
          </div>
        </header>

        <div className="content">
          {page === 'home' && (
            <Home
              state={state}
              recentes={lancamentos}
              syncing={syncing}
              onSync={() => void handleSync()}
              onNovo={() => setPage('novo')}
              onVerTodos={() => setPage('registros')}
            />
          )}
          {page === 'novo' && (
            <NovoLancamento
              notify={notify}
              onCancel={() => setPage('home')}
              onSaved={() => {
                void refresh().then(() => setPage('registros'))
              }}
            />
          )}
          {page === 'registros' && (
            <MeusRegistros
              itens={lancamentos}
              online={state.online}
              notify={notify}
              onRefresh={() => void refresh()}
              onNovo={() => setPage('novo')}
            />
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
