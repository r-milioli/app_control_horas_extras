import { FormEvent, useEffect, useRef, useState } from 'react'

interface Props {
  onDone: () => void
  notify: (msg: string) => void
}

export default function Login({ onDone, notify }: Props) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Garante foco e hit-test após troca de sessão (logout → login)
    const t = window.setTimeout(() => {
      emailRef.current?.focus({ preventScroll: true })
    }, 50)
    return () => window.clearTimeout(t)
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await window.api.login({
        email: email.trim(),
        senha
      })
      if (!res.ok) {
        setErro(res.mensagem)
        return
      }
      notify('Login realizado com sucesso.')
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="activation">
      <div className="activation-card">
        <div className="eyebrow">Acesso</div>
        <h1>Entrar</h1>
        <p>
          Informe o e-mail e a senha da sua conta. Caso não possua, por favor entre em contato com a
          P1 da unidade.
        </p>
        <form onSubmit={(e) => void submit(e)}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              required
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              required
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha da conta"
              disabled={loading}
            />
          </div>
          {erro && <div className="alert alert-error">{erro}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
