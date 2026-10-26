/**
 * Testes manuais no editor (sem publicar o Web App).
 * Selecione a função e clique em Executar.
 */

function testeSaudeLocal() {
  Logger.log(doGet().getContent());
}

function testeListarAbas() {
  var ss = ss_();
  Logger.log(ss.getSheets().map(function (s) { return s.getName(); }).join(', '));
}

function testeCalcularSaldoDemo() {
  var mat = '000001';
  Logger.log(JSON.stringify(calcularSaldoMatricula_(mat), null, 2));
}

/**
 * Simula um doPost localmente (útil antes de publicar).
 * Ajuste email/senha/payload conforme seu ambiente de teste.
 */
function testePostLoginFake() {
  var fake = {
    postData: {
      contents: JSON.stringify({
        v: 1,
        acao: 'login',
        email: SETUP_ADMIN.email,
        app: '1.0.0',
        payload: {
          senha: 'TroqueEstaSenha1!',
          nome_maquina: 'PC-TESTE'
        }
      })
    }
  };
  Logger.log(doPost(fake).getContent());
}
