import { FormEvent, useEffect, useState } from 'react'
import type { UsuarioCache } from '../../../shared/types'
import { validarSenhaForte } from '../../../shared/validation'
import { rotuloPerfil, type PerfilApp, parsePerfis } from '../lib/roles'

interface Props {
  usuario: UsuarioCache | null
  online: boolean
  notify: (msg: string) => void
  onUsuarioAtualizado: () => void
}

export default function MeuPerfil({ usuario, online, notify, onUsuarioAtualizado }: Props) {
  const [nome, setNome] = useState(usuario?.nome || '')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [erroNome, setErroNome] = useState('')
  const [okNome, setOkNome] = useState('')

  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaConfirma, setSenhaConfirma] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [okSenha, setOkSenha] = useState('')

  useEffect(() => {
    setNome(usuario?.nome || '')
  }, [usuario?.nome])

  const perfis = parsePerfis(usuario?.perfis)
  const dicaSenha =
    'Mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.'

  async function salvarNome(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErroNome('')
    setOkNome('')
    if (!online) {
      setErroNome('É preciso estar online para atualizar o perfil.')
      return
    }
    const n = nome.trim()
    if (n.length < 3 || n.length > 120) {
      setErroNome('Informe um nome entre 3 e 120 caracteres.')
      return
    }
    setSalvandoNome(true)
    try {
      if (typeof window.api?.atualizarPerfil !== 'function') {
        setErroNome('Recurso indisponível. Reinicie o aplicativo e tente de novo.')
        return
      }
      const res = await window.api.atualizarPerfil({ nome: n })
      if (!res.ok) {
        setErroNome(res.mensagem || 'Não foi possível atualizar o nome.')
        return
      }
      setOkNome('Nome atualizado com sucesso.')
      notify('Nome atualizado.')
      onUsuarioAtualizado()
    } catch (err) {
      setErroNome(err instanceof Error ? err.message : 'Falha ao atualizar o nome.')
    } finally {
      setSalvandoNome(false)
    }
  }

  async function alterarSenha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErroSenha('')
    setOkSenha('')

    // Lê do formulário (cobre autofill do navegador que não dispara onChange no React)
    const fd = new FormData(e.currentTarget)
    const atual = String(fd.get('senha_atual') || senhaAtual || '')
    const nova = String(fd.get('senha_nova') || senhaNova || '')
    const confirma = String(fd.get('senha_confirma') || senhaConfirma || '')

    setSenhaAtual(atual)
    setSenhaNova(nova)
    setSenhaConfirma(confirma)

    if (!online) {
      setErroSenha('É preciso estar online para alterar a senha.')
      return
    }
    if (!atual || !nova || !confirma) {
      setErroSenha('Preencha a senha atual, a nova senha e a confirmação.')
      return
    }
    const regra = validarSenhaForte(nova)
    if (regra) {
      setErroSenha(regra)
      return
    }
    if (nova !== confirma) {
      setErroSenha('A confirmação não confere com a nova senha.')
      return
    }
    if (atual === nova) {
      setErroSenha('A nova senha deve ser diferente da senha atual.')
      return
    }

    setSalvandoSenha(true)
    try {
      if (typeof window.api?.alterarSenha !== 'function') {
        setErroSenha('Recurso indisponível. Reinicie o aplicativo e tente de novo.')
        return
      }
      const res = await window.api.alterarSenha({
        senha_atual: atual,
        senha_nova: nova
      })
      if (!res.ok) {
        setErroSenha(res.mensagem || 'Não foi possível alterar a senha.')
        return
      }
      setSenhaAtual('')
      setSenhaNova('')
      setSenhaConfirma('')
      setOkSenha('Senha alterada com sucesso. Use a nova senha no próximo login.')
      notify('Senha alterada com sucesso.')
    } catch (err) {
      setErroSenha(err instanceof Error ? err.message : 'Falha ao alterar a senha.')
    } finally {
      setSalvandoSenha(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Conta</div>
          <h1>Meu perfil</h1>
          <p>Consulte seus dados cadastrais e altere o nome ou a senha da conta.</p>
        </div>
      </div>

      {!online && (
        <div className="alert alert-warn" style={{ marginBottom: 16 }}>
          Sem internet. Visualização local disponível; alterações exigem conexão.
        </div>
      )}

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div>
            <h2>Dados da conta</h2>
            <p>E-mail, matrícula e unidade são definidos pela administração.</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="field">
            <label>E-mail</label>
            <input readOnly value={usuario?.email || ''} />
          </div>
          <div className="field">
            <label>Matrícula</label>
            <input readOnly value={usuario?.matricula || ''} />
          </div>
          <div className="field">
            <label>Unidade</label>
            <input readOnly value={usuario?.unidade_id || ''} />
          </div>
          <div className="field">
            <label>Perfis</label>
            <input
              readOnly
              value={perfis.map((p) => rotuloPerfil(p as PerfilApp)).join(', ') || '—'}
            />
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div>
            <h2>Nome de exibição</h2>
            <p>Como seu nome aparece nos lançamentos e na barra lateral.</p>
          </div>
        </div>
        <form onSubmit={(e) => void salvarNome(e)}>
          <div className="panel-body">
            <div className="field">
              <label htmlFor="perfil-nome">Nome</label>
              <input
                id="perfil-nome"
                name="nome"
                required
                minLength={3}
                maxLength={120}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={!online || salvandoNome}
              />
            </div>
            {erroNome && <div className="alert alert-error">{erroNome}</div>}
            {okNome && <div className="alert alert-info">{okNome}</div>}
          </div>
          <div className="panel-actions">
            <button type="submit" className="btn btn-primary" disabled={!online || salvandoNome}>
              {salvandoNome ? 'Salvando…' : 'Salvar nome'}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Alterar senha</h2>
            <p>Digite a senha atual e a nova senha duas vezes. {dicaSenha}</p>
          </div>
        </div>
        <form onSubmit={(e) => void alterarSenha(e)}>
          <div className="panel-body">
            <div className="field">
              <label htmlFor="senha-atual">Senha atual</label>
              <input
                id="senha-atual"
                name="senha_atual"
                type="password"
                required
                autoComplete="current-password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                disabled={!online || salvandoSenha}
              />
            </div>
            <div className="field">
              <label htmlFor="senha-nova">Nova senha</label>
              <input
                id="senha-nova"
                name="senha_nova"
                type="password"
                required
                autoComplete="new-password"
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                disabled={!online || salvandoSenha}
              />
              <div className="field-hint">{dicaSenha}</div>
            </div>
            <div className="field">
              <label htmlFor="senha-confirma">Confirmar nova senha</label>
              <input
                id="senha-confirma"
                name="senha_confirma"
                type="password"
                required
                autoComplete="new-password"
                value={senhaConfirma}
                onChange={(e) => setSenhaConfirma(e.target.value)}
                disabled={!online || salvandoSenha}
              />
            </div>
            {erroSenha && <div className="alert alert-error">{erroSenha}</div>}
            {okSenha && <div className="alert alert-info">{okSenha}</div>}
          </div>
          <div className="panel-actions">
            <button type="submit" className="btn btn-primary" disabled={!online || salvandoSenha}>
              {salvandoSenha ? 'Alterando…' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
