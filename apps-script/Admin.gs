/**
 * Relatórios, estorno, gestão de usuários/unidades e auditoria.
 */

function acaoRelatorio_(req) {
  var auth = autenticar_(req, [PERFIS.ADMIN]);
  var p = req.payload || {};
  var tipo = String(p.tipo || 'resumo_unidade').toLowerCase();
  var rows = lerAba_(ABAS.LANCAMENTOS, COL.LANCAMENTOS);

  if (p.periodo_inicio) {
    rows = rows.filter(function (l) { return l.data >= p.periodo_inicio; });
  }
  if (p.periodo_fim) {
    rows = rows.filter(function (l) { return l.data <= p.periodo_fim; });
  }
  if (p.unidade_id) {
    rows = rows.filter(function (l) { return l.unidade_id === p.unidade_id; });
  }
  if (p.matricula) {
    rows = rows.filter(function (l) { return l.matricula === p.matricula; });
  }
  if (p.status) {
    rows = rows.filter(function (l) { return l.status === String(p.status).toUpperCase(); });
  }

  auditar_(auth.email, auth.usuario.unidade_id, 'RELATORIO', tipo, 'OK');

  if (tipo === 'extrato_policial') {
    if (!p.matricula) {
      throw ApiError_(ERROS.VALIDACAO, 'Informe matricula para extrato.');
    }
    return {
      tipo: tipo,
      saldo: calcularSaldoMatricula_(p.matricula),
      registros: rows
    };
  }

  if (tipo === 'pendencias') {
    return {
      tipo: tipo,
      registros: rows.filter(function (l) { return l.status === STATUS.AGUARDANDO; })
    };
  }

  // resumo_unidade (padrão)
  var porUnidade = {};
  rows.forEach(function (l) {
    if (!porUnidade[l.unidade_id]) {
      porUnidade[l.unidade_id] = {
        unidade_id: l.unidade_id,
        aprovados: 0,
        pendentes: 0,
        rejeitados: 0,
        minutos_extras_aprovados: 0,
        minutos_comp_aprovados: 0
      };
    }
    var u = porUnidade[l.unidade_id];
    if (l.status === STATUS.APROVADO) {
      u.aprovados++;
      if (l.tipo === TIPOS.HORA_EXTRA) u.minutos_extras_aprovados += Number(l.minutos) || 0;
      if (l.tipo === TIPOS.COMPENSACAO) u.minutos_comp_aprovados += Number(l.minutos) || 0;
    } else if (l.status === STATUS.AGUARDANDO) {
      u.pendentes++;
    } else if (l.status === STATUS.REJEITADO) {
      u.rejeitados++;
    }
  });

  return {
    tipo: 'resumo_unidade',
    unidades: Object.keys(porUnidade).map(function (k) { return porUnidade[k]; }),
    total_registros: rows.length
  };
}

function acaoEstornar_(req) {
  var auth = autenticar_(req, [PERFIS.ADMIN]);
  var p = req.payload || {};
  var refId = String(p.ref_id || '').trim();
  var motivo = validarMotivo_(p.motivo);

  if (!refId) {
    throw ApiError_(ERROS.VALIDACAO, 'Informe ref_id do lançamento original.');
  }

  var hit = encontrarLinha_(ABAS.LANCAMENTOS, COL.LANCAMENTOS, function (l) {
    return l.id === refId;
  });
  if (!hit) {
    throw ApiError_(ERROS.VALIDACAO, 'Lançamento original não encontrado.');
  }
  var orig = hit.row;
  if (orig.status !== STATUS.APROVADO) {
    throw ApiError_(ERROS.VALIDACAO, 'Só é possível estornar lançamentos aprovados.');
  }
  if (orig.tipo === TIPOS.ESTORNO) {
    throw ApiError_(ERROS.VALIDACAO, 'Não é possível estornar um estorno.');
  }
  if (normalizarEmail_(orig.criado_por) === auth.email) {
    throw ApiError_(ERROS.NAO_AUTORIZADO, 'Admin não pode estornar lançamento próprio.');
  }

  var ja = encontrarLinha_(ABAS.LANCAMENTOS, COL.LANCAMENTOS, function (l) {
    return l.tipo === TIPOS.ESTORNO && l.ref_id === refId && l.status === STATUS.APROVADO;
  });
  if (ja) {
    throw ApiError_(ERROS.VALIDACAO, 'Já existe estorno aprovado para este lançamento.');
  }

  var agora = agoraIso_();
  var id = uuid_();
  appendLinha_(ABAS.LANCAMENTOS, COL.LANCAMENTOS, {
    id: id,
    tipo: TIPOS.ESTORNO,
    ref_id: refId,
    matricula: orig.matricula,
    nome: orig.nome,
    unidade_id: orig.unidade_id,
    data: hojeIso_(),
    minutos: orig.minutos,
    motivo: motivo,
    criado_por: auth.email,
    criado_em: agora,
    recebido_em: agora,
    atualizado_em: agora,
    status: STATUS.APROVADO,
    decidido_por: auth.email,
    decidido_em: agora,
    motivo_rejeicao: ''
  });

  auditar_(auth.email, auth.usuario.unidade_id, 'ESTORNAR', id, 'OK');
  return { id: id, ref_id: refId, status: STATUS.APROVADO };
}

