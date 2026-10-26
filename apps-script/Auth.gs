/**
 * Autenticação, perfis e senha forte.
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

/**
 * Política de senha forte (todos os perfis):
 * - mínimo 8 caracteres
 * - ao menos 1 maiúscula, 1 minúscula, 1 dígito e 1 caractere especial
 */
function mensagemRegraSenha_() {
  return 'A senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.';
}

function validarSenhaForte_(senha) {
  var s = String(senha || '');
  if (s.length < CFG.SENHA_MIN) {
    throw ApiError_(ERROS.VALIDACAO, mensagemRegraSenha_());
  }
  if (!/[A-Z]/.test(s) || !/[a-z]/.test(s) || !/[0-9]/.test(s) || !/[^A-Za-z0-9]/.test(s)) {
    throw ApiError_(ERROS.VALIDACAO, mensagemRegraSenha_());
  }
}

function hashSenha_(senha) {
  return hmac_('SENHA:' + String(senha));
}

function gerarSenhaForte_() {
  var maiusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  var minusculas = 'abcdefghijkmnopqrstuvwxyz';
  var digitos = '23456789';
  var especiais = '!@#$%&*-_=+';
  var todos = maiusculas + minusculas + digitos + especiais;
  var chars = [
    maiusculas.charAt(Math.floor(Math.random() * maiusculas.length)),
    minusculas.charAt(Math.floor(Math.random() * minusculas.length)),
    digitos.charAt(Math.floor(Math.random() * digitos.length)),
    especiais.charAt(Math.floor(Math.random() * especiais.length))
  ];
  for (var i = chars.length; i < 12; i++) {
    chars.push(todos.charAt(Math.floor(Math.random() * todos.length)));
  }
  // Embaralha
  for (var j = chars.length - 1; j > 0; j--) {
    var k = Math.floor(Math.random() * (j + 1));
    var tmp = chars[j];
    chars[j] = chars[k];
    chars[k] = tmp;
  }
  var senha = chars.join('');
  validarSenhaForte_(senha);
  return senha;
}

function gravarSenha_(email, senha) {
  validarSenhaForte_(senha);
  atualizarLinhaPorId_(ABAS.USUARIOS, COL.USUARIOS, 'email', normalizarEmail_(email), {
    senha_hash: hashSenha_(senha)
  });
}

function emitirSenhaInicial_(email) {
  var senha = gerarSenhaForte_();
  gravarSenha_(email, senha);
  return senha;
}

function validarSenhaUsuario_(usuario, senha) {
  verificarBloqueio_(usuario.email);
  var s = String(senha || '');
  if (!usuario.senha_hash || usuario.senha_hash !== hashSenha_(s)) {
    registrarFalhaAuth_(usuario.email);
    throw ApiError_(ERROS.SENHA_INVALIDA, 'Senha inválida.');
  }
  limparFalhasAuth_(usuario.email);
}
