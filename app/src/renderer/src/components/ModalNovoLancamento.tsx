import { FormEvent, useEffect, useState } from 'react'
import { hojeIsoDate } from '../lib/format'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  notify: (msg: string) => void
}

const ATALHOS = [
  { label: '30 min', min: 30 },
  { label: '1 hora', min: 60 },
  { label: '1h30', min: 90 },
  { label: '2 horas', min: 120 },
  { label: '4 horas', min: 240 }
]

export default function ModalNovoLancamento({ open, onClose, onSaved, notify }: Props) {
  const [tipo, setTipo] = useState<'HORA_EXTRA' | 'COMPENSACAO'>('HORA_EXTRA')
  const [data, setData] = useState(hojeIsoDate())
  const [minutos, setMinutos] = useState(120)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open) return
    setTipo('HORA_EXTRA')
    setData(hojeIsoDate())
    setMinutos(120)
    setMotivo('')
    setErro('')
    setLoading(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onClose])

  async function salvar(finalizar: boolean) {
    setErro('')
    setLoading(true)
    try {
      const res = await window.api.criarLancamento({
        tipo,
        data,
        minutos: Number(minutos),
        motivo,
        finalizar
      })
      if (!res.ok) {
        setErro(res.mensagem)
        return
      }
      notify(
        finalizar
          ? 'Lançamento pronto para sincronizar.'
          : 'Rascunho salvo neste computador.'
      )
      onSaved()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void salvar(true)
  }

  if (!open) return null

  return (
    <div
      className="modal-backdrop open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalNovoTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2 id="modalNovoTitle">Novo lançamento</h2>
            <p>Preencha os dados do serviço ou da compensação.</p>
          </div>
          <button
            type="button"
            className="modal-close"
            aria-label="Fechar"
            disabled={loading}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="field">
              <label htmlFor="entryType">Tipo de lançamento</label>
              <select
                id="entryType"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as typeof tipo)}
                required
              >
                <option value="HORA_EXTRA">Hora extra</option>
                <option value="COMPENSACAO">Compensação</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="entryDate">Data do serviço</label>
              <input
                id="entryDate"
                type="date"
                required
                max={hojeIsoDate()}
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
              <div className="field-hint">A data não pode ser futura.</div>
            </div>
            <div className="field">
              <label htmlFor="entryDuration">Duração em minutos</label>
              <input
                id="entryDuration"
                type="number"
                min={30}
                max={1440}
                step={30}
                required
                value={minutos}
                onChange={(e) => setMinutos(Number(e.target.value))}
              />
              <div className="duration-options">
                {ATALHOS.map((a) => (
                  <button key={a.min} type="button" onClick={() => setMinutos(a.min)}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="entryReason">Motivo</label>
              <textarea
                id="entryReason"
                required
                minLength={5}
                maxLength={500}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Descreva o motivo do lançamento (5 a 500 caracteres)."
              />
              <div className="field-hint">
                O registro enviado não poderá ser editado. Antes da decisão, poderá ser cancelado.
              </div>
            </div>
            {erro && <div className="alert alert-error">{erro}</div>}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading}
              onClick={() => void salvar(false)}
            >
              Salvar rascunho
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando…' : 'Finalizar para envio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
