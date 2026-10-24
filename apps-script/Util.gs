/**
 * Funções de apoio: planilha, hash, datas, trava, bloqueio, respostas.
 */

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty(CFG.PROP_SPREADSHEET_ID);
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(nome) {
  var sh = ss_().getSheetByName(nome);
  if (!sh) {
    throw new Error('Aba não encontrada: ' + nome);
  }
  return sh;
}

function agoraIso_() {
  return new Date().toISOString();
}

function hojeIso_() {
  var d = new Date();
  var y = d.getFullYear();
  var m = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  return y + '-' + m + '-' + day;
}

function uuid_() {
  return Utilities.getUuid();
}

function getHmacSecret_() {
  var secret = PropertiesService.getScriptProperties().getProperty(CFG.PROP_HMAC);
  if (!secret) {
    throw new Error('HMAC_SECRET não configurado. Execute configurarProjeto().');
  }
  return secret;
}

function hmac_(texto) {
  var raw = Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_SHA_256,
    String(texto),
    getHmacSecret_()
  );
  return bytesToHex_(raw);
}

function bytesToHex_(bytes) {
  return bytes.map(function (b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('');
}

function gerarCodigoAtivacao_() {
  var n = Math.floor(Math.random() * 1000000);
  return ('000000' + n).slice(-6);
}

function gerarTokenDispositivo_() {
  return Utilities.base64EncodeWebSafe(Utilities.getUuid() + ':' + uuid_() + ':' + Date.now());
}

function respostaOk_(dados) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, dados: dados || {} }))
    .setMimeType(ContentService.MimeType.JSON);
}

function respostaErro_(codigo, mensagem, extras) {
  var body = { ok: false, codigo: codigo, mensagem: mensagem || codigo };
  if (extras) {
    Object.keys(extras).forEach(function (k) {
      body[k] = extras[k];
    });
  }
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function ApiError_(codigo, mensagem) {
  var e = new Error(mensagem || codigo);
  e.codigo = codigo;
  e.isApiError = true;
  return e;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  var ok = lock.tryLock(CFG.LOCK_TIMEOUT_MS);
  if (!ok) {
    throw ApiError_(ERROS.OCUPADO, 'Servidor ocupado. Tente novamente em instantes.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function rateKey_(email) {
  return 'rl:' + String(email || '').toLowerCase().trim();
}

function verificarBloqueio_(email) {
  var cache = CacheService.getScriptCache();
  var v = cache.get(rateKey_(email));
  if (v && Number(v) >= CFG.RATE_LIMIT_MAX) {
    throw ApiError_(ERROS.BLOQUEADO, 'Muitas tentativas inválidas. Aguarde 15 minutos.');
  }
}

function registrarFalhaAuth_(email) {
  var cache = CacheService.getScriptCache();
  var key = rateKey_(email);
  var atual = Number(cache.get(key) || '0') + 1;
  cache.put(key, String(atual), CFG.RATE_LIMIT_JANELA_SEG);
}

function limparFalhasAuth_(email) {
  CacheService.getScriptCache().remove(rateKey_(email));
}

/**
 * getRange(row, column, numRows, numColumns) — o 3º/4º args são QUANTIDADES,
 * não índices finais. Usar lastRow-1 como numRows a partir da linha 2.
 */
/** Lê todas as linhas de uma aba como objetos {col: valor}. */
function lerAba_(nomeAba, colunas) {
  var sh = sheet_(nomeAba);
  var last = sh.getLastRow();
  if (last < 2) {
    return [];
  }
  var numRows = last - 1;
  var values = sh.getRange(2, 1, numRows, colunas.length).getDisplayValues();
  return values.map(function (row) {
    var obj = {};
    colunas.forEach(function (c, i) {
      obj[c] = row[i] == null ? '' : String(row[i]);
    });
    return obj;
  });
}

function appendLinha_(nomeAba, colunas, obj) {
  var sh = sheet_(nomeAba);
  var row = colunas.map(function (c) {
    var v = obj[c];
    if (v == null) return '';
    return typeof v === 'number' ? v : String(v);
  });
  sh.appendRow(row);
  // Força texto nas células para evitar conversão automática
  var last = sh.getLastRow();
  sh.getRange(last, 1, 1, colunas.length).setNumberFormat('@');
}

function atualizarLinhaPorId_(nomeAba, colunas, idCampo, idValor, patch) {
  var sh = sheet_(nomeAba);
  var last = sh.getLastRow();
  if (last < 2) return false;
  var idIdx = colunas.indexOf(idCampo);
  if (idIdx < 0) return false;
  var numRows = last - 1;
  var ids = sh.getRange(2, idIdx + 1, numRows, 1).getDisplayValues();
  var alvo = String(idValor);
  for (var i = 0; i < ids.length; i++) {
    // E-mails: compara normalizado; demais campos: igualdade direta
    var cell = String(ids[i][0]);
    var match = idCampo === 'email'
      ? normalizarEmail_(cell) === normalizarEmail_(alvo)
      : cell === alvo;
    if (match) {
      var rowNum = i + 2;
      // 1 linha x N colunas (não usar rowNum como numRows!)
      var range = sh.getRange(rowNum, 1, 1, colunas.length);
      var vals = range.getDisplayValues()[0];
      colunas.forEach(function (c, j) {
        if (Object.prototype.hasOwnProperty.call(patch, c)) {
          vals[j] = patch[c] == null ? '' : String(patch[c]);
        }
      });
      range.setValues([vals]);
      range.setNumberFormat('@');
      return true;
    }
  }
  return false;
}

function encontrarLinha_(nomeAba, colunas, predicado) {
  var rows = lerAba_(nomeAba, colunas);
  for (var i = 0; i < rows.length; i++) {
    if (predicado(rows[i])) {
      return { index: i, row: rows[i], rowNum: i + 2 };
    }
  }
  return null;
}

function auditar_(email, unidadeId, acao, objetoId, resultado) {
  appendLinha_(ABAS.AUDITORIA, COL.AUDITORIA, {
    timestamp: agoraIso_(),
    email: email || '',
    unidade_id: unidadeId || '',
    acao: acao || '',
    objeto_id: objetoId || '',
    resultado: resultado || ''
  });
}

function getConfig_(chave, padrao) {
  var rows = lerAba_(ABAS.CONFIG, COL.CONFIG);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].chave === chave) {
      return rows[i].valor;
    }
  }
  return padrao;
}

