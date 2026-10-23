# PRD — Sistema de Controle de Horas Extras (MVP)

**Versão:** 1.1
**Data:** 23/10/2026
**Status:** Validado pelo autor (decisões da v1.0 incorporadas)

---

## 1. Visão geral

Sistema para registrar as horas extras da tropa e controlar a **compensação futura** dessas horas, centralizando os dados no setor responsável, sem servidor próprio. Os destacamentos usam um **app desktop Windows** que funciona offline; os dados trafegam por HTTPS até um **Google Apps Script (Web App)** que grava numa **planilha protegida**. Os administradores consultam tudo por um **painel dentro do próprio app**, sem abrir a planilha.

As horas extras **não geram remuneração**: servem exclusivamente como saldo para compensação futura (folga/abatimento).

## 2. Problema

- Não há servidor; só desktops Windows nas unidades.
- Mais de 20 destacamentos externos, em redes diferentes do setor central.
- Usuários são policiais, muitos sem familiaridade com internet e contas online.
- Login Google (OAuth) em app não verificado expira a cada 7 dias, o que inviabiliza a ideia inicial.

## 3. Objetivos

1. Cada policial registrar as **próprias** horas extras e compensações com o mínimo de atrito.
2. Funcionar **offline** e sincronizar quando houver internet.
3. Permitir uso **somente a e-mails cadastrados** pelo admin.
4. Exigir **aprovação do comandante** antes de o registro valer.
5. Manter **histórico auditável**: nada é apagado ou sobrescrito.
6. Calcular o **saldo de horas** de cada policial (horas extras aprovadas menos compensações aprovadas).
7. Dar aos admins um painel com saldos, relatórios e gestão de usuários.

### Fora do escopo do MVP

- Fechamento mensal (decidido: não haverá).
- Remuneração ou conversão das horas em pagamento.
- Tipos de hora extra com pesos diferentes (diurna, noturna, feriado).
- Delegação de aprovação do comandante.
- Integração com sistemas oficiais da corporação.
- App mobile ou versão web; notificações por e-mail/WhatsApp.
- Descarte ou expurgo de dados (decidido: só há abatimento de horas).

## 4. Perfis de usuário

| Perfil | Quem é | O que faz |
|---|---|---|
| **Policial** | Qualquer usuário cadastrado | Lança as próprias horas extras e compensações, sincroniza, vê seus registros e saldo |
| **Comandante** | Responsável pela unidade | Vê pendentes da sua unidade, aprova ou rejeita (com PIN) |
| **Admin** | Setor central (vários) | Cadastra usuários e unidades, vê tudo, relatórios, estornos, auditoria |
| **Dono do sistema** | Conta Google nova, criada pelos admins só para este fim | Única conta com acesso direto à planilha e ao script |

Um mesmo e-mail pode ter mais de um perfil (ex.: comandante também lança as suas horas).

## 5. Premissas e restrições

- Desktops com **Windows**; usuários podem instalar programas sem dificuldade.
- Unidades com internet estável; o modo offline é conveniência.
- Backend 100% no ecossistema Google gratuito (Apps Script + Planilhas + Drive).
- **Autorização para usar os dados no Google já obtida** pelo autor.
- Conta Google **nova**, criada pelos admins, exclusiva para o sistema.
- Sem formato oficial de relatório: o que for entregue neste MVP vale.
- Estimativa de volume: 20+ unidades, centenas a poucos milhares de registros por mês.

## 6. Arquitetura

```
[App desktop — Policial/Comandante/Admin]  ──HTTPS/JSON──▶  [Apps Script Web App]  ──▶  [Planilha protegida]
   SQLite local (offline)                                      valida, trava, grava        (só o script escreve)
```

- **Um único app** com telas conforme o perfil. Um só instalador.
- **Backend:** Web App com "Executar como: eu" (conta dona) e "Quem pode acessar: qualquer pessoa". O controle de acesso real é feito pelo script (e-mail + token de dispositivo + perfil).
- **Planilha inviolável:** só a conta dona tem acesso; admins usam o painel.
- **Stack sugerida:** Electron + SQLite (`better-sqlite3`) + instalador NSIS. As chamadas à API devem sair do processo principal do Electron (evita problemas de CORS).
- **Backend isolado:** o app só conhece a URL da API; trocar o backend no futuro não exige refazer o app.

