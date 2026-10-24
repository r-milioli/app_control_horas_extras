# Como inserir o script na planilha do Google

Guia passo a passo (Fases 0 e 1 do PRD). Tempo estimado: 30–45 minutos.

## Pré-requisitos

- Conta Google **nova e exclusiva** do sistema (não use conta pessoal)
- Verificação em duas etapas ativa + e-mail/telefone de recuperação **institucionais**
- Autorização interna para guardar dados no Google (já prevista no PRD)

---

## 1. Criar a planilha

1. Acesse [sheets.google.com](https://sheets.google.com) logado na conta dona.
2. **Planilha em branco**.
3. Nome sugerido: `Horas Extras — DADOS (NÃO COMPARTILHAR)`.
4. **Não compartilhe** com ninguém. Admins usam o painel do app, não a planilha.

O modelo das abas está em `planilha-modelo/`. Você **não precisa** criar as abas à mão se for rodar `configurarProjeto()`.

---

## 2. Abrir o Apps Script

1. Na planilha: **Extensões → Apps Script**.
2. Renomeie o projeto para `HorasExtras-Backend`.
3. Engrenagem **Configurações do projeto**:
   - Fuso: `(GMT-03:00) América/São Paulo`
   - Marque **Mostrar arquivo de manifesto appsscript.json**
4. Abra `appsscript.json` e confira se está igual ao arquivo em `apps-script/appsscript.json`.

---

## 3. Criar os arquivos de código

Na lateral **Arquivos**, para cada item abaixo:

1. Clique em **+ → Script**
2. Nome **sem** `.gs` (ex.: `Config`)
3. Apague o conteúdo padrão e cole o conteúdo do arquivo correspondente em `apps-script/`

| Nome no editor | Arquivo no repositório |
|---|---|
| `Config` | `apps-script/Config.gs` |
| `Util` | `apps-script/Util.gs` |
| `Api` | `apps-script/Api.gs` |
| `Auth` | `apps-script/Auth.gs` |
| `Ativacao` | `apps-script/Ativacao.gs` |
| `Lancamentos` | `apps-script/Lancamentos.gs` |
| `Aprovacao` | `apps-script/Aprovacao.gs` |
| `Admin` | `apps-script/Admin.gs` |
| `Backup` | `apps-script/Backup.gs` |
| `Setup` | `apps-script/Setup.gs` |
| `Testes` | `apps-script/Testes.gs` |

O arquivo `Código.gs` que já existe: **renomeie** para `Api` e cole o conteúdo de `Api.gs` (ou apague-o e crie `Api` novo).

Salve tudo (`Ctrl+S`).

---

## 4. Configurar o projeto (primeira execução)

1. Abra `Setup.gs`.
2. Em `SETUP_ADMIN`, edite **email**, **nome** e **matricícula** do primeiro admin real.
3. No seletor de funções (topo), escolha **`configurarProjeto`** → **Executar**.
4. Autorize a conta quando o Google pedir (revise as permissões: planilha + Drive para backup).
5. Escolha **`criarPrimeiroAdmin`** → **Executar**.
6. Menu **Execuções** (ou *Ver → Logs*): anote o **código de ativação de 6 dígitos**. Ele vale **72 horas** e não fica legível na planilha.

Opcional: execute **`agendarBackupDiario`** (em `Backup.gs`) para cópia diária às ~02:00.

---

## 5. Publicar como Web App

1. **Implantar → Nova implantação**.
2. Tipo: **App da Web**.
3. Descrição: `Horas Extras API v1`.
4. **Executar como:** `Eu` (conta dona).
5. **Quem pode acessar:** `Qualquer pessoa` (o controle real é e-mail + token + perfil).
6. **Implantar**.
7. Copie a **URL** (`https://script.google.com/macros/s/.../exec`) e guarde em local seguro. O app desktop usará essa URL.

> Sempre que alterar o código, faça **Implantar → Gerenciar implantações → editar → Nova versão**. Só “Salvar” no editor **não** atualiza a URL em produção.

---

## 6. Teste rápido

### Saúde (GET)

Abra a URL no navegador. Deve retornar JSON com `"ok": true`.

### Ativação (POST) — exemplo com curl

```bash
curl -L -X POST "COLE_A_URL_AQUI" ^
  -H "Content-Type: application/json" ^
  -d "{\"v\":1,\"acao\":\"ativar\",\"email\":\"SEU_ADMIN@email\",\"app\":\"1.0.0\",\"payload\":{\"codigo\":\"123456\",\"nome_maquina\":\"PC-TESTE\",\"pin\":\"123456\"}}"
```

- Se o perfil for ADMIN/COMANDANTE e ainda não houver PIN, a primeira resposta pode ser `etapa: "DEFINIR_PIN"`. Envie de novo com `pin` de 6 dígitos.
- Guarde o `token` devolvido — as próximas chamadas usam `email` + `token`.

### Sync (POST)

```bash
curl -L -X POST "COLE_A_URL_AQUI" ^
  -H "Content-Type: application/json" ^
  -d "{\"v\":1,\"acao\":\"sync\",\"email\":\"SEU_ADMIN@email\",\"token\":\"TOKEN\",\"app\":\"1.0.0\",\"payload\":{\"lancamentos\":[],\"cursor\":\"\"}}"
```

O Web App responde `302` para `script.googleusercontent.com/macros/echo?...`.
O corpo do POST é processado no `/exec`; o JSON do resultado deve ser lido com **GET** nesse URL de echo
(POST no echo devolve 405/HTML). O app desktop já faz esse fluxo.

---

## 7. Segurança operacional

- Planilha **sem compartilhamento**
- URL do Web App não é segredo suficiente — combine com tokens
- Pelo menos **dois admins** sabem recuperar a conta Google
- Códigos de backup do 2FA em envelope institucional
- Pasta `HorasExtras-Backups` no Drive da conta dona

---

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `HMAC_SECRET não configurado` | Rode `configurarProjeto()` |
| Código inválido na ativação | Código expirado ou já usado → `gerarCodigoManual()` ou `admin_usuarios` / `emitir_codigo` |
| Resposta HTML / `ppConfig` / pedido de login | “Quem pode acessar” está como *Qualquer pessoa com Conta do Google*. Mude para **Qualquer pessoa**, gere **Nova versão** da implantação e teste a URL em janela anônima (deve sair JSON sem login). |
| Resposta HTML em vez de JSON (outros casos) | Cliente precisa seguir redirect **mantendo POST** (o app desktop já faz isso). |
| Alterou o código e nada mudou | Publique **nova versão** da implantação |
| `OCUPADO` | Outra sync em andamento; tente de novo |

Documentação completa da API: ver seção no `README.md` na raiz do repositório.
