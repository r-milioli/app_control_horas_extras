/**
 * Backup diário da planilha no Drive e rotação (30 dias).
 */

function agendarBackupDiario() {
  // Remove triggers antigos deste handler
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'executarBackupDiario') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('executarBackupDiario')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  return 'Backup diário agendado para ~02:00.';
}

function executarBackupDiario() {
  var ss = ss_();
  var pasta = obterPastaBackup_();
  var nome = 'backup-' + hojeIso_() + '-' + ss.getName();
  var copia = ss.copy(nome);
  // Move para pasta de backup
  DriveApp.getFileById(copia.getId()).moveTo(pasta);
  rotacionarBackups_(pasta);
  auditar_('sistema', '', 'BACKUP_DIARIO', copia.getId(), 'OK');
}

function obterPastaBackup_() {
  var pastas = DriveApp.getFoldersByName(CFG.BACKUP_PASTA_NOME);
  if (pastas.hasNext()) {
    return pastas.next();
  }
  return DriveApp.createFolder(CFG.BACKUP_PASTA_NOME);
}

function rotacionarBackups_(pasta) {
  var limite = Date.now() - CFG.BACKUP_RETENCAO_DIAS * 86400000;
  var arquivos = pasta.getFiles();
  while (arquivos.hasNext()) {
    var f = arquivos.next();
    if (f.getDateCreated().getTime() < limite) {
      f.setTrashed(true);
    }
  }
}
