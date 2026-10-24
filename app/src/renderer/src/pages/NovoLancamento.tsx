import { FormEvent, useState } from 'react'
import { hojeIsoDate } from '../lib/format'

interface Props {
  onSaved: () => void
  onCancel: () => void
  notify: (msg: string) => void
}

const ATALHOS = [
  { label: '30 min', min: 30 },
  { label: '1 hora', min: 60 },
  { label: '1h30', min: 90 },
  { label: '2 horas', min: 120 },
  { label: '4 horas', min: 240 }
]

export default function NovoLancamento({ onSaved, onCancel, notify }: Props) {
  const [tipo, setTipo] = useState<'HORA_EXTRA' | 'COMPENSACAO'>('HORA_EXTRA')
  const [data, setData] = useState(hojeIsoDate())
  const [minutos, setMinutos] = useState(120)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

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
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void salvar(true)
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Operação</div>
          <h1>Novo lançamento</h1>
          <p>Preencha os dados do serviço ou da compensação. O registro enviado não poderá ser editado.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="HORA_EXTRA">Hora extra</option>
            <option value="COMPENSACAO">Compensação</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="data">Data do serviço</label>
          <input
            id="data"
            type="date"
            required
            max={hojeIsoDate()}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
          <div className="field-hint">A data não pode ser futura.</div>
        </div>
        <div className="field">
          <label htmlFor="minutos">Duração em minutos</label>
          <input
            id="minutos"
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
          <label htmlFor="motivo">Motivo</label>
          <textarea
            id="motivo"
            required
            minLength={5}
            maxLength={500}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Descreva o motivo (5 a 500 caracteres)."
          />
        </div>
        {erro && <div className="alert alert-error">{erro}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
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
  )
}
