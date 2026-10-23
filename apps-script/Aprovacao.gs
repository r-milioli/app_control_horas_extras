/**
 * Pendências e decisão (aprovar / rejeitar) com PIN.
 */

function acaoPendencias_(req) {
  var auth = autenticar_(req, [PERFIS.COMANDANTE, PERFIS.ADMIN]);
  var todos = lerAba_(ABAS.LANCAMENTOS, COL.LANCAMENTOS).filter(function (l) {
    return l.status === STATUS.AGUARDANDO;
  });

  var lista;
  if (temPerfil_(auth.usuario, PERFIS.ADMIN) && !temPerfil_(auth.usuario, PERFIS.COMANDANTE)) {
    // Admin puro: decide lançamentos de comandantes e admins (não os de policiais comuns)
    lista = todos.filter(function (l) {
      return podeAdminDecidir_(l);
    });
  } else if (temPerfil_(auth.usuario, PERFIS.ADMIN)) {
    // Admin que também é comandante: vê unidade + casos especiais
    lista = todos.filter(function (l) {
      return l.unidade_id === auth.usuario.unidade_id || podeAdminDecidir_(l);
    });
  } else {
    // Comandante: só a própria unidade, e nunca os próprios lançamentos
    lista = todos.filter(function (l) {
      return l.unidade_id === auth.usuario.unidade_id &&
        normalizarEmail_(l.criado_por) !== auth.email;
    });
  }

  // Ninguém decide o próprio lançamento
  lista = lista.filter(function (l) {
    return normalizarEmail_(l.criado_por) !== auth.email;
  });

  var diasAlerta = Number(getConfig_('dias_alerta_pendencia', '7'));
  var limite = Date.now() - diasAlerta * 86400000;

  return {
    pendencias: lista.map(function (l) {
      var recebido = Date.parse(l.recebido_em) || 0;
      return Object.assign({}, l, {
        antiga: recebido > 0 && recebido < limite,
        minutos_legivel: formatarHoras_(Number(l.minutos) || 0)
      });
    }),
    dias_alerta_pendencia: diasAlerta
  };
}

function podeAdminDecidir_(lancamento) {
  var autor = buscarUsuario_(lancamento.criado_por);
  if (!autor) return false;
  return temPerfil_(autor, PERFIS.COMANDANTE) || temPerfil_(autor, PERFIS.ADMIN);
}

function acaoDecidir_(req) {
  var auth = autenticar_(req, [PERFIS.COMANDANTE, PERFIS.ADMIN]);
  var payload = req.payload || {};
  var ids = Array.isArray(payload.ids) ? payload.ids : (payload.id ? [payload.id] : []);
  var decisao = String(payload.decisao || '').toUpperCase();
  var motivoRejeicao = String(payload.motivo_rejeicao || '').trim();

  if (!ids.length) {
    throw ApiError_(ERROS.VALIDACAO, 'Informe id ou ids dos lançamentos.');
  }
  if (decisao !== 'APROVAR' && decisao !== 'REJEITAR') {
    throw ApiError_(ERROS.VALIDACAO, 'decisao deve ser APROVAR ou REJEITAR.');
  }
  if (decisao === 'REJEITAR') {
    validarMotivo_(motivoRejeicao);
  }

  validarPin_(auth.usuario, payload.pin);

  var resultados = [];
  for (var i = 0; i < ids.length; i++) {
    resultados.push(decidirUm_(auth, String(ids[i]), decisao, motivoRejeicao));
  }
  return { resultados: resultados };
}

function decidirUm_(auth, id, decisao, motivoRejeicao) {
  var hit = encontrarLinha_(ABAS.LANCAMENTOS, COL.LANCAMENTOS, function (l) {
    return l.id === id;
  });
  if (!hit) {
    return { id: id, ok: false, codigo: ERROS.VALIDACAO, mensagem: 'Não encontrado.' };
  }
  var l = hit.row;

  if (l.status !== STATUS.AGUARDANDO) {
    return { id: id, ok: false, codigo: ERROS.VALIDACAO, mensagem: 'Registro não está aguardando aprovação.' };
  }
  if (normalizarEmail_(l.criado_por) === auth.email) {
    return { id: id, ok: false, codigo: ERROS.NAO_AUTORIZADO, mensagem: 'Não é permitido aprovar o próprio lançamento.' };
  }

  var permitido = false;
  if (temPerfil_(auth.usuario, PERFIS.COMANDANTE) &&
      l.unidade_id === auth.usuario.unidade_id &&
      !podeAdminDecidir_(l)) {
    permitido = true;
  }
  if (temPerfil_(auth.usuario, PERFIS.ADMIN) && podeAdminDecidir_(l)) {
    permitido = true;
  }
  // Admin também pode cobrir unidade se for comandante da unidade
  if (temPerfil_(auth.usuario, PERFIS.ADMIN) &&
      temPerfil_(auth.usuario, PERFIS.COMANDANTE) &&
      l.unidade_id === auth.usuario.unidade_id) {
    permitido = true;
  }

  if (!permitido) {
    return { id: id, ok: false, codigo: ERROS.NAO_AUTORIZADO, mensagem: 'Fora do escopo de aprovação.' };
  }

  var agora = agoraIso_();
  var novoStatus = decisao === 'APROVAR' ? STATUS.APROVADO : STATUS.REJEITADO;
  atualizarLinhaPorId_(ABAS.LANCAMENTOS, COL.LANCAMENTOS, 'id', id, {
    status: novoStatus,
    decidido_por: auth.email,
    decidido_em: agora,
    atualizado_em: agora,
    motivo_rejeicao: decisao === 'REJEITAR' ? motivoRejeicao : ''
  });

  auditar_(auth.email, auth.usuario.unidade_id, decisao === 'APROVAR' ? 'APROVAR' : 'REJEITAR', id, 'OK');
  return { id: id, ok: true, status: novoStatus };
}