## 7. Fluxo de vida do registro

```
(local)  RASCUNHO ──▶ PENDENTE_ENVIO ──sync──▶ (servidor) AGUARDANDO_APROVACAO ──▶ APROVADO
                                                                  │                    │
                                                                  ├──▶ REJEITADO      └──(estorno)──▶ lançamento ESTORNO
                                                                  └──▶ CANCELADO (pelo próprio autor)
```

- O registro sobe ao servidor com status **AGUARDANDO_APROVACAO** e **não conta** em saldo nem relatórios.
- Só **APROVADO** conta oficialmente.
- Registro enviado **não é editado**. Erro após aprovação: **estorno** (admin). Erro antes da decisão: o autor pode **cancelar** e lançar de novo.
- **REJEITADO** é terminal; o policial lança novo registro (com referência ao rejeitado) e vê o motivo.
- **Ninguém aprova o próprio lançamento.** Registros de um comandante são aprovados por um admin; registros de admin, por outro admin.
- Todo registro tem **UUID** gerado no app, o que torna o reenvio seguro (sem duplicar).

## 8. Regras de horas

- Lançamento em **minutos**, **mínimo de 30 minutos**, máximo de 24 horas (1440 min) por lançamento.
- Exibição em horas legíveis: `2h`, `1h30`, `45min`. O campo de entrada oferece atalhos de meia em meia hora.
- Vale para hora extra e para compensação.
- Sem tipos de hora extra e sem pesos: toda hora é "hora simples".
- Data do serviço não pode ser futura; datas passadas são permitidas.
- **Saldo** = soma das horas extras aprovadas − soma das compensações aprovadas, ajustado pelos estornos. É sempre calculado, nunca digitado.
- Compensação que deixaria o saldo negativo gera **alerta**, não bloqueio.

## 9. Requisitos funcionais

### 9.1 Cadastro, ativação e autenticação

- **RF-01** Admin cadastra no painel: e-mail, nome, matrícula, unidade e perfil(s) do usuário.
- **RF-02** Ao cadastrar, o sistema gera um **código de ativação** (uso único, validade de 72 h, guardado só como hash) que o admin entrega ao usuário.
- **RF-03** No primeiro uso, o usuário informa e-mail + código e o servidor devolve um **token de dispositivo**.
- **RF-04** O token fica guardado no cofre do Windows (Electron `safeStorage`). O usuário não digita mais nada.
- **RF-05** Todo envio leva e-mail + token; o script confere o usuário ativo, o dispositivo e o perfil.
- **RF-06** Admin pode **desativar** usuário ou **revogar** dispositivo; vale na próxima sincronização.
- **RF-07** Um usuário pode ter mais de um dispositivo ativo (ex.: duas máquinas no destacamento).
- **RF-08** Nome e matrícula vêm do **cadastro** do usuário, não são digitados a cada lançamento.

### 9.2 Policial

- **RF-10** Lançar **hora extra**: data, duração (minutos, mín. 30) e motivo.
- **RF-11** Lançar **compensação**: data, duração e motivo.
- **RF-12** Salvar como rascunho e **finalizar** (vira PENDENTE_ENVIO).
- **RF-13** Funcionar 100% offline para cadastrar e consultar.
- **RF-14** Botão **Sincronizar** e sincronização automática ao abrir o app, quando houver internet.
- **RF-15** Lista de registros com filtro por status e período.
- **RF-16** Ver o **próprio saldo** e o extrato (créditos, débitos, estornos).
- **RF-17** Indicador claro de conexão e de itens pendentes de envio.
- **RF-18** Ver o **motivo da rejeição**.
- **RF-19** **Cancelar** um registro enquanto estiver AGUARDANDO_APROVACAO.
- **RF-20** Validações: duração ≥ 30 min e ≤ 1440 min, data não futura, motivo de 5 a 500 caracteres.

