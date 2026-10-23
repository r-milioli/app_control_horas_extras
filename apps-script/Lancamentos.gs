/**
 * Sync, cancelamento e cálculo de saldo.
 */

function acaoSync_(req) {
  var auth = autenticar_(req, [PERFIS.POLICIAL, PERFIS.COMANDANTE, PERFIS.ADMIN]);
  var payload = req.payload || {};
  var enviados = Array.isArray(payload.lancamentos) ? payload.lancamentos : [];
  if (enviados.length > CFG.SYNC_LOTE_MAX) {
    throw ApiError_(ERROS.VALIDACAO, 'Envie no máximo ' + CFG.SYNC_LOTE_MAX + ' lançamentos por sync.');
  }

  var resultados = [];
  for (var i = 0; i < enviados.length; i++) {
    resultados.push(receberLancamento_(auth, enviados[i]));
  }

  var cursor = String(payload.cursor || '');
  var mudancas = listarMudancasParaUsuario_(auth.usuario, cursor);
  var saldo = calcularSaldoMatricula_(auth.usuario.matricula);

  return {
    enviados: resultados,
    mudancas: mudancas.itens,
    cursor: mudancas.cursor,
    saldo: saldo,
    config: {
      versao_minima: getConfig_('versao_minima', '1.0.0'),
      dias_alerta_pendencia: Number(getConfig_('dias_alerta_pendencia', '7'))
    },
    servidor_em: agoraIso_()
  };
}

function receberLancamento_(auth, item) {
  var id = String((item && item.id) || '').trim();
  if (!id) {
    return { id: '', ok: false, codigo: ERROS.VALIDACAO, mensagem: 'id (UUID) obrigatório.' };
  }

  var existente = encontrarLinha_(ABAS.LANCAMENTOS, COL.LANCAMENTOS, function (l) {
    return l.id === id;
  });
  if (existente) {
    return { id: id, ok: true, status: existente.row.status, duplicado: true };
  }

  try {
    var tipo = String(item.tipo || '').toUpperCase();
    if (tipo !== TIPOS.HORA_EXTRA && tipo !== TIPOS.COMPENSACAO) {
      throw ApiError_(ERROS.VALIDACAO, 'Tipo deve ser HORA_EXTRA ou COMPENSACAO.');
    }
    var minutos = validarMinutos_(item.minutos);
    var motivo = validarMotivo_(item.motivo);
    var data = validarDataServico_(item.data);
    var agora = agoraIso_();

    appendLinha_(ABAS.LANCAMENTOS, COL.LANCAMENTOS, {
      id: id,
      tipo: tipo,
      ref_id: String(item.ref_id || ''),
      matricula: auth.usuario.matricula,
      nome: auth.usuario.nome,
      unidade_id: auth.usuario.unidade_id,
      data: data,
      minutos: String(minutos),
      motivo: motivo,
      criado_por: auth.email,
      criado_em: String(item.criado_em || agora),
      recebido_em: agora,
      atualizado_em: agora,
      status: STATUS.AGUARDANDO,
      decidido_por: '',
      decidido_em: '',
      motivo_rejeicao: ''
    });

    auditar_(auth.email, auth.usuario.unidade_id, 'SYNC_LANCAMENTO', id, 'AGUARDANDO_APROVACAO');
    return { id: id, ok: true, status: STATUS.AGUARDANDO, duplicado: false };
  } catch (err) {
    return {
      id: id,
      ok: false,
      codigo: err.codigo || ERROS.ERRO_INTERNO,
      mensagem: err.message || 'Falha ao receber lançamento.'
    };
  }
}

function listarMudancasParaUsuario_(usuario, cursor) {
  var todos = lerAba_(ABAS.LANCAMENTOS, COL.LANCAMENTOS);
  var isAdmin = temPerfil_(usuario, PERFIS.ADMIN);
  var isCmd = temPerfil_(usuario, PERFIS.COMANDANTE);

  var filtrados = todos.filter(function (l) {
    if (cursor && l.atualizado_em <= cursor) return false;
    if (isAdmin) return true;
    if (isCmd && l.unidade_id === usuario.unidade_id) return true;
    return l.matricula === usuario.matricula || l.criado_por === usuario.email;
  });

  filtrados.sort(function (a, b) {
    return a.atualizado_em < b.atualizado_em ? -1 : (a.atualizado_em > b.atualizado_em ? 1 : 0);
  });

  var novoCursor = cursor || '';
  if (filtrados.length) {
    novoCursor = filtrados[filtrados.length - 1].atualizado_em;
  }

  return { itens: filtrados, cursor: novoCursor };
}

