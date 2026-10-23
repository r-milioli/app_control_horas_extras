/**
 * Autenticação, perfis e PIN.
 */

function autenticar_(req, perfisPermitidos) {
  var email = normalizarEmail_(req.email);
  if (!email || !req.token) {
    throw ApiError_(ERROS.NAO_AUTORIZADO, 'E-mail e token são obrigatórios.');
  }

  verificarBloqueio_(email);
  checarVersaoApp_(req.app);

  var usuario = buscarUsuario_(email);
  if (!usuario) {
    registrarFalhaAuth_(email);
    throw ApiError_(ERROS.NAO_AUTORIZADO, 'Usuário não encontrado.');
  }
  if (String(usuario.ativo).toUpperCase() !== 'SIM') {
    throw ApiError_(ERROS.USUARIO_INATIVO, 'Usuário inativo.');
  }

  var tokenHash = hmac_(req.token);
  var dispositivo = encontrarLinha_(ABAS.DISPOSITIVOS, COL.DISPOSITIVOS, function (d) {
    return d.email === email && d.token_hash === tokenHash && String(d.ativo).toUpperCase() === 'SIM';
  });

  if (!dispositivo) {
    registrarFalhaAuth_(email);
    throw ApiError_(ERROS.NAO_AUTORIZADO, 'Dispositivo não autorizado.');
  }

  if (perfisPermitidos && perfisPermitidos.length) {
    var ok = perfisPermitidos.some(function (p) {
      return temPerfil_(usuario, p);
    });
    if (!ok) {
      throw ApiError_(ERROS.NAO_AUTORIZADO, 'Perfil sem permissão para esta ação.');
    }
  }

  limparFalhasAuth_(email);
  touchUsuario_(email);
  touchDispositivo_(dispositivo.row.id);

  return {
    usuario: usuario,
    dispositivo: dispositivo.row,
    email: email
  };
}

function checarVersaoApp_(appVersion) {
  var minima = getConfig_('versao_minima', '1.0.0');
  var atual = String(appVersion || CFG.VERSAO_APP_PADRAO);
  if (compararVersao_(atual, minima) < 0) {
    throw ApiError_(ERROS.VERSAO_ANTIGA, 'Atualize o aplicativo. Versão mínima: ' + minima);
  }
}

function compararVersao_(a, b) {
  var pa = String(a).split('.').map(Number);
  var pb = String(b).split('.').map(Number);
  for (var i = 0; i < 3; i++) {
    var x = pa[i] || 0;
    var y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function buscarUsuario_(email) {
  var hit = encontrarLinha_(ABAS.USUARIOS, COL.USUARIOS, function (u) {
    return normalizarEmail_(u.email) === normalizarEmail_(email);
  });
  return hit ? hit.row : null;
}

function touchUsuario_(email) {
  atualizarLinhaPorId_(ABAS.USUARIOS, COL.USUARIOS, 'email', normalizarEmail_(email), {
    ultimo_acesso: agoraIso_()
  });
}

function touchDispositivo_(id) {
  atualizarLinhaPorId_(ABAS.DISPOSITIVOS, COL.DISPOSITIVOS, 'id', id, {
    ultimo_sync: agoraIso_()
  });
}

function validarPin_(usuario, pin) {
  verificarBloqueio_(usuario.email);
  var p = String(pin || '').trim();
  if (!/^\d{6}$/.test(p)) {
    registrarFalhaAuth_(usuario.email);
    throw ApiError_(ERROS.PIN_INVALIDO, 'PIN deve ter 6 dígitos.');
  }
  if (!usuario.pin_hash || usuario.pin_hash !== hmac_('PIN:' + p)) {
    registrarFalhaAuth_(usuario.email);
    throw ApiError_(ERROS.PIN_INVALIDO, 'PIN inválido.');
  }
  limparFalhasAuth_(usuario.email);
}

function precisaDefinirPin_(usuario) {
  var perfis = parsePerfis_(usuario.perfis);
  var sensivel = perfis.indexOf(PERFIS.COMANDANTE) >= 0 || perfis.indexOf(PERFIS.ADMIN) >= 0;
  return sensivel && !usuario.pin_hash;
}

function gravarPin_(email, pin) {
  var p = String(pin || '').trim();
  if (!/^\d{6}$/.test(p)) {
    throw ApiError_(ERROS.VALIDACAO, 'PIN deve ter 6 dígitos numéricos.');
  }
  atualizarLinhaPorId_(ABAS.USUARIOS, COL.USUARIOS, 'email', normalizarEmail_(email), {
    pin_hash: hmac_('PIN:' + p)
  });
}

function limparPin_(email) {
  atualizarLinhaPorId_(ABAS.USUARIOS, COL.USUARIOS, 'email', normalizarEmail_(email), {
    pin_hash: ''
  });
}