### 9.3 Comandante

- **RF-21** Tela de **Aprovações**: registros AGUARDANDO_APROVACAO da sua unidade.
- **RF-22** Ver detalhes e **aprovar** ou **rejeitar** (rejeição exige motivo), individualmente ou em lote.
- **RF-23** Confirmar com **PIN próprio**, guardado como hash no servidor.
- **RF-24** Registrar quem decidiu, quando e de qual dispositivo.
- **RF-25** Só enxerga e decide registros da **própria unidade**.
- **RF-26** Aprovar exige conexão (resultado imediato e auditável).
- **RF-27** Não aprova os próprios lançamentos (ver seção 7).
- **RF-28** Ver o saldo dos policiais da unidade.

### 9.4 Admin

- **RF-30** Painel com visão global: totais por unidade e por policial, pendências.
- **RF-31** **Saldo por policial** e extrato individual.
- **RF-32** Relatórios com filtros (período, unidade, policial, status) e **exportação CSV/PDF**: extrato por policial, resumo por unidade, pendências de aprovação.
- **RF-33** Gestão de usuários, unidades, perfis, códigos de ativação e dispositivos.
- **RF-34** Lançar **estorno** com motivo obrigatório, referenciando o registro original.
- **RF-35** Consultar o **log de auditoria**.
- **RF-36** Ver **pendências antigas** (aguardando há mais de N dias, configurável).
- **RF-37** Ver a **última sincronização por unidade**.
- **RF-38** Vários admins simultâneos, com rastreabilidade por e-mail.
- **RF-39** Aprovar registros que o comandante não pode aprovar (os dele mesmo).

## 10. Modelo de dados (planilha)

Horas guardadas em **minutos (inteiro)**. Datas e carimbos de tempo em texto ISO (`AAAA-MM-DD`, `AAAA-MM-DDTHH:MM:SS.sssZ`). Todas as colunas de texto formatadas como **texto simples** (evita que a planilha converta matrículas com zero à esquerda ou datas).

**Aba `Lancamentos`:** id, tipo (HORA_EXTRA, COMPENSACAO, ESTORNO), ref_id, matricula, nome, unidade_id, data, minutos, motivo, criado_por, criado_em, recebido_em, atualizado_em, status (AGUARDANDO_APROVACAO, APROVADO, REJEITADO, CANCELADO), decidido_por, decidido_em, motivo_rejeicao.

**Aba `Usuarios`:** email, nome, matricula, unidade_id, perfis (separados por vírgula), ativo (SIM/NAO), pin_hash, criado_em, ultimo_acesso.

**Aba `Dispositivos`:** id, email, token_hash, nome_maquina, ativo, criado_em, ultimo_sync.

**Aba `Ativacoes`:** email, codigo_hash, expira_em, usado_em.

**Aba `Unidades`:** id, nome, comandante_email, ativa.

**Aba `Auditoria`:** timestamp, email, unidade_id, acao, objeto_id, resultado.

**Aba `Config`:** chave, valor (ex.: `versao_minima`, `dias_alerta_pendencia`).

Obs.: com milhares de linhas a leitura integral da aba ainda é rápida. Se o volume crescer muito, usar índice auxiliar ou arquivar por ano em outra planilha.

## 11. API do Apps Script

Endpoint único `doPost` (e `doGet` apenas como teste de saúde). O Apps Script **não lê cabeçalhos HTTP nem devolve códigos de status customizados**, então:

- Credenciais vão **no corpo** da requisição.
- A resposta é sempre JSON: `{ ok, dados }` ou `{ ok: false, codigo, mensagem }`.
- O app deve **seguir redirecionamentos** (o Web App responde com redirect antes do JSON).

**Requisição**

```json
{ "v": 1, "acao": "sync", "email": "usuario@exemplo.com", "token": "…", "payload": { } }
```

**Ações**