function acaoAdminUsuarios_(req) {
  var auth = autenticar_(req, [PERFIS.ADMIN]);
  var p = req.payload || {};
  var op = String(p.op || '').toLowerCase();

  switch (op) {
    case 'listar_usuarios':
      return { usuarios: lerAba_(ABAS.USUARIOS, COL.USUARIOS).map(sanitizarUsuario_) };
    case 'listar_unidades':
      return { unidades: lerAba_(ABAS.UNIDADES, COL.UNIDADES) };
    case 'listar_dispositivos':
      return { dispositivos: lerAba_(ABAS.DISPOSITIVOS, COL.DISPOSITIVOS).map(function (d) {
        return {
          id: d.id,
          email: d.email,
          nome_maquina: d.nome_maquina,
          ativo: d.ativo,
          criado_em: d.criado_em,
          ultimo_sync: d.ultimo_sync
        };
      }) };
    case 'criar_unidade':
      return adminCriarUnidade_(auth, p);
    case 'atualizar_unidade':
      return adminAtualizarUnidade_(auth, p);
    case 'criar_usuario':
      return adminCriarUsuario_(auth, p);
    case 'atualizar_usuario':
      return adminAtualizarUsuario_(auth, p);
    case 'desativar_usuario':
      return adminDesativarUsuario_(auth, p);
    case 'revogar_dispositivo':
      return adminRevogarDispositivo_(auth, p);
    case 'emitir_codigo':
      return adminEmitirCodigo_(auth, p);
    case 'redefinir_pin':
      return adminRedefinirPin_(auth, p);
    default:
      throw ApiError_(ERROS.ACAO_INVALIDA, 'op inválida em admin_usuarios.');
  }
}

function sanitizarUsuario_(u) {
  return {
    email: u.email,
    nome: u.nome,
    matricula: u.matricula,
    unidade_id: u.unidade_id,
    perfis: parsePerfis_(u.perfis),
    ativo: u.ativo,
    tem_pin: !!u.pin_hash,
    criado_em: u.criado_em,
    ultimo_acesso: u.ultimo_acesso
  };
}

function adminCriarUnidade_(auth, p) {
  var id = String(p.id || '').trim().toUpperCase();
  var nome = String(p.nome || '').trim();
  if (!id || !nome) {
    throw ApiError_(ERROS.VALIDACAO, 'id e nome da unidade são obrigatórios.');
  }
  var existe = encontrarLinha_(ABAS.UNIDADES, COL.UNIDADES, function (u) {
    return u.id === id;
  });
  if (existe) {
    throw ApiError_(ERROS.VALIDACAO, 'Unidade já existe.');
  }
  appendLinha_(ABAS.UNIDADES, COL.UNIDADES, {
    id: id,
    nome: nome,
    comandante_email: normalizarEmail_(p.comandante_email || ''),
    ativa: 'SIM'
  });
  auditar_(auth.email, auth.usuario.unidade_id, 'CRIAR_UNIDADE', id, 'OK');
  return { id: id, nome: nome };
}

