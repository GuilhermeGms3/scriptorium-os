# ADR 0003 — SQLite como índice local de corpus

Status: aceito em 2026-09-10.

## Decisão

Gerar pacotes SQLite por edição, usar FTS5 e acessá-los por uma interface assíncrona de storage. No browser, usar a distribuição WASM oficial do SQLite.

## Motivo

Imports JSON e varredura em arrays não escalam, incham os chunks e acoplam UI ao formato de ingestão. SQLite oferece transações, constraints, índices e busca local sem backend remoto.

## Consequências

Pacotes são baixados e abertos sob demanda. Um futuro desktop pode trocar o adaptador por SQLite nativo sem mudar componentes ou serviços.