| Ação | Quem usa | Função |
|---|---|---|
| `ativar` | Qualquer pessoa com código | Troca e-mail + código por token de dispositivo |
| `sync` | Todos os perfis | Envia lançamentos pendentes e recebe atualizações, saldo e config |
| `cancelar` | Autor | Cancela registro aguardando aprovação |
| `pendencias` | Comandante, Admin | Lista aguardando aprovação (escopo por perfil) |
| `decidir` | Comandante, Admin | Aprova ou rejeita (exige PIN) |
| `saldo` | Todos | Saldo (escopo por perfil) |
| `relatorio` | Admin | Dados agregados e filtrados |
| `estornar` | Admin | Cria estorno |
| `admin_usuarios` | Admin | Usuários, unidades, códigos, dispositivos |
| `auditoria` | Admin | Consulta de logs |

**Regras do servidor**

1. Toda chamada (exceto `ativar`) autentica: usuário ativo + token válido + perfil permitido.
2. Escritas usam **`LockService`** para evitar corrupção com sincronizações simultâneas.
3. Envio **idempotente** pelo UUID.
4. Validações repetidas no servidor; nome e matrícula vêm do cadastro, nunca do app.
5. **Limite de tentativas** com `CacheService` (5 falhas em 15 min bloqueiam temporariamente).
6. Ações relevantes gravam na aba `Auditoria`.
7. `versao_minima` na aba `Config` permite recusar versões antigas do app.

**Códigos de erro:** `NAO_AUTORIZADO`, `USUARIO_INATIVO`, `CODIGO_INVALIDO`, `PIN_INVALIDO`, `VALIDACAO`, `VERSAO_ANTIGA`, `BLOQUEADO`, `OCUPADO`, `ACAO_INVALIDA`, `ERRO_INTERNO`.

## 12. Segurança e LGPD

- Nome e matrícula são dados pessoais: coletar só o necessário.
- Conta Google nova com **verificação em duas etapas**, senha forte, recuperação institucional e **pelo menos dois admins** capazes de recuperá-la.
- Planilha sem compartilhamento com terceiros.
- Tokens e códigos só existem como hash no servidor (HMAC com segredo guardado nas propriedades do script).
- A URL do Web App não é segredo suficiente: o controle é e-mail + token + perfil.
- **Backup:** cópia diária da planilha em pasta do Drive (cópias de backup antigas rotacionadas após 30 dias; os dados oficiais nunca são descartados).
- Sem exclusão física: usuários são desativados, registros são estornados ou cancelados.
- Não gravar PIN, token ou código em logs.
- Em exportações CSV/PDF, neutralizar textos que comecem com `=`, `+`, `-` ou `@` (injeção de fórmula).

## 13. Offline e sincronização

- SQLite local: `lancamentos`, `usuario_cache`, `config_cache`.
- **Sync em duas fases:** (1) envia pendentes em lotes pequenos (ex.: 50); (2) baixa mudanças desde o último cursor (`atualizado_em`).
- Falha no meio: reenvio seguro por UUID; o app mostra quantos itens ficaram pendentes.
- Conflito: o servidor sempre vence em status.
- Relógio da máquina muito errado: o servidor registra `recebido_em` e o app avisa.
- Botão "Exportar backup" para o caso de troca de máquina antes de sincronizar.

## 14. Telas do MVP

**Comuns:** Ativação (e-mail + código), Início com saldo, Sincronização, Ajustes.
**Policial:** Novo lançamento (hora extra / compensação), Meus registros, Extrato e saldo.
**Comandante:** Aprovações (lista com lote), Detalhe do registro (aprovar/rejeitar com PIN), Saldos da unidade.
**Admin:** Painel, Relatórios, Saldos, Usuários e unidades, Pendências antigas, Auditoria.

**UX para público não técnico:** textos simples, botões grandes, poucas telas, mensagens claras em português ("Sem internet. Seus registros estão salvos e serão enviados depois"), nenhuma configuração técnica visível.

## 15. Requisitos não funcionais

- Instalação em poucos cliques; opção portátil se algum posto bloquear instalação.
- Abrir e registrar em menos de 3 segundos, mesmo offline.
- Sincronizar 100 registros em menos de 30 segundos em conexão normal.
- Aviso claro (ou auto-atualização) quando houver nova versão.
- Windows 10 ou superior.

