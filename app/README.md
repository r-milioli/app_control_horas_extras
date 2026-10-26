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

## Sair / trocar de usuário

No app: botão **Sair** (barra lateral). Apaga o token local e os dados da sessão neste PC.
Qualquer usuário cadastrado pode entrar de novo com **e-mail + senha** (sem código).

## Criar usuários e unidades (painel Admin)

Com perfil **ADMIN** no app (online):

1. Menu → **Administração → Usuários e unidades**
2. **Nova unidade** (se precisar)
3. **Cadastrar usuário** (Policial / Comandante / Admin)
4. Guarde a **senha inicial** exibida e entregue ao usuário

Esqueceu a senha: botão **Nova senha** na lista (gera outra senha forte).

### Login e senha

| | Login (e-mail + senha) | Senha na aprovação |
|---|---|---|
| Para quê | Entrar no app neste computador | Confirmar aprovar/rejeitar (Comandante/Admin) |
| Quem usa | Todos os perfis | COMANDANTE / ADMIN |
| Por máquina? | Não — desloga e outro usuário pode logar | Não — é da conta |

## Como testar o corte vertical (policial)

### 1. Criar usuário

Com um admin autenticado (`admin_usuarios` / `criar_usuario`):

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

A resposta traz `senha_inicial` **uma única vez**. Entregue ao policial.
(ajuste `unidade_id` para uma unidade existente na aba `Unidades`.)

### 2. Login no app

1. Abra o app (`npm run dev`).
2. Informe e-mail + senha.
3. Feche e reabra: deve ir direto à Home (token no cofre do Windows).

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

### Login devolve HTML / pede login Google / “ppConfig”

Isso **não** é falha do e-mail/senha. O Google está servindo página de login porque o Web App não aceita acesso anônimo.

1. Apps Script → **Implantar → Gerenciar implantações** → ícone de lápis na implantação ativa.
2. **Executar como:** `Eu`
3. **Quem pode acessar:** `Qualquer pessoa`  
   (se estiver `Qualquer pessoa com Conta do Google`, o app Electron recebe HTML e falha.)
4. Em **Versão**, escolha **Nova versão** → Implantar.
5. Teste a URL `/exec` em **janela anônima**: deve aparecer JSON `{"ok":true,...}` **sem** pedir login.
6. Reinicie o app (`npm run dev`) e faça login de novo.

A senha só é validada **depois** que o POST chega no `doPost` em JSON.

## Escopo desta fase

Inclui: login (e-mail + senha), lançamentos offline, sync, saldo em cache, cancelar, indicadores online/fila, painel admin (usuários/unidades).

Ainda não inclui: tela completa de aprovações no app, relatórios, instalador NSIS.
