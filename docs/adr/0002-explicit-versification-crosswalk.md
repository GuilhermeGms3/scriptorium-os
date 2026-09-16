# ADR 0002 — Crosswalk explícito de versificação

Status: aceito em 2026-09-10.

## Decisão

Modelar conversões como relações N:M versionadas entre conjuntos de âncoras.

## Motivo

Correspondências podem ser parciais, divididas, fundidas, reordenadas ou inexistentes. Igualdade numérica entre esquemas não prova equivalência.

## Consequências

Comparação direta exige o mesmo esquema. Conversão depende de evidência explícita e a UI informa alinhamento parcial ou ausente.
