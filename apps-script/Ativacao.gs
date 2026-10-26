/**
 * Login com e-mail e senha (sem código de ativação).
 * Emite token de dispositivo para a sessão neste computador.
 */

function acaoLogin_(req) {
  var email = normalizarEmail_(req.email);
  var senha = (req.payload && req.payload.senha) || req.senha || '';
  var nomeMaquina = String((req.payload && req.payload.nome_maquina) || 'Dispositivo').trim().slice(0, 120);

  if (!email || !senha) {
    throw ApiError_(ERROS.VALIDACAO, 'Informe e-mail e senha.');
  }

  verificarBloqueio_(email);
  checarVersaoApp_(req.app);

  var usuario = buscarUsuario_(email);
  if (!usuario) {
    registrarFalhaAuth_(email);
    throw ApiError_(ERROS.SENHA_INVALIDA, 'E-mail ou senha inválidos.');
  }
  if (String(usuario.ativo).toUpperCase() !== 'SIM') {
    throw ApiError_(ERROS.USUARIO_INATIVO, 'Usuário inativo.');
  }
  if (!usuario.senha_hash) {
    throw ApiError_(
      ERROS.VALIDACAO,
      'Usuário sem senha. Solicite ao administrador a emissão de uma nova senha.'
    );
  }

  // Valida senha (já registra falha / limpa bloqueio)
  validarSenhaUsuario_(usuario, senha);

  var token = gerarTokenDispositivo_();
  var agora = agoraIso_();
  var dispositivoId = uuid_();

  appendLinha_(ABAS.DISPOSITIVOS, COL.DISPOSITIVOS, {
    id: dispositivoId,
    email: email,
    token_hash: hmac_(token),
    nome_maquina: nomeMaquina || 'Dispositivo',
    ativo: 'SIM',
    criado_em: agora,
    ultimo_sync: agora
  });

  touchUsuario_(email);
  auditar_(email, usuario.unidade_id, 'LOGIN', dispositivoId, 'OK');

  return {
    token: token,
    dispositivo_id: dispositivoId,
    usuario: {
      email: usuario.email,
      nome: usuario.nome,
      matricula: usuario.matricula,
      unidade_id: usuario.unidade_id,
      perfis: parsePerfis_(usuario.perfis)
    }
  };
}
