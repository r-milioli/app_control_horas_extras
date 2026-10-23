/**
 * Constantes e esquema das abas da planilha.
 * Controle de Horas Extras — Backend Apps Script (PRD v1.1 + decisões do manual)
 */

var CFG = {
  APP_NAME: 'ControleHorasExtras',
  API_VERSION: 1,
  VERSAO_APP_PADRAO: '1.0.0',
  MIN_MINUTOS: 30,
  MAX_MINUTOS: 1440,
  MOTIVO_MIN: 5,
  MOTIVO_MAX: 500,
  PIN_TAMANHO: 6,
  CODIGO_ATIVACAO_HORAS: 72,
  LOCK_TIMEOUT_MS: 30000,
  RATE_LIMIT_MAX: 5,
  RATE_LIMIT_JANELA_SEG: 900,
  SYNC_LOTE_MAX: 50,
  BACKUP_PASTA_NOME: 'HorasExtras-Backups',
  BACKUP_RETENCAO_DIAS: 30,
  PROP_HMAC: 'HMAC_SECRET',
  PROP_SPREADSHEET_ID: 'SPREADSHEET_ID'
};

var ABAS = {
  LANCAMENTOS: 'Lancamentos',
  USUARIOS: 'Usuarios',
  DISPOSITIVOS: 'Dispositivos',
  ATIVACOES: 'Ativacoes',
  UNIDADES: 'Unidades',
  AUDITORIA: 'Auditoria',
  CONFIG: 'Config'
};

var COL = {
  LANCAMENTOS: [
    'id', 'tipo', 'ref_id', 'matricula', 'nome', 'unidade_id', 'data', 'minutos',
    'motivo', 'criado_por', 'criado_em', 'recebido_em', 'atualizado_em',
    'status', 'decidido_por', 'decidido_em', 'motivo_rejeicao'
  ],
  USUARIOS: [
    'email', 'nome', 'matricula', 'unidade_id', 'perfis', 'ativo',
    'pin_hash', 'criado_em', 'ultimo_acesso'
  ],
  DISPOSITIVOS: [
    'id', 'email', 'token_hash', 'nome_maquina', 'ativo', 'criado_em', 'ultimo_sync'
  ],
  ATIVACOES: [
    'email', 'codigo_hash', 'expira_em', 'usado_em'
  ],
  UNIDADES: [
    'id', 'nome', 'comandante_email', 'ativa'
  ],
  AUDITORIA: [
    'timestamp', 'email', 'unidade_id', 'acao', 'objeto_id', 'resultado'
  ],
  CONFIG: [
    'chave', 'valor'
  ]
};

var TIPOS = {
  HORA_EXTRA: 'HORA_EXTRA',
  COMPENSACAO: 'COMPENSACAO',
  ESTORNO: 'ESTORNO'
};

var STATUS = {
  AGUARDANDO: 'AGUARDANDO_APROVACAO',
  APROVADO: 'APROVADO',
  REJEITADO: 'REJEITADO',
  CANCELADO: 'CANCELADO'
};

var PERFIS = {
  POLICIAL: 'POLICIAL',
  COMANDANTE: 'COMANDANTE',
  ADMIN: 'ADMIN'
};

var ERROS = {
  NAO_AUTORIZADO: 'NAO_AUTORIZADO',
  USUARIO_INATIVO: 'USUARIO_INATIVO',
  CODIGO_INVALIDO: 'CODIGO_INVALIDO',
  PIN_INVALIDO: 'PIN_INVALIDO',
  VALIDACAO: 'VALIDACAO',
  VERSAO_ANTIGA: 'VERSAO_ANTIGA',
  BLOQUEADO: 'BLOQUEADO',
  OCUPADO: 'OCUPADO',
  ACAO_INVALIDA: 'ACAO_INVALIDA',
  ERRO_INTERNO: 'ERRO_INTERNO'
};
