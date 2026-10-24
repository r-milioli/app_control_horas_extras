/**
 * Configuração inicial — executar UMA VEZ no editor do Apps Script
 * (conta dona da planilha).
 *
 * Ordem sugerida:
 * 1) configurarProjeto()
 * 2) criarPrimeiroAdmin()  — edite EMAIL/NOME/MATRICULA abaixo antes
 * 3) agendarBackupDiario()
 * 4) Publicar como Web App
 */

/** >>> EDITE ANTES DE RODAR criarPrimeiroAdmin() <<< */
var SETUP_ADMIN = {
  email: 'admin.central@exemplo.com',
  nome: 'Administrador Central',
  matricula: '000001',
  unidade_id: 'CENTRAL',
  unidade_nome: 'Setor Central'
};

/**
 * Cria abas, cabeçalhos, config padrão e segredo HMAC.
 * Pode ser rodada de novo com segurança (não apaga dados).
 */
function configurarProjeto() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Abra este script a partir da planilha (Extensões → Apps Script).');
  }

  PropertiesService.getScriptProperties().setProperty(CFG.PROP_SPREADSHEET_ID, ss.getId());

  var secret = PropertiesService.getScriptProperties().getProperty(CFG.PROP_HMAC);
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty(CFG.PROP_HMAC, secret);
  }

  criarAbaSeNecessario_(ABAS.LANCAMENTOS, COL.LANCAMENTOS);
  criarAbaSeNecessario_(ABAS.USUARIOS, COL.USUARIOS);
  criarAbaSeNecessario_(ABAS.DISPOSITIVOS, COL.DISPOSITIVOS);
  criarAbaSeNecessario_(ABAS.ATIVACOES, COL.ATIVACOES);
  criarAbaSeNecessario_(ABAS.UNIDADES, COL.UNIDADES);
  criarAbaSeNecessario_(ABAS.AUDITORIA, COL.AUDITORIA);
  criarAbaSeNecessario_(ABAS.CONFIG, COL.CONFIG);

  // Remove aba padrão "Página1" / "Sheet1" se estiver vazia
  try {
    ['Página1', 'Sheet1', 'Hoja 1'].forEach(function (n) {
      var sh = ss.getSheetByName(n);
      if (sh && ss.getSheets().length > 1 && sh.getLastRow() <= 1) {
        ss.deleteSheet(sh);
      }
    });
  } catch (ignore) {}

  if (!getConfig_('versao_minima', '')) {
    setConfig_('versao_minima', '1.0.0');
  }
  if (!getConfig_('dias_alerta_pendencia', '')) {
    setConfig_('dias_alerta_pendencia', '7');
  }

  garantirTextoNasAbas_();
  Logger.log('Projeto configurado. HMAC_SECRET e abas prontos.');
  return 'OK — projeto configurado.';
}

function criarAbaSeNecessario_(nome, colunas) {
  var ss = ss_();
  var sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(colunas);
  } else {
    // Garante cabeçalho
    var header = sh.getRange(1, 1, 1, colunas.length).getDisplayValues()[0];
    var vazio = header.every(function (c) { return !c; });
    if (vazio) {
      sh.getRange(1, 1, 1, colunas.length).setValues([colunas]);
    }
  }
  sh.getRange(1, 1, 1, colunas.length)
    .setFontWeight('bold')
    .setBackground('#092b55')
    .setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange(1, 1, Math.max(sh.getMaxRows(), 1), colunas.length).setNumberFormat('@');
}

/**
 * Cria unidade CENTRAL + primeiro admin + código de ativação.
 * O código aparece no Logger (Ctrl+Enter → Ver logs) — anote-o.
 */
