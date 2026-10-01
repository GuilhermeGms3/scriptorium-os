# ADR 0012 — Vínculos semânticos são propostas revisáveis

## Status

Aceito em 2026-09-30.

## Decisão

O motor pode segmentar texto, classificar domínios e detectar referências de modo determinístico,
mas toda relação entre um trecho importado e uma passagem nasce como `machine-proposed`. Somente
uma ação humana a torna `accepted` ou `rejected`.

O escore persistido mede a força do padrão técnico que produziu a proposta. Ele não mede verdade
histórica, teológica ou exegética. O leitor bíblico exibe apenas vínculos aceitos na área de
literatura; o leitor privado permite auditar e revisar os candidatos.

## Consequências

- texto, classificação e relação permanecem entidades separadas;
- reindexação é idempotente por checksum do documento e versão do motor;
- futuros extratores Python ou modelos locais precisam produzir o mesmo contrato e não podem
  contornar o estado de revisão;
- nenhum trecho protegido ou tradução automática entra nos pacotes públicos.