function adminAtualizarUnidade_(auth, p) {
  var id = String(p.id || '').trim().toUpperCase();
  if (!id) {
    throw ApiError_(ERROS.VALIDACAO, 'Informe o id da unidade.');
  }
  var existe = encontrarLinha_(ABAS.UNIDADES, COL.UNIDADES, function (u) {
    return u.id === id;
  });
  if (!existe) {
    throw ApiError_(ERROS.VALIDACAO, 'Unidade não encontrada.');
  }
  var patch = {};
  if (p.nome) patch.nome = String(p.nome).trim();
  if (Object.prototype.hasOwnProperty.call(p, 'comandante_email')) {
    patch.comandante_email = normalizarEmail_(p.comandante_email || '');
  }
  if (p.ativa) {
    patch.ativa = String(p.ativa).toUpperCase() === 'SIM' ? 'SIM' : 'NAO';
  }
  if (Object.keys(patch).length) {
    atualizarLinhaPorId_(ABAS.UNIDADES, COL.UNIDADES, 'id', id, patch);
  }
  auditar_(auth.email, auth.usuario.unidade_id, 'ATUALIZAR_UNIDADE', id, 'OK');
  var row = encontrarLinha_(ABAS.UNIDADES, COL.UNIDADES, function (u) {
    return u.id === id;
  });
  return { unidade: row ? row.row : { id: id } };
}

function adminCriarUsuario_(auth, p) {
  var email = normalizarEmail_(p.email);
  var nome = String(p.nome || '').trim();
  var matricula = String(p.matricula || '').trim();
  var unidadeId = String(p.unidade_id || '').trim();
  var perfis = Array.isArray(p.perfis) ? p.perfis : String(p.perfis || 'POLICIAL').split(',');
  perfis = perfis.map(function (x) { return String(x).trim().toUpperCase(); }).filter(Boolean);

  if (!email || !nome || !matricula || !unidadeId || !perfis.length) {
    throw ApiError_(ERROS.VALIDACAO, 'email, nome, matricula, unidade_id e perfis são obrigatórios.');
  }
  if (buscarUsuario_(email)) {
    throw ApiError_(ERROS.VALIDACAO, 'E-mail já cadastrado.');
  }
  var unidade = encontrarLinha_(ABAS.UNIDADES, COL.UNIDADES, function (u) {
    return u.id === unidadeId;
  });
  if (!unidade) {
    throw ApiError_(ERROS.VALIDACAO, 'Unidade não encontrada.');
  }

  appendLinha_(ABAS.USUARIOS, COL.USUARIOS, {
    email: email,
    nome: nome,
    matricula: matricula,
    unidade_id: unidadeId,
    perfis: perfis.join(','),
    ativo: 'SIM',
    pin_hash: '',
    criado_em: agoraIso_(),
    ultimo_acesso: ''
  });

  var codigo = emitirCodigoAtivacao_(email);
  auditar_(auth.email, auth.usuario.unidade_id, 'CRIAR_USUARIO', email, 'OK');
  return {
    usuario: sanitizarUsuario_(buscarUsuario_(email)),
    codigo_ativacao: codigo.codigo,
    expira_em: codigo.expira_em
  };
}

function adminAtualizarUsuario_(auth, p) {
  var email = normalizarEmail_(p.email);
  var usuario = buscarUsuario_(email);
  if (!usuario) {
    throw ApiError_(ERROS.VALIDACAO, 'Usuário não encontrado.');
  }

  var patch = {};
  if (p.nome) patch.nome = String(p.nome).trim();
  if (p.unidade_id) patch.unidade_id = String(p.unidade_id).trim();
  if (p.perfis) {
    var perfis = Array.isArray(p.perfis) ? p.perfis : String(p.perfis).split(',');
    perfis = perfis.map(function (x) { return String(x).trim().toUpperCase(); }).filter(Boolean);
    if (email === auth.email && perfis.indexOf(PERFIS.ADMIN) < 0) {
      throw ApiError_(ERROS.VALIDACAO, 'Você não pode remover o próprio perfil ADMIN.');
    }
    patch.perfis = perfis.join(',');
  }
  if (p.matricula && String(p.matricula).trim() !== usuario.matricula) {
    var temLanc = encontrarLinha_(ABAS.LANCAMENTOS, COL.LANCAMENTOS, function (l) {
      return l.matricula === usuario.matricula;
    });
    if (temLanc) {
      throw ApiError_(ERROS.VALIDACAO, 'Matrícula não pode mudar após haver lançamentos.');
    }
    patch.matricula = String(p.matricula).trim();
  }
  if (p.ativo) {
    var novoAtivo = String(p.ativo).toUpperCase() === 'SIM' ? 'SIM' : 'NAO';
    if (email === auth.email && novoAtivo === 'NAO') {
      throw ApiError_(ERROS.VALIDACAO, 'Você não pode desativar a si mesmo.');
    }
    patch.ativo = novoAtivo;
  }

  if (Object.keys(patch).length) {
    atualizarLinhaPorId_(ABAS.USUARIOS, COL.USUARIOS, 'email', email, patch);
  }
  // Se desativou via atualizar, revoga dispositivos (mesmo efeito de desativar_usuario)
  if (patch.ativo === 'NAO') {
    var dispositivos = lerAba_(ABAS.DISPOSITIVOS, COL.DISPOSITIVOS);
    dispositivos.forEach(function (d) {
      if (normalizarEmail_(d.email) === email && d.ativo === 'SIM') {
        atualizarLinhaPorId_(ABAS.DISPOSITIVOS, COL.DISPOSITIVOS, 'id', d.id, { ativo: 'NAO' });
      }
    });
  }
  auditar_(auth.email, auth.usuario.unidade_id, 'ATUALIZAR_USUARIO', email, 'OK');
  return { usuario: sanitizarUsuario_(buscarUsuario_(email)) };
}

