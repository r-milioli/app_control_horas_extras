import { FormEvent, useState } from 'react'

interface Props {
  onDone: () => void
  notify: (msg: string) => void
}

export default function Ativacao({ onDone, notify }: Props) {
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [pin, setPin] = useState('')
  const [precisaPin, setPrecisaPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await window.api.ativar({
        email: email.trim(),
        codigo: codigo.trim(),
        pin: precisaPin ? pin.trim() : undefined
      })
      if (!res.ok) {
        setErro(res.mensagem)
        return
      }
      if (res.etapa === 'DEFINIR_PIN') {
        setPrecisaPin(true)
        notify(res.mensagem || 'Defina um PIN de 6 dígitos para aprovações.')
        return
      }
      notify('Dispositivo ativado com sucesso.')
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="activation">
      <div className="activation-card">
        <div className="eyebrow">Primeiro acesso</div>
        <h1>Ativar este computador</h1>
        <p>
          Informe o e-mail cadastrado e o código que o administrador entregou. O código vale por 72
          horas e só pode ser usado uma vez.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={precisaPin}
            />
          </div>
          <div className="field">
            <label htmlFor="codigo">Código de ativação</label>
            <input
              id="codigo"
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              disabled={precisaPin}
              placeholder="Código informado pelo admin"
            />
          </div>
          {precisaPin && (
            <div className="field">
              <label htmlFor="pin">PIN de 6 dígitos</label>
              <input
                id="pin"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
              />
              <div className="field-hint">Usado apenas para aprovar ou rejeitar lançamentos.</div>
            </div>
          )}
          {erro && <div className="alert alert-error">{erro}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Ativando…' : precisaPin ? 'Confirmar PIN e ativar' : 'Ativar'}
          </button>
        </form>
      </div>
    </div>
  )
}