function acaoCancelar_(req) {
  var auth = autenticar_(req, [PERFIS.POLICIAL, PERFIS.COMANDANTE, PERFIS.ADMIN]);
  var id = String((req.payload && req.payload.id) || '').trim();
  if (!id) {
    throw ApiError_(ERROS.VALIDACAO, 'Informe o id do lançamento.');
  }

  var hit = encontrarLinha_(ABAS.LANCAMENTOS, COL.LANCAMENTOS, function (l) {
    return l.id === id;
  });
  if (!hit) {
    throw ApiError_(ERROS.VALIDACAO, 'Lançamento não encontrado.');
  }
  var l = hit.row;
  if (normalizarEmail_(l.criado_por) !== auth.email) {
    throw ApiError_(ERROS.NAO_AUTORIZADO, 'Só o autor pode cancelar o lançamento.');
  }
  if (l.status !== STATUS.AGUARDANDO) {
    throw ApiError_(ERROS.VALIDACAO, 'Só é possível cancelar registros aguardando aprovação.');
  }

  var agora = agoraIso_();
  atualizarLinhaPorId_(ABAS.LANCAMENTOS, COL.LANCAMENTOS, 'id', id, {
    status: STATUS.CANCELADO,
    atualizado_em: agora
  });
  auditar_(auth.email, auth.usuario.unidade_id, 'CANCELAR_LANCAMENTO', id, 'OK');
  return { id: id, status: STATUS.CANCELADO };
}

function acaoSaldo_(req) {
  var auth = autenticar_(req, [PERFIS.POLICIAL, PERFIS.COMANDANTE, PERFIS.ADMIN]);
  var payload = req.payload || {};

  if (temPerfil_(auth.usuario, PERFIS.ADMIN) && payload.matricula) {
    return calcularSaldoMatricula_(payload.matricula);
  }
  if (temPerfil_(auth.usuario, PERFIS.COMANDANTE) && payload.unidade) {
    return listarSaldosUnidade_(auth.usuario.unidade_id);
  }
  if (temPerfil_(auth.usuario, PERFIS.COMANDANTE) && !payload.matricula) {
    return listarSaldosUnidade_(auth.usuario.unidade_id);
  }
  return calcularSaldoMatricula_(auth.usuario.matricula);
}

function calcularSaldoMatricula_(matricula) {
  var mat = String(matricula || '');
  var rows = lerAba_(ABAS.LANCAMENTOS, COL.LANCAMENTOS).filter(function (l) {
    return l.matricula === mat && l.status === STATUS.APROVADO;
  });

  var extras = 0;
  var comps = 0;
  var estornoExtras = 0;
  var estornoComps = 0;
  var extrato = [];

  rows.forEach(function (l) {
    var min = Number(l.minutos) || 0;
    if (l.tipo === TIPOS.HORA_EXTRA) {
      extras += min;
      extrato.push(itemExtrato_(l, min));
    } else if (l.tipo === TIPOS.COMPENSACAO) {
      comps += min;
      extrato.push(itemExtrato_(l, -min));
    } else if (l.tipo === TIPOS.ESTORNO) {
      var ref = encontrarLinha_(ABAS.LANCAMENTOS, COL.LANCAMENTOS, function (x) {
        return x.id === l.ref_id;
      });
      if (ref && ref.row.tipo === TIPOS.HORA_EXTRA) {
        estornoExtras += min;
        extrato.push(itemExtrato_(l, -min));
      } else if (ref && ref.row.tipo === TIPOS.COMPENSACAO) {
        estornoComps += min;
        extrato.push(itemExtrato_(l, min));
      }
    }
  });

  // saldo = extras − comps − estornos(extras) + estornos(comps)
  var saldoMin = extras - comps - estornoExtras + estornoComps;
  return {
    matricula: mat,
    minutos: saldoMin,
    legivel: formatarHoras_(saldoMin),
    creditos_min: extras,
    debitos_min: comps,
    estornos_extra_min: estornoExtras,
    estornos_comp_min: estornoComps,
    extrato: extrato
  };
}

function itemExtrato_(l, delta) {
  return {
    id: l.id,
    tipo: l.tipo,
    data: l.data,
    minutos: Number(l.minutos) || 0,
    delta_minutos: delta,
    motivo: l.motivo,
    status: l.status
  };
}

function listarSaldosUnidade_(unidadeId) {
  var usuarios = lerAba_(ABAS.USUARIOS, COL.USUARIOS).filter(function (u) {
    return u.unidade_id === unidadeId && String(u.ativo).toUpperCase() === 'SIM';
  });
  return {
    unidade_id: unidadeId,
    policiais: usuarios.map(function (u) {
      var s = calcularSaldoMatricula_(u.matricula);
      return {
        email: u.email,
        nome: u.nome,
        matricula: u.matricula,
        minutos: s.minutos,
        legivel: s.legivel
      };
    })
  };
}