function setConfig_(chave, valor) {
  var hit = encontrarLinha_(ABAS.CONFIG, COL.CONFIG, function (r) {
    return r.chave === chave;
  });
  if (hit) {
    atualizarLinhaPorId_(ABAS.CONFIG, COL.CONFIG, 'chave', chave, { valor: String(valor) });
  } else {
    appendLinha_(ABAS.CONFIG, COL.CONFIG, { chave: chave, valor: String(valor) });
  }
}

function parsePerfis_(texto) {
  return String(texto || '')
    .split(',')
    .map(function (p) { return p.trim().toUpperCase(); })
    .filter(Boolean);
}

function temPerfil_(usuario, perfil) {
  return parsePerfis_(usuario.perfis).indexOf(perfil) >= 0;
}

function normalizarEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function validarMinutos_(minutos) {
  var n = Number(minutos);
  if (!isFinite(n) || n < CFG.MIN_MINUTOS || n > CFG.MAX_MINUTOS || n % 30 !== 0) {
    throw ApiError_(ERROS.VALIDACAO, 'Duração deve ser de 30 a 1440 minutos, em intervalos de 30.');
  }
  return n;
}

function validarMotivo_(motivo) {
  var m = String(motivo || '').trim();
  if (m.length < CFG.MOTIVO_MIN || m.length > CFG.MOTIVO_MAX) {
    throw ApiError_(ERROS.VALIDACAO, 'Motivo deve ter entre 5 e 500 caracteres.');
  }
  return m;
}

function validarDataServico_(data) {
  var d = String(data || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    throw ApiError_(ERROS.VALIDACAO, 'Data inválida. Use AAAA-MM-DD.');
  }
  if (d > hojeIso_()) {
    throw ApiError_(ERROS.VALIDACAO, 'A data do serviço não pode ser futura.');
  }
  return d;
}

function formatarHoras_(minutos) {
  var n = Number(minutos) || 0;
  var neg = n < 0;
  n = Math.abs(n);
  var h = Math.floor(n / 60);
  var m = n % 60;
  var s = (h ? h + 'h' : '') + (m ? m + 'min' : (h ? '' : '0min'));
  return neg ? '-' + s : s;
}

function garantirTextoNasAbas_() {
  Object.keys(ABAS).forEach(function (k) {
    var nome = ABAS[k];
    var cols = COL[k];
    if (!cols) return;
    var sh = ss_().getSheetByName(nome);
    if (!sh) return;
    var last = Math.max(sh.getLastRow(), 1);
    sh.getRange(1, 1, last, cols.length).setNumberFormat('@');
  });
}