function adminDesativarUsuario_(auth, p) {
  var email = normalizarEmail_(p.email);
  if (email === auth.email) {
    throw ApiError_(ERROS.VALIDACAO, 'Você não pode desativar a si mesmo.');
  }
  if (!buscarUsuario_(email)) {
    throw ApiError_(ERROS.VALIDACAO, 'Usuário não encontrado.');
  }
  atualizarLinhaPorId_(ABAS.USUARIOS, COL.USUARIOS, 'email', email, { ativo: 'NAO' });
  // Revoga dispositivos
  var dispositivos = lerAba_(ABAS.DISPOSITIVOS, COL.DISPOSITIVOS);
  dispositivos.forEach(function (d) {
    if (normalizarEmail_(d.email) === email && d.ativo === 'SIM') {
      atualizarLinhaPorId_(ABAS.DISPOSITIVOS, COL.DISPOSITIVOS, 'id', d.id, { ativo: 'NAO' });
    }
  });
  auditar_(auth.email, auth.usuario.unidade_id, 'DESATIVAR_USUARIO', email, 'OK');
  return { email: email, ativo: 'NAO' };
}

function adminRevogarDispositivo_(auth, p) {
  var id = String(p.dispositivo_id || '').trim();
  if (!id) {
    throw ApiError_(ERROS.VALIDACAO, 'Informe dispositivo_id.');
  }
  var ok = atualizarLinhaPorId_(ABAS.DISPOSITIVOS, COL.DISPOSITIVOS, 'id', id, { ativo: 'NAO' });
  if (!ok) {
    throw ApiError_(ERROS.VALIDACAO, 'Dispositivo não encontrado.');
  }
  auditar_(auth.email, auth.usuario.unidade_id, 'REVOGAR_DISPOSITIVO', id, 'OK');
  return { dispositivo_id: id, ativo: 'NAO' };
}

function adminEmitirCodigo_(auth, p) {
  var email = normalizarEmail_(p.email);
  var out = emitirCodigoAtivacao_(email);
  auditar_(auth.email, auth.usuario.unidade_id, 'EMITIR_CODIGO', email, 'OK');
  return out;
}

function adminRedefinirPin_(auth, p) {
  var email = normalizarEmail_(p.email);
  if (!buscarUsuario_(email)) {
    throw ApiError_(ERROS.VALIDACAO, 'Usuário não encontrado.');
  }
  limparPin_(email);
  auditar_(auth.email, auth.usuario.unidade_id, 'REDEFINIR_PIN', email, 'OK');
  return { email: email, mensagem: 'PIN removido. O usuário deve definir um novo na próxima ativação ou via definir_pin.' };
}

function acaoAuditoria_(req) {
  var auth = autenticar_(req, [PERFIS.ADMIN]);
  var p = req.payload || {};
  var rows = lerAba_(ABAS.AUDITORIA, COL.AUDITORIA);
  if (p.email) {
    var e = normalizarEmail_(p.email);
    rows = rows.filter(function (r) { return normalizarEmail_(r.email) === e; });
  }
  if (p.acao) {
    rows = rows.filter(function (r) { return r.acao === p.acao; });
  }
  if (p.desde) {
    rows = rows.filter(function (r) { return r.timestamp >= p.desde; });
  }
  // mais recentes primeiro
  rows.sort(function (a, b) {
    return a.timestamp < b.timestamp ? 1 : -1;
  });
  var limite = Math.min(Number(p.limite) || 200, 1000);
  return { eventos: rows.slice(0, limite) };
}