## 16. Fases de construção

| Fase | Entrega | Resultado verificável |
|---|---|---|
| 0 | Criar conta Google nova (2FA, dois admins), planilha e projeto Apps Script | Ambiente pronto |
| 1 | **Backend Apps Script**: abas, `ativar`, `sync`, validações, lock, auditoria, backup | Testes manuais com `curl` passando |
| 2 | **App do policial**: ativação, SQLite, lançamento offline, sync, saldo | Registro criado offline aparece na planilha após sincronizar |
| 3 | **Comandante**: pendências, aprovação com PIN, rejeição, cancelamento | Aprovação reflete no app do policial |
| 4 | **Admin**: painel, usuários, saldos, relatórios, estorno, auditoria | Admin cadastra usuário e exporta extrato |
| 5 | **Piloto** em 2 a 3 unidades por 2 a 4 semanas | Lista de ajustes dos usuários reais |
| 6 | Implantação nas demais unidades + treinamento curto | 20+ unidades ativas |

## 17. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Perda de acesso à conta Google | Alto | 2FA com recuperação institucional, dois admins, backups no Drive |
| Vazamento da URL do Web App | Médio | E-mail + token + perfil; limite de tentativas |
| Limites e cotas do Apps Script | Baixo a médio | Volume pequeno; lock; lotes; monitorar execuções; backend isolado para migração |
| Perda de dados antes de sincronizar | Médio | Backup local, aviso de pendências, sync automático |
| Planilha crescer demais | Baixo | Índice auxiliar e arquivamento anual |
| Troca de comandante ou de admin | Médio | Admin altera comandante da unidade e perfis no painel |
| Resistência dos usuários | Médio | Piloto, UX simples, treinamento curto |
| Aprovação de lançamentos em massa sem conferência | Médio | Relatório de pendências antigas e trilha de auditoria |

## 18. Decisões registradas

| Tema | Decisão |
|---|---|
| Fluxo | Registro sobe como aguardando aprovação; só aprovado conta |
| Quem lança | Qualquer policial cadastrado lança as próprias horas |
| Acesso | Por e-mail cadastrado pelo admin no painel |
| Delegação de aprovação | Não haverá |
| Unidade de medida | Minutos, mínimo 30; exibição em horas / hora e meia |
| Tipos de hora | Hora simples, sem pesos |
| Fechamento mensal | Não haverá; apenas abatimento de horas |
| Remuneração | Não haverá; controle de compensação futura |
| Relatórios | Sem modelo oficial; entregar extrato, resumo por unidade e pendências |
| Conta Google | Nova, criada pelos admins, exclusiva do sistema |
| Retenção | Sem descarte; apenas abatimento |
| Autorização para uso de dados no Google | Já obtida |

## 19. Pontos operacionais para a Fase 0

1. Definir quem são os **admins iniciais** (mínimo 2) e o e-mail de recuperação da conta.
2. Escolher as **unidades do piloto** (2 a 3).
3. Levantar a lista de **unidades, comandantes e e-mails** para o cadastro inicial.

## 20. Critérios de aceite do MVP

- Usuário ativa o app **uma única vez** e não precisa fazer login novamente.
- Registro criado **sem internet** é enviado na sincronização, sem duplicar mesmo se a conexão cair no meio.
- E-mail não cadastrado ou desativado **não consegue** enviar nem receber dados.
- Registro só conta em saldo e relatórios **após aprovação** do comandante da unidade.
- Comandante **não vê** nem aprova registros de outras unidades, nem os próprios.
- Lançamentos abaixo de 30 minutos são recusados.
- Nenhum registro é editado ou apagado após o envio; correções geram estorno ou cancelamento com histórico.
- Compensação abate o saldo do policial corretamente, e o saldo aparece em horas legíveis.
- Admins cadastram usuários e consultam saldos e relatórios **sem acessar a planilha**.
- Toda ação relevante aparece no log de auditoria.
- Backup diário da planilha funcionando.
