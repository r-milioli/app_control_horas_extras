import { FormEvent, useEffect, useRef, useState } from 'react'
import type { DecisaoAprovacao, PendenciaAprovacao } from '../../../shared/types'
import { formatarDataBr, formatarHoras, rotuloTipo } from '../lib/format'

interface Props {
  open: boolean
  pendencia: PendenciaAprovacao | null
  decisao: DecisaoAprovacao
  busy?: boolean
  /** Retorna mensagem de erro da API, ou null se ok. */
  onConfirm: (senha: string, motivoDecisao: string) => Promise<string | null>
  onCancel: () => void
}

export default function ModalDecidir({
  open,
  pendencia,
  decisao,
  busy = false,
  onConfirm,
  onCancel
}: Props) {
  const [senha, setSenha] = useState('')
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const senhaRef = useRef<HTMLInputElement>(null)

  const aprovando = decisao === 'APROVAR'
  const bloqueado = busy || enviando

  useEffect(() => {
    if (!open) return
    setSenha('')
    setMotivo('')
    setErro('')
    setEnviando(false)
    window.setTimeout(() => senhaRef.current?.focus(), 50)
  }, [open, pendencia?.id, decisao])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !bloqueado) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, bloqueado, onCancel])

  if (!open || !pendencia) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const m = motivo.trim()
    if (!senha.trim()) {
      setErro('Digite a senha da sua conta para confirmar.')
      return
    }
    if (!aprovando) {
      if (m.length < 5 || m.length > 500) {
        setErro('O motivo da rejeição deve ter entre 5 e 500 caracteres.')
        return
      }
    } else if (m && (m.length < 5 || m.length > 500)) {
      setErro('Se informar observação, use entre 5 e 500 caracteres.')
      return
    }
    setEnviando(true)
    try {
      const falha = await onConfirm(senha, m)
      if (falha) {
        setErro(falha)
        setSenha('')
        senhaRef.current?.focus()
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="modal-backdrop open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decidir-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !bloqueado) onCancel()
      }}
    >
      <div className="modal" style={{ width: 'min(460px, 100%)' }}>
        <form onSubmit={(e) => void submit(e)}>
          <div className="modal-head">
            <div>
              <h2 id="decidir-dialog-title">
                {aprovando ? 'Aprovar lançamento' : 'Rejeitar lançamento'}
              </h2>
              <p>
                Confirme com a senha da sua conta.
                {aprovando
                  ? ' A observação é opcional.'
                  : ' Informe o motivo da rejeição.'}
              </p>
            </div>
          </div>
          <div className="modal-body">
            <div className="decidir-resumo">
              <div>
                <strong>{pendencia.nome || 'Policial'}</strong>
                {pendencia.matricula ? <span> · {pendencia.matricula}</span> : null}
              </div>
              <div>
                {rotuloTipo(pendencia.tipo)} · {formatarDataBr(pendencia.data)} ·{' '}
                {pendencia.minutos_legivel || formatarHoras(Number(pendencia.minutos) || 0)}
              </div>
              <div className="decidir-motivo">{pendencia.motivo}</div>
            </div>

            <div className="field">
              <label htmlFor="decidir-motivo">
                {aprovando ? 'Observação da aprovação (opcional)' : 'Motivo da rejeição'}
              </label>
              <textarea
                id="decidir-motivo"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={bloqueado}
                placeholder={
                  aprovando
                    ? 'Breve descrição, se desejar (mín. 5 caracteres)'
                    : 'Explique o motivo (mín. 5 caracteres)'
                }
                maxLength={500}
              />
            </div>

            <div className="field">
              <label htmlFor="decidir-senha">Senha da conta</label>
              <input
                ref={senhaRef}
                id="decidir-senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={bloqueado}
                placeholder="Digite sua senha para confirmar"
              />
            </div>

            {erro && <div className="alert alert-error">{erro}</div>}
          </div>
          <div className="modal-foot">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={bloqueado}
            >
              Voltar
            </button>
            <button
              type="submit"
              className={`btn ${aprovando ? 'btn-primary' : 'btn-danger'}`}
              disabled={bloqueado}
            >
              {bloqueado ? 'Aguarde…' : aprovando ? 'Confirmar aprovação' : 'Confirmar rejeição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
