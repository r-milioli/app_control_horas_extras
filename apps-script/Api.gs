/**
 * Porta de entrada HTTP: doGet (saúde) e doPost (roteador de ações).
 */

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      dados: {
        servico: CFG.APP_NAME,
        versao_api: CFG.API_VERSION,
        hora: agoraIso_()
      }
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var req = parseRequest_(e);
    return withLock_(function () {
      return roteador_(req);
    });
  } catch (err) {
    if (err && err.isApiError) {
      return respostaErro_(err.codigo, err.message);
    }
    console.error(err);
    return respostaErro_(ERROS.ERRO_INTERNO, 'Erro interno. Tente novamente.');
  }
}

function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw ApiError_(ERROS.VALIDACAO, 'Corpo da requisição ausente.');
  }
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (parseErr) {
    throw ApiError_(ERROS.VALIDACAO, 'JSON inválido.');
  }
  if (Number(body.v) !== CFG.API_VERSION) {
    throw ApiError_(ERROS.VALIDACAO, 'Versão de protocolo não suportada. Use v=' + CFG.API_VERSION);
  }
  if (!body.acao) {
    throw ApiError_(ERROS.ACAO_INVALIDA, 'Campo acao é obrigatório.');
  }
  body.email = normalizarEmail_(body.email);
  body.payload = body.payload || {};
  body.app = body.app || CFG.VERSAO_APP_PADRAO;
  return body;
}

function roteador_(req) {
  switch (String(req.acao)) {
    case 'ativar':
      return respostaOk_(acaoAtivar_(req));
    case 'definir_pin':
      return respostaOk_(acaoDefinirPin_(req));
    case 'sync':
      return respostaOk_(acaoSync_(req));
    case 'cancelar':
      return respostaOk_(acaoCancelar_(req));
    case 'pendencias':
      return respostaOk_(acaoPendencias_(req));
    case 'decidir':
      return respostaOk_(acaoDecidir_(req));
    case 'saldo':
      return respostaOk_(acaoSaldo_(req));
    case 'relatorio':
      return respostaOk_(acaoRelatorio_(req));
    case 'estornar':
      return respostaOk_(acaoEstornar_(req));
    case 'admin_usuarios':
      return respostaOk_(acaoAdminUsuarios_(req));
    case 'auditoria':
      return respostaOk_(acaoAuditoria_(req));
    default:
      throw ApiError_(ERROS.ACAO_INVALIDA, 'Ação desconhecida: ' + req.acao);
  }
}
