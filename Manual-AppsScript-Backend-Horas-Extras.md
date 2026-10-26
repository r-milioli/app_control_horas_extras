# Manual de Implementação — Backend em Google Apps Script

**Sistema de Controle de Horas Extras** · baseado no PRD v1.1 · Manual v1.0 · 23/10/2026

Este manual leva você, passo a passo, da conta Google vazia até um backend funcionando e testado (Fases 0 e 1 do PRD). Ele foi escrito para quem **nunca mexeu com Apps Script**: cada passo diz onde clicar, o que colar e o que você deve ver.

---

## Sumário

1. [O que você vai construir](#1-o-que-você-vai-construir)
2. [Conceitos em 10 minutos](#2-conceitos-em-10-minutos)
3. [Decisões deste manual para as lacunas do PRD](#3-decisões-deste-manual-para-as-lacunas-do-prd)
4. [Fase 0 — Preparar conta, planilha e projeto](#4-fase-0--preparar-conta-planilha-e-projeto)
5. [Estrutura dos arquivos do projeto](#5-estrutura-dos-arquivos-do-projeto)
6. [O código, arquivo por arquivo](#6-o-código-arquivo-por-arquivo)
7. [Primeira execução: configurar e criar o primeiro admin](#7-primeira-execução-configurar-e-criar-o-primeiro-admin)
8. [Publicar como Web App](#8-publicar-como-web-app)
9. [Testes com curl](#9-testes-com-curl)
10. [Referência da API (para quem vai programar o app)](#10-referência-da-api-para-quem-vai-programar-o-app)
11. [Operação e manutenção](#11-operação-e-manutenção)
12. [Problemas comuns](#12-problemas-comuns)
13. [Limites, cotas e segurança](#13-limites-cotas-e-segurança)
14. [Checklist de aceite da Fase 1](#14-checklist-de-aceite-da-fase-1)
15. [Material para estudar](#15-material-para-estudar)

---

## 1. O que você vai construir

```
[App desktop]  ──HTTPS/JSON──▶  [Web App (Apps Script)]  ──▶  [Planilha protegida]
 SQLite local                    valida, trava, grava          só o script escreve
```

O backend é um script que:

- recebe um JSON por HTTPS (`doPost`);
- confere **e-mail + token do dispositivo + perfil** em cada chamada;
- grava e lê numa planilha que **só a conta dona** acessa;
- usa trava (`LockService`) para que várias unidades sincronizando juntas não corrompam os dados;
- registra tudo numa aba de auditoria e faz backup diário.

Quando terminar este manual você terá as 11 ações da API funcionando: `login`, `perfil`, `sync`, `cancelar`, `pendencias`, `decidir`, `saldo`, `relatorio`, `estornar`, `admin_usuarios` e `auditoria`.

> O app desktop (Electron) é a Fase 2 em diante e **não** faz parte deste manual. A seção 10 traz tudo que o desenvolvedor do app precisa saber sobre a API.

---

## 2. Conceitos em 10 minutos

| Conceito | O que é | Por que importa aqui |
|---|---|---|
| **Apps Script** | Ambiente do Google onde você escreve JavaScript que roda nos servidores deles, de graça | É o nosso "servidor" |
| **Script vinculado** | Script criado de dentro de uma planilha (menu *Extensões → Apps Script*) | Enxerga a planilha direto, sem configurar IDs |
| **Web App** | Script publicado com um endereço `https://script.google.com/macros/s/.../exec` | O app desktop chama esse endereço |
| **`doPost(e)` / `doGet(e)`** | Funções especiais que o Google chama quando chega um POST / GET no endereço | `doPost` é a porta de entrada; `doGet` é só um teste de saúde |
| **Executar como "Eu"** | O script roda com a identidade da conta dona, não de quem chama | Por isso o policial **não faz login em nada** |
| **"Quem pode acessar: Qualquer pessoa"** | O endereço aceita chamadas sem login Google | O controle de acesso real é nosso (e-mail + token + perfil) |
| **`PropertiesService`** | Cofre de pares chave/valor do script | Guarda o segredo usado nos hashes |
| **`LockService`** | Trava global | Só uma escrita por vez, evita corrupção |
| **`CacheService`** | Memória temporária (até 6 h) | Contador de tentativas erradas (bloqueio de 15 min) |
| **Implantação (deployment)** | "Foto" do código publicada no endereço | Mudou o código? Precisa publicar **nova versão** (seção 11) |
| **HMAC** | Hash com segredo | Tokens, códigos e senhas ficam na planilha só como hash |

**Duas particularidades do Apps Script que moldam o desenho** (e que o PRD já considera):

1. O `doPost` **não lê cabeçalhos HTTP** e **não devolve códigos de status** customizados. Por isso as credenciais vão no corpo do JSON e a resposta é sempre `{ ok, dados }` ou `{ ok:false, codigo, mensagem }`.
2. O endereço do Web App responde com um **redirecionamento** antes do JSON. O cliente precisa seguir redirecionamentos.

---

## 3. Decisões deste manual para as lacunas do PRD

O PRD deixou três pontos em aberto. Estas foram as decisões aceitas, mais alguns ajustes pequenos que decorrem delas. **Atualize o PRD (v1.2) com isto.**

### 3.1 Como nasce o primeiro admin

Nenhum admin existe antes de o sistema funcionar, então o primeiro é criado **pela conta dona, dentro do editor do Apps Script**, rodando a função `criarPrimeiroAdmin()` (seção 7). Ela cria a unidade `CENTRAL`, grava o admin na aba `Usuarios` e gera a **senha inicial forte** (no log). Os demais admins, unidades e usuários são cadastrados **pelo painel do app**.

Se alguém perder a senha e não houver outro admin ativo, existe a função de recuperação `regenerarSenhaManual()`, também rodada pela conta dona.

### 3.2 Senha forte (todos os usuários)

- Todo usuário recebe uma **senha forte** gerada automaticamente no cadastro (mín. 8 caracteres, maiúscula, minúscula, número e especial).
- Na planilha fica só o `senha_hash` (HMAC). O texto da senha aparece **uma vez** na resposta / log.
- Comandante e admin confirmam `decidir` (aprovar/rejeitar) com essa senha no payload (`senha`).
- O admin pode **redefinir** a senha (`admin_usuarios` → `redefinir_senha`); uma nova senha forte é gerada e devolvida uma vez.
- Errar a senha conta nas **5 falhas em 15 min** que bloqueiam o e-mail.

### 3.3 Saldo

Nenhuma ação grava saldo. Ele é **sempre calculado** a partir dos lançamentos:

```
saldo = horas extras APROVADAS − compensações APROVADAS
        − estornos de horas extras + estornos de compensações
```

### 3.4 Ajustes pequenos (extensões à API do PRD)

| Ajuste | Motivo |
|---|---|
| Campo `"app": "1.0.0"` em toda requisição | Permite aplicar `versao_minima` (PRD, regra 7). Sem ele não há como saber a versão do app |
| Op `redefinir_senha` em `admin_usuarios` | Gera nova senha forte (3.2) |
| Admin **não** estorna lançamento próprio | Impede que um admin devolva a si mesmo horas já compensadas |
| Admin só decide registros de **comandantes e admins**; os de policiais são do comandante da unidade | Respeita o critério de aceite "só conta após aprovação do comandante da unidade" |
| Matrícula não pode mudar depois de haver lançamentos | Evita dividir o saldo de uma pessoa em duas matrículas |
| Admin não pode desativar a si mesmo nem tirar o próprio perfil ADMIN | Evita ficar sem admin |

---

## 4. Fase 0 — Preparar conta, planilha e projeto

### 4.1 Criar a conta Google dona do sistema

1. Abra uma janela anônima e acesse `accounts.google.com/signup`.
2. Crie uma conta **nova e exclusiva** do sistema (ex.: `controle.horas.destacamentos@gmail.com`). Não use conta pessoal de ninguém.
3. Use um **e-mail de recuperação institucional** (caixa do setor, não de pessoa física) e um telefone de recuperação do setor.
4. Ative a **verificação em duas etapas** (*Conta Google → Segurança → Verificação em duas etapas*).
5. Gere e imprima os **códigos de backup** da verificação em duas etapas. Guarde em envelope lacrado, com pelo menos **dois admins** cientes de onde está.
6. Anote a senha em local seguro, conhecido por pelo menos dois admins. Perder esta conta é o maior risco do projeto (PRD, seção 17).

> **Confirme com o comando** se existe conta institucional Google. Se existir, é preferível. O PRD diz que a autorização de uso dos dados já foi obtida.

### 4.2 Criar a planilha

1. Logado na conta nova, acesse `sheets.google.com` e crie uma planilha em branco.
2. Dê o nome **`Horas Extras — DADOS (NÃO COMPARTILHAR)`**.
3. **Não compartilhe com ninguém.** Quem precisa consultar usa o painel do app.

Você **não** precisa criar as abas à mão: a função `configurarProjeto()` faz isso (seção 7).

### 4.3 Abrir o projeto Apps Script

1. Na planilha, menu **Extensões → Apps Script**.
2. Abre o editor numa nova aba. Clique em **Projeto sem título** (canto superior esquerdo) e renomeie para `HorasExtras-Backend`.
3. Clique na engrenagem **Configurações do projeto** e:
   - confirme que o **fuso horário** é `(GMT-03:00) Horário de Brasília` (se não for, altere);
   - marque **Mostrar arquivo de manifesto "appsscript.json" no editor**.
4. Volte ao **Editor** (ícone `< >`). Na lateral, em **Arquivos**, vai aparecer `appsscript.json` e `Código.gs`.
5. Abra `appsscript.json` e confira que contém:

```json
{
  "timeZone": "America/Sao_Paulo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

O Apps Script descobre sozinho as permissões que o código precisa; não é necessário listá-las.

> **Os nomes dos menus podem variar** um pouco com a versão da interface do Google. Se algo não estiver exatamente onde o manual diz, procure o item de nome parecido.

### 4.4 Criar os arquivos de código

Na seção 5 está a lista. Para **cada arquivo**:

1. Ao lado de **Arquivos**, clique em **+** → **Script**.
2. Digite o nome **sem** `.gs` (ex.: `Config`) e tecle Enter.
3. Apague o conteúdo e cole o código da seção 6.
4. Salve (`Ctrl+S`).

O arquivo `Código.gs` que já existe: renomeie-o para `Api` (três pontinhos ao lado do nome → *Renomear*) e use-o para o código do arquivo `Api.gs`.

---

## 5. Estrutura dos arquivos do projeto

| # | Arquivo | Responsabilidade |
|---|---|---|
| 1 | `Config.gs` | Constantes e esquema (colunas) das abas |
| 2 | `Util.gs` | Funções de apoio: ler/gravar planilha, hash, datas, trava, bloqueio |
| 3 | `Api.gs` | `doGet`, `doPost` e o roteador de ações |
| 4 | `Auth.gs` | Autenticação, perfis, senha |
| 5 | `Ativacao.gs` | Ação `login` (e-mail + senha → token) |
| 5b | `Perfil.gs` | Ação `perfil` (nome e alterar senha) |
| 6 | `Lancamentos.gs` | `sync`, `cancelar`, `saldo` e cálculo de saldos |
| 7 | `Aprovacao.gs` | `pendencias`, `decidir` |
| 8 | `Admin.gs` | `relatorio`, `estornar`, `admin_usuarios`, `auditoria` |
| 9 | `Backup.gs` | Backup diário e rotação |
| 10 | `Setup.gs` | Configuração inicial e primeiro admin (rodados uma vez, no editor) |
| 11 | `Testes.gs` | Função para testar sem sair do editor |

> **Importante:** no Apps Script todos os arquivos viram um só programa. A ordem dos arquivos não importa para funções, mas **não** declare variáveis globais que dependam de funções de outros arquivos. O código deste manual já respeita isso.

---