function criarPrimeiroAdmin() {
  configurarProjeto();

  var email = normalizarEmail_(SETUP_ADMIN.email);
  if (!email || email.indexOf('exemplo.com') >= 0) {
    throw new Error('Edite SETUP_ADMIN.email em Setup.gs antes de rodar.');
  }

  var unidade = encontrarLinha_(ABAS.UNIDADES, COL.UNIDADES, function (u) {
    return u.id === SETUP_ADMIN.unidade_id;
  });
  if (!unidade) {
    appendLinha_(ABAS.UNIDADES, COL.UNIDADES, {
      id: SETUP_ADMIN.unidade_id,
      nome: SETUP_ADMIN.unidade_nome,
      comandante_email: email,
      ativa: 'SIM'
    });
  }

  if (!buscarUsuario_(email)) {
    appendLinha_(ABAS.USUARIOS, COL.USUARIOS, {
      email: email,
      nome: SETUP_ADMIN.nome,
      matricula: SETUP_ADMIN.matricula,
      unidade_id: SETUP_ADMIN.unidade_id,
      perfis: PERFIS.ADMIN + ',' + PERFIS.POLICIAL,
      ativo: 'SIM',
      pin_hash: '',
      criado_em: agoraIso_(),
      ultimo_acesso: ''
    });
  }

  var codigo = emitirCodigoAtivacao_(email);
  Logger.log('=== PRIMEIRO ADMIN ===');
  Logger.log('E-mail: ' + email);
  Logger.log('Código de ativação (válido 72h): ' + codigo.codigo);
  Logger.log('Expira em: ' + codigo.expira_em);
  Logger.log('Guarde este código. Ele NÃO fica legível na planilha.');
  return 'Admin criado. Veja o código no log de execução.';
}

/**
 * Recuperação: gera novo código para um e-mail já cadastrado.
 * Uso: altere o e-mail abaixo e execute no editor.
 */
function gerarCodigoManual() {
  var email = 'admin.central@exemplo.com'; // <<< edite
  if (email.indexOf('exemplo.com') >= 0) {
    throw new Error('Edite o e-mail em gerarCodigoManual() antes de rodar.');
  }
  var out = emitirCodigoAtivacao_(email);
  Logger.log('Código para ' + email + ': ' + out.codigo + ' (expira ' + out.expira_em + ')');
  return out.codigo;
}

/**
 * Cadastro rápido de usuário pelo editor (enquanto o painel Admin do app não existe).
 * 1) Edite os campos abaixo
 * 2) Execute cadastrarUsuarioManual()
 * 3) Copie o código do log e entregue ao usuário
 *
 * perfis: "POLICIAL" | "COMANDANTE" | "ADMIN" | "COMANDANTE,POLICIAL" etc.
 * unidade_id: deve existir na aba Unidades (ex.: CENTRAL)
 */
function cadastrarUsuarioManual() {
  var email = 'policial@exemplo.com'; // <<< edite
  var nome = 'Nome do Policial';
  var matricula = '123456';
  var unidadeId = 'CENTRAL';
  var perfis = 'POLICIAL'; // sem PIN; use COMANDANTE ou ADMIN se for aprovar

  email = normalizarEmail_(email);
  if (!email || email.indexOf('exemplo.com') >= 0) {
    throw new Error('Edite o e-mail em cadastrarUsuarioManual() antes de rodar.');
  }
  if (buscarUsuario_(email)) {
    throw new Error('E-mail já cadastrado. Use gerarCodigoManual() para novo código.');
  }
  var unidade = encontrarLinha_(ABAS.UNIDADES, COL.UNIDADES, function (u) {
    return u.id === unidadeId;
  });
  if (!unidade) {
    throw new Error('Unidade não encontrada: ' + unidadeId + '. Crie na aba Unidades.');
  }

  appendLinha_(ABAS.USUARIOS, COL.USUARIOS, {
    email: email,
    nome: String(nome).trim(),
    matricula: String(matricula).trim(),
    unidade_id: unidadeId,
    perfis: String(perfis).trim().toUpperCase(),
    ativo: 'SIM',
    pin_hash: '',
    criado_em: agoraIso_(),
    ultimo_acesso: ''
  });

  var out = emitirCodigoAtivacao_(email);
  Logger.log('=== USUÁRIO CADASTRADO ===');
  Logger.log('E-mail: ' + email);
  Logger.log('Perfis: ' + perfis);
  Logger.log('Código de ativação (72h, uso único): ' + out.codigo);
  Logger.log('Expira: ' + out.expira_em);
  return out.codigo;
}
