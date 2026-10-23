/**
 * Ativação de dispositivo e emissão de códigos.
 */

function acaoAtivar_(req) {
  var email = normalizarEmail_(req.email);
  var codigo = String((req.payload && req.payload.codigo) || req.codigo || '').trim();
  var nomeMaquina = String((req.payload && req.payload.nome_maquina) || 'Dispositivo').trim().slice(0, 120);
  var pin = (req.payload && req.payload.pin) || '';

  if (!email || !codigo) {
    throw ApiError_(ERROS.VALIDACAO, 'Informe e-mail e código de ativação.');
  }

  verificarBloqueio_(email);
  checarVersaoApp_(req.app);

  var usuario = buscarUsuario_(email);
  if (!usuario) {
    registrarFalhaAuth_(email);
    throw ApiError_(ERROS.CODIGO_INVALIDO, 'Código ou e-mail inválido.');
  }
  if (String(usuario.ativo).toUpperCase() !== 'SIM') {
    throw ApiError_(ERROS.USUARIO_INATIVO, 'Usuário inativo.');
  }

  var codigoHash = hmac_('CODIGO:' + codigo);
  var ativacao = encontrarLinha_(ABAS.ATIVACOES, COL.ATIVACOES, function (a) {
    return normalizarEmail_(a.email) === email &&
      a.codigo_hash === codigoHash &&
      !a.usado_em;
  });

  if (!ativacao) {
    registrarFalhaAuth_(email);
    throw ApiError_(ERROS.CODIGO_INVALIDO, 'Código ou e-mail inválido.');
  }

  if (ativacao.row.expira_em && ativacao.row.expira_em < agoraIso_()) {
    registrarFalhaAuth_(email);
    throw ApiError_(ERROS.CODIGO_INVALIDO, 'Código expirado. Solicite um novo ao administrador.');
  }

  // Comandante/Admin sem PIN: pede definição sem consumir o código
  if (precisaDefinirPin_(usuario) && !pin) {
    return {
      etapa: 'DEFINIR_PIN',
      mensagem: 'Defina um PIN de 6 dígitos para aprovações.',
      email: email
    };
  }

  if (precisaDefinirPin_(usuario) && pin) {
    gravarPin_(email, pin);
    usuario = buscarUsuario_(email);
  }

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

  atualizarLinhaPorId_(ABAS.ATIVACOES, COL.ATIVACOES, 'codigo_hash', codigoHash, {
    usado_em: agora
  });

  limparFalhasAuth_(email);
  auditar_(email, usuario.unidade_id, 'ATIVAR_DISPOSITIVO', dispositivoId, 'OK');

  return {
    etapa: 'CONCLUIDO',
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

/**
 * Emite código de ativação (uso interno / admin). Retorna o código em texto
 * apenas uma vez — na planilha fica só o hash.
 */
function emitirCodigoAtivacao_(email) {
  var e = normalizarEmail_(email);
  var usuario = buscarUsuario_(e);
  if (!usuario) {
    throw ApiError_(ERROS.VALIDACAO, 'Usuário não encontrado para emitir código.');
  }
  var codigo = gerarCodigoAtivacao_();
  var expira = new Date(Date.now() + CFG.CODIGO_ATIVACAO_HORAS * 3600 * 1000).toISOString();
  appendLinha_(ABAS.ATIVACOES, COL.ATIVACOES, {
    email: e,
    codigo_hash: hmac_('CODIGO:' + codigo),
    expira_em: expira,
    usado_em: ''
  });
  return { email: e, codigo: codigo, expira_em: expira };
}

function acaoDefinirPin_(req) {
  var auth = autenticar_(req, [PERFIS.COMANDANTE, PERFIS.ADMIN]);
  var pin = (req.payload && req.payload.pin) || '';
  gravarPin_(auth.email, pin);
  auditar_(auth.email, auth.usuario.unidade_id, 'DEFINIR_PIN', auth.email, 'OK');
  return { mensagem: 'PIN definido com sucesso.' };
}
