# App desktop — Controle de Horas Extras

Electron + React + SQLite. Consome a API do Google Apps Script já publicada.

## Requisitos

- Windows 10+
- Node.js 20+ (recomendado)

Persistência local via **SQLite em WASM** (`sql.js`), sem compilação nativa — adequado para desktops sem Build Tools.

## Configuração

1. Copie `.env.example` para `.env` se quiser sobrescrever a URL da API:

```bash
# PowerShell
Copy-Item .env.example .env
```

2. Instale e rode em desenvolvimento:

```bash
cd app
npm install
npm run dev
```

A URL padrão já aponta para o Web App em produção. Variável: `API_URL`.

## Sair / desativar neste PC

No app: botão **Sair deste computador** (barra lateral). Apaga o token local.
Para voltar a usar neste PC, o admin precisa emitir um **novo código de ativação**.

## Criar usuários e unidades (painel Admin)

Com perfil **ADMIN** no app (online):

1. Menu → **Administração → Usuários e unidades**
2. **Nova unidade** (se precisar)
3. **Cadastrar usuário** (Policial / Comandante / Admin)
4. Guarde o **código de ativação** exibido e entregue ao usuário (72h, uso único)

Outro PC do mesmo usuário: botão **Novo código** na lista.

### PIN × código de ativação

| | Código de ativação | PIN |
|---|---|---|
| Para quê | Ligar **este computador** ao usuário | Aprovar/rejeitar (só Comandante/Admin) |
| Quem usa | Todos os perfis, 1× por dispositivo | Só COMANDANTE e ADMIN |
| Policial precisa? | Sim (código) | **Não** |
| Por máquina? | Sim — cada PC pede um código novo | **Não** — é do usuário (conta), definido 1× |

## Como testar o corte vertical (policial)

### 1. Emitir código de ativação

No Apps Script (conta dona), com um admin já autenticado, use a ação `admin_usuarios` / `emitir_codigo`, **ou** cadastre o usuário na planilha e emita o código pelo painel admin quando existir.

Exemplo de corpo `POST` (substitua e-mail/token de um **admin** já ativado):

```json
{
  "v": 1,
  "acao": "admin_usuarios",
  "email": "admin@exemplo.com",
  "token": "TOKEN_DO_ADMIN",
  "app": "1.0.0",
  "payload": {
    "op": "emitir_codigo",
    "email": "policial@exemplo.com"
  }
}
```

A resposta traz o `codigo` em texto **uma única vez**. Entregue ao policial.

Se ainda não há usuário de teste, primeiro:

```json
"payload": {
  "op": "criar_usuario",
  "email": "policial@exemplo.com",
  "nome": "Policial Teste",
  "matricula": "999999",
  "unidade_id": "U1",
  "perfis": "POLICIAL"
}
```

(ajuste `unidade_id` para uma unidade existente na aba `Unidades`.)

### 2. Ativar no app

1. Abra o app (`npm run dev`).
2. Informe e-mail + código.
3. Se for comandante/admin sem PIN, o app pede PIN de 6 dígitos.
4. Feche e reabra: deve ir direto à Home (token no cofre do Windows).

### 3. Lançar offline e sincronizar

1. Desconecte a rede (ou ignore o indicador) e crie um lançamento → **Finalizar para envio**.
2. Status local: `Pendente de envio`.
3. Reconecte e clique em **Sincronizar**.
4. Confira a aba `Lancamentos` na planilha: deve aparecer com `AGUARDANDO_APROVACAO`.
5. Sincronize de novo: não deve duplicar (mesmo UUID).

### 4. Cancelar / rejeição

- Enquanto `AGUARDANDO_APROVACAO`, o autor pode **Cancelar** (precisa de internet).
- Se um comandante rejeitar, o próximo sync mostra o motivo na lista.

## Scripts

| Comando | Função |
|---|---|
| `npm run dev` | Desenvolvimento com hot reload |
| `npm run build` | Build de produção em `out/` |
| `npm run preview` | Preview do build |

## Dados locais

- SQLite: `%APPDATA%/controle-horas-extras/horas-extras.sqlite` (nome do app Electron)
- Token: cofre do Windows via `safeStorage` em `userData/secure/`

## Problemas comuns

### Ativação devolve HTML / pede login / “ppConfig”

Isso **não** é falha do e-mail/código. O Google está servindo página de login porque o Web App não aceita acesso anônimo.

1. Apps Script → **Implantar → Gerenciar implantações** → ícone de lápis na implantação ativa.
2. **Executar como:** `Eu`
3. **Quem pode acessar:** `Qualquer pessoa`  
   (se estiver `Qualquer pessoa com Conta do Google`, o app Electron recebe HTML e falha.)
4. Em **Versão**, escolha **Nova versão** → Implantar.
5. Teste a URL `/exec` em **janela anônima**: deve aparecer JSON `{"ok":true,...}` **sem** pedir login.
6. Reinicie o app (`npm run dev`) e ative de novo.

O código de ativação (`344619` etc.) só é validado **depois** que o POST chega no `doPost` em JSON.

## Escopo desta fase

Inclui: ativação, lançamentos offline, sync, saldo em cache, cancelar, indicadores online/fila.

Ainda não inclui: telas de comandante/admin, relatórios, instalador NSIS.
