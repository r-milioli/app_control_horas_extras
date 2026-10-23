# Controle de Horas Extras

Sistema para registrar horas extras da tropa e controlar a **compensação futura** (folga/abatimento), sem remuneração e sem servidor próprio.

- **Backend:** Google Apps Script + Planilha protegida  
- **App desktop:** previsto no PRD (Electron + SQLite) — ainda não incluído neste repositório  
- **Documentos de produto:** `PRD-Controle-Horas-Extras.md`, `Manual-AppsScript-Backend-Horas-Extras.md`  
- **Referência visual:** `controle-horas-pmerj-design-system.html` (protótipo; identidade final ajustável)

Remote pretendido: `https://github.com/r-milioli/app_control_horas_extras.git`

## Conteúdo deste repositório

```
apps-script/          ← código para colar no Apps Script (11 arquivos + manifesto)
planilha-modelo/      ← esquema das 7 abas + CSVs de exemplo
docs/
  COMO-INSTALAR-BACKEND.md
  API.md
PRD-Controle-Horas-Extras.md
Manual-AppsScript-Backend-Horas-Extras.md
controle-horas-pmerj-design-system.html
```

## Início rápido (backend)

1. Crie a planilha na conta Google dona do sistema.
2. Siga **[docs/COMO-INSTALAR-BACKEND.md](docs/COMO-INSTALAR-BACKEND.md)** para colar os scripts, rodar `configurarProjeto` / `criarPrimeiroAdmin` e publicar o Web App.
3. Consulte o modelo das abas em **[planilha-modelo/README.md](planilha-modelo/README.md)**.
4. Contrato da API: **[docs/API.md](docs/API.md)**.

## Arquitetura

```
[App desktop]  ──HTTPS/JSON──▶  [Apps Script Web App]  ──▶  [Planilha]
 SQLite local                    valida, trava, grava       só o script escreve
```

## Status

| Entrega | Situação |
|---|---|
| PRD / decisões | Pronto |
| Backend Apps Script | Pronto para instalar |
| Modelo da planilha | Pronto |
| App Electron | Pendente (próxima fase) |

## Licença / uso

Sistema interno. Não compartilhe a planilha nem a URL do Web App publicamente com dados reais.
