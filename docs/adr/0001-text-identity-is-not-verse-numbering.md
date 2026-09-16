# ADR 0001 — Identidade textual não é numeração de versículo

Status: aceito em 2026-09-10.

## Decisão

Usar IDs estáveis de unidades textuais como identidade canônica e tratar livro/capítulo/versículo como endereço dependente de esquema.

## Motivo

Edições e tradições dividem, fundem, deslocam e reordenam material. Um inteiro de versículo não identifica edição, testemunho nem unidade não bíblica.

## Consequências

Repositórios resolvem endereços antes de buscar texto. ViewModels podem continuar exibindo versículos, mas não definem o domínio.
