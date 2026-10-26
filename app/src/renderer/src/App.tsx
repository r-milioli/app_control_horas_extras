import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppState, LancamentoLocal } from '../../shared/types'
import Login from './pages/Login'
import Home from './pages/Home'
import MeusRegistros from './pages/MeusRegistros'
import AdminUsuarios from './pages/AdminUsuarios'
import ModalNovoLancamento from './components/ModalNovoLancamento'
import {
  IconLogout,
  IconOverview,
  IconRecords,
  IconSync,
  IconTheme,
  IconUsers
} from './components/Icons'
import { iniciaisNome, parsePerfis, rotuloPerfil, type PerfilApp } from './lib/roles'

type Page = 'home' | 'registros' | 'admin'

const CREST_URL =
  'https://commons.wikimedia.org/wiki/Special:FilePath/Bras%C3%A3o_da_Pol%C3%ADcia_Militar_do_Estado_do_Rio_de_Janeiro_-_PMERJ_-_Variante_Azul.png'

const THEME_KEY = 'controle-horas-theme'

export default function App() {
  const [booting, setBooting] = useState(true)
  const [state, setState] = useState<AppState | null>(null)
  const [page, setPage] = useState<Page>('home')
  const [lancamentos, setLancamentos] = useState<LancamentoLocal[]>([])
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark'
    } catch {
      return false
    }
  })
  const [perfilAtivo, setPerfilAtivo] = useState<PerfilApp>('POLICIAL')

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 3500)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
  }, [dark])

  const refresh = useCallback(
    async (opts?: { autoSync?: boolean }) => {
      const s = await window.api.getState()
      setState(s)
      if (s.activated) {
        const perfis = parsePerfis(s.usuario?.perfis)
        setPerfilAtivo((atual) => (perfis.includes(atual) ? atual : perfis[0]))
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
    },
    [notify]
  )

  useEffect(() => {
    void refresh({ autoSync: true })
  }, [refresh])

  const perfis = useMemo(() => parsePerfis(state?.usuario?.perfis), [state?.usuario?.perfis])

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

  async function handleLogout() {
    const ok = window.confirm(
      'Sair da conta?\n\nVocê poderá entrar de novo com e-mail e senha. Outro usuário também poderá se logar neste computador.'
    )
    if (!ok) return
    await window.api.logout()
    setLancamentos([])
    setPage('home')
    setModalNovo(false)
    notify('Você saiu da conta.')
    await refresh()
  }

  if (booting || !state) {
    return <div className="loading-screen">Carregando…</div>
  }

  if (!state.activated) {
    return (
      <>
        <Login
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
    registros: 'Lançamentos',
    admin: 'Usuários e unidades'
  }

  const u = state.usuario
  const isAdmin = perfis.includes('ADMIN')
  const abrirNovo = () => setModalNovo(true)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="crest" alt="Brasão da PMERJ" src={CREST_URL} />
          <div className="brand-text">
            <div className="brand-title">CONTROLE DE HORAS</div>
            <div className="brand-sub">PMERJ · Sistema interno</div>
          </div>
        </div>

        <div className="nav-label">Principal</div>
        <nav className="nav">
          <button
            type="button"
            className={page === 'home' ? 'active' : ''}
            onClick={() => setPage('home')}
          >
            <IconOverview />
            <span>Visão geral</span>
          </button>
          <button
            type="button"
            className={page === 'registros' ? 'active' : ''}
            onClick={() => setPage('registros')}
          >
            <IconRecords />
            <span>Lançamentos</span>
            {state.pendentesEnvio > 0 && <span className="count">{state.pendentesEnvio}</span>}
          </button>
        </nav>

        {isAdmin && (
          <>
            <div className="nav-label">Administração</div>
            <nav className="nav">
              <button
                type="button"
                className={page === 'admin' ? 'active' : ''}
                onClick={() => setPage('admin')}
              >
                <IconUsers />
                <span>Usuários e unidades</span>
              </button>
            </nav>
          </>
        )}

        <div className="sidebar-bottom">
          <div className="profile-mini">
            <div className="avatar">{iniciaisNome(u?.nome)}</div>
            <div>
              <strong title={u?.nome}>{u?.nome || 'Usuário'}</strong>
              <small>{rotuloPerfil(perfilAtivo)}</small>
            </div>
          </div>
          <button type="button" className="logout-btn" onClick={() => void handleLogout()}>
            <IconLogout />
            <span>Sair</span>
          </button>
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
              type="button"
              className={`icon-btn ${syncing ? 'spinning' : ''}`}
              title="Sincronizar"
              aria-label="Sincronizar"
              onClick={() => void handleSync()}
              disabled={syncing || !state.online}
            >
              <IconSync />
            </button>
            <button
              type="button"
              className="icon-btn"
              title={dark ? 'Modo claro' : 'Modo escuro'}
              aria-label="Alternar tema"
              onClick={() => setDark((v) => !v)}
            >
              <IconTheme />
            </button>
            <select
              className="role-select"
              aria-label="Perfil ativo"
              value={perfilAtivo}
              onChange={(e) => setPerfilAtivo(e.target.value as PerfilApp)}
              title="Seu perfil neste dispositivo"
            >
              {perfis.map((p) => (
                <option key={p} value={p}>
                  {rotuloPerfil(p)}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="content">
          {page === 'home' && (
            <Home
              state={state}
              recentes={lancamentos}
              syncing={syncing}
              onSync={() => void handleSync()}
              onNovo={abrirNovo}
              onVerTodos={() => setPage('registros')}
            />
          )}
          {page === 'registros' && (
            <MeusRegistros
              itens={lancamentos}
              online={state.online}
              notify={notify}
              onRefresh={() => void refresh()}
              onNovo={abrirNovo}
            />
          )}
          {page === 'admin' && isAdmin && (
            <AdminUsuarios online={state.online} notify={notify} />
          )}
        </div>
      </div>

      <ModalNovoLancamento
        open={modalNovo}
        onClose={() => setModalNovo(false)}
        notify={notify}
        onSaved={() => {
          void refresh().then(() => setPage('registros'))
        }}
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
