# Referência da API (Apps Script)

**Endpoint:** URL do Web App (`doPost`).  
**Protocolo:** JSON no corpo. Sempre seguir redirecionamentos HTTP.

## Envelope da requisição

```json
{
  "v": 1,
  "acao": "sync",
  "email": "usuario@exemplo.com",
  "token": "…",
  "app": "1.0.0",
  "payload": {}
}
```

- `ativar` não exige `token`.
- Demais ações exigem `email` + `token` de dispositivo válido.

## Respostas

Sucesso:

```json
{ "ok": true, "dados": { } }
```

Erro:

```json
{ "ok": false, "codigo": "VALIDACAO", "mensagem": "…" }
```

Códigos: `NAO_AUTORIZADO`, `USUARIO_INATIVO`, `CODIGO_INVALIDO`, `PIN_INVALIDO`, `VALIDACAO`, `VERSAO_ANTIGA`, `BLOQUEADO`, `OCUPADO`, `ACAO_INVALIDA`, `ERRO_INTERNO`.

## Ações

| Ação | Perfis | Payload principal |
|---|---|---|
| `ativar` | — | `codigo`, `nome_maquina`, `pin` (se etapa DEFINIR_PIN) |
| `definir_pin` | COMANDANTE, ADMIN | `pin` (6 dígitos) |
| `sync` | todos | `lancamentos[]`, `cursor` |
| `cancelar` | autor | `id` |
| `pendencias` | COMANDANTE, ADMIN | — |
| `decidir` | COMANDANTE, ADMIN | `ids[]`, `decisao` (`APROVAR`/`REJEITAR`), `pin`, `motivo_rejeicao` |
| `saldo` | todos | opcional `matricula` / escopo por perfil |
| `relatorio` | ADMIN | `tipo`, filtros |
| `estornar` | ADMIN | `ref_id`, `motivo` |
| `admin_usuarios` | ADMIN | `op` + campos |
| `auditoria` | ADMIN | filtros |

### Item de `sync.lancamentos[]`

```json
{
  "id": "uuid-gerado-no-app",
  "tipo": "HORA_EXTRA",
  "data": "2026-10-22",
  "minutos": 120,
  "motivo": "Texto do motivo",
  "criado_em": "2026-10-22T18:00:00.000Z",
  "ref_id": ""
}
```

### `admin_usuarios.op`

`listar_usuarios`, `listar_unidades`, `listar_dispositivos`, `criar_unidade`, `criar_usuario`, `atualizar_usuario`, `desativar_usuario`, `revogar_dispositivo`, `emitir_codigo`, `redefinir_pin`.

### `relatorio.tipo`

`resumo_unidade` (padrão), `extrato_policial`, `pendencias`.
