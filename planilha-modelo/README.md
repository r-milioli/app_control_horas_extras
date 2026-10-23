# Modelo da planilha — Controle de Horas Extras

Esta pasta descreve as **7 abas** que o backend usa. Em produção, a função `configurarProjeto()` (arquivo `Setup.gs`) **cria as abas e os cabeçalhos automaticamente**. Os CSVs aqui servem como referência e para importação manual, se preferir.

> **Importante:** formate todas as colunas como **texto simples** (evita que o Sheets apague zeros à esquerda em matrículas ou converta datas).

## Abas

| Aba | Arquivo | Quem escreve |
|---|---|---|
| `Lancamentos` | `Lancamentos.csv` | Script (via sync / decisão / estorno) |
| `Usuarios` | `Usuarios.csv` | Script (setup / admin) |
| `Dispositivos` | `Dispositivos.csv` | Script (ativação) |
| `Ativacoes` | `Ativacoes.csv` | Script (códigos — só hash) |
| `Unidades` | `Unidades.csv` | Script (setup / admin) |
| `Auditoria` | `Auditoria.csv` | Script (todas as ações relevantes) |
| `Config` | `Config.csv` | Script (setup) |

## Campos — Lancamentos

| Coluna | Tipo | Descrição |
|---|---|---|
| id | texto (UUID) | Gerado no app; chave de idempotência |
| tipo | texto | `HORA_EXTRA` \| `COMPENSACAO` \| `ESTORNO` |
| ref_id | texto | UUID do registro original (estorno / reenvio após rejeição) |
| matricula | texto | Vem do cadastro do usuário |
| nome | texto | Vem do cadastro do usuário |
| unidade_id | texto | ID da unidade |
| data | texto ISO | `AAAA-MM-DD` (data do serviço) |
| minutos | texto/inteiro | 30–1440, múltiplo de 30 |
| motivo | texto | 5–500 caracteres |
| criado_por | texto | E-mail do autor |
| criado_em | texto ISO | Timestamp do app |
| recebido_em | texto ISO | Timestamp do servidor |
| atualizado_em | texto ISO | Cursor de sync |
| status | texto | `AGUARDANDO_APROVACAO` \| `APROVADO` \| `REJEITADO` \| `CANCELADO` |
| decidido_por | texto | E-mail de quem aprovou/rejeitou |
| decidido_em | texto ISO | Quando decidiu |
| motivo_rejeicao | texto | Obrigatório se rejeitado |

## Campos — Usuarios

| Coluna | Descrição |
|---|---|
| email | Chave do usuário (minúsculas) |
| nome, matricula, unidade_id | Dados cadastrais |
| perfis | Ex.: `POLICIAL` ou `COMANDANTE,POLICIAL` ou `ADMIN,POLICIAL` |
| ativo | `SIM` / `NAO` |
| pin_hash | HMAC do PIN (vazio até definir) |
| criado_em, ultimo_acesso | ISO |

## Campos — Dispositivos / Ativacoes / Unidades / Auditoria / Config

Ver cabeçalhos dos CSVs correspondentes. Tokens e códigos **nunca** ficam em texto claro — só hash HMAC.

## Valores permitidos (resumo)

- **Status:** `AGUARDANDO_APROVACAO`, `APROVADO`, `REJEITADO`, `CANCELADO`
- **Tipos:** `HORA_EXTRA`, `COMPENSACAO`, `ESTORNO`
- **Perfis:** `POLICIAL`, `COMANDANTE`, `ADMIN`
- **Ativo / ativa:** `SIM` ou `NAO`

## Como usar este modelo

**Recomendado:** planilha em branco + `configurarProjeto()` (cria tudo).

**Alternativa:** criar as 7 abas manualmente, colar a linha de cabeçalho de cada CSV e deixar o restante vazio (os exemplos são só ilustrativos).
