/**
 * Perfil do próprio usuário: consulta, atualização de nome e troca de senha.
 */

function acaoPerfil_(req) {
  var auth = autenticar_(req, null);
  var p = req.payload || {};
  var op = String(p.op || 'obter').toLowerCase();

  switch (op) {
    case 'obter':
      return { usuario: sanitizarPerfilProprio_(auth.usuario) };
    case 'atualizar':
      return perfilAtualizar_(auth, p);
    case 'alterar_senha':
      return perfilAlterarSenha_(auth, p);
    default:
      throw ApiError_(ERROS.ACAO_INVALIDA, 'op inválida em perfil.');
  }
}

function sanitizarPerfilProprio_(u) {
  return {
    email: u.email,
    nome: u.nome,
    matricula: u.matricula,
    unidade_id: u.unidade_id,
    perfis: parsePerfis_(u.perfis),
    ativo: u.ativo,
    criado_em: u.criado_em,
    ultimo_acesso: u.ultimo_acesso
  };
}

function perfilAtualizar_(auth, p) {
  var nome = String(p.nome || '').trim();
  if (nome.length < 3 || nome.length > 120) {
    throw ApiError_(ERROS.VALIDACAO, 'Informe um nome entre 3 e 120 caracteres.');
  }
  atualizarLinhaPorId_(ABAS.USUARIOS, COL.USUARIOS, 'email', auth.email, {
    nome: nome
  });
  auditar_(auth.email, auth.usuario.unidade_id, 'ATUALIZAR_PERFIL', auth.email, 'OK');
  var atualizado = buscarUsuario_(auth.email);
  return {
    usuario: sanitizarPerfilProprio_(atualizado),
    mensagem: 'Perfil atualizado.'
  };
}

function perfilAlterarSenha_(auth, p) {
  var senhaAtual = p.senha_atual || '';
  var senhaNova = p.senha_nova || '';

  if (!senhaAtual || !senhaNova) {
    throw ApiError_(ERROS.VALIDACAO, 'Informe a senha atual e a nova senha.');
  }
  if (String(senhaAtual) === String(senhaNova)) {
    throw ApiError_(ERROS.VALIDACAO, 'A nova senha deve ser diferente da senha atual.');
  }

  validarSenhaUsuario_(auth.usuario, senhaAtual);
  gravarSenha_(auth.email, senhaNova);
  auditar_(auth.email, auth.usuario.unidade_id, 'ALTERAR_SENHA', auth.email, 'OK');
  return { mensagem: 'Senha alterada com sucesso.' };
}
