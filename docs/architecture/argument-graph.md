# Grafo de argumentos

`Claim` é uma proposição. `Argument` liga premissas a uma conclusão. `Evidence` aponta para âncora textual, testemunho manuscrito, evidência arqueológica, fonte histórica/acadêmica, observação linguística ou análise estatística.

Relações explícitas incluem `supports`, `opposes`, `objects-to`, `responds-to`, `qualifies`, `depends-on`, `undercuts`, `rebuts`, `alternative-to`, `competes-with` e `derived-from`. Objeções e respostas são argumentos relacionados, sem entidade duplicada. Teorias agregam claims e se conectam a alternativas.

O repositório consulta conclusão, premissas, evidências, objeções, respostas e teorias concorrentes. Não existe `truthScore`, vencedor automático ou confiança teológica numérica. Estados de suporte e revisão têm semântica editorial, não metafísica.

As fixtures do Problema Sinótico são identificadas como `DEMO-NOT-A-CITATION`; servem para verificar a estrutura, não para simular bibliografia acadêmica.

## Leituras por perspectiva

O inspector da passagem agrupa as afirmações por perfil de perspectiva (`PassageViewpoint`), a partir de `KnowledgeRepository.viewpointsForPassage`:

- Um claim entra no grupo de cada perfil ligado a ele em `claim_perspectives` e de cada perfil dos argumentos que o concluem.
- Um claim sem nenhum desses perfis vai para o grupo `profile: null`, mostrado como "Sem perspectiva atribuída". Nunca se atribui uma perspectiva por adivinhação, semelhança de texto ou tradição presumida.
- **A favor:** argumentos cuja conclusão é o claim e argumentos com relação `supports` dirigida a ele. **Contra:** argumentos com relação `opposes`, `rebuts` ou `undercuts` dirigida ao claim.
- Os grupos são ordenados pela `label` do perfil; o grupo `null` fica no fim.
- As visões só contam como disponíveis quando existe algum perfil ou algum argumento. Caso contrário, o inspector mostra o estado `awaiting-source`.

**Regra editorial:** só se atribui uma perspectiva que uma fonte citada pelo claim realmente sustenta. Se a fonte não liga a afirmação a um autor, tradição ou quadro interpretativo, o claim fica sem perspectiva. É preferível um grupo "Sem perspectiva atribuída" a uma atribuição sem fonte.

Formato de um claim num pack (`content/packs/*.json`):

```json
{
  "id": "claim:john-1-1-example",
  "proposition": "…",
  "kind": "exegetical-interpretation",
  "anchors": [
    {
      "type": "passage",
      "ref": {
        "bookId": "john",
        "chapter": 1,
        "verseStart": 1,
        "versificationSchemeId": "scriptorium-bcv-1"
      }
    }
  ],
  "sourceIds": ["source:…"],
  "supportLevel": "moderate",
  "reviewStatus": "reviewed",
  "origin": "source-derived",
  "assessmentNote": "Porque a fonte sustenta esta leitura.",
  "perspectives": [{ "profileId": "perspective:…", "association": "author-perspective" }],
  "evidence": [{ "evidenceId": "evidence:…", "relation": "supports" }]
}
```

- `anchor` (uma âncora, formato antigo) e `anchors[]` podem coexistir; são gravados por ordem, sem duplicados.
- `perspectives[].association` aceita `author-perspective` (a fonte atribui a afirmação a um autor que escreve a partir do perfil), `claimed-tradition` (a fonte afirma que uma tradição a sustenta) e `interpretive-context` (a afirmação é lida dentro desse quadro). `perspectiveIds[]` é uma forma curta de `interpretive-context`.
- `evidence[].relation` aceita `supports`, `opposes`, `qualifies`, `undercuts` e `rebuts`. No runtime, `supports` herda o nível de suporte do claim (`moderate` se for `unknown`), `qualifies` dá `moderate` e as restantes dão `disputed`. A espécie da evidência segue o alvo: `text-anchor`, `manuscript-witness` e `statistical-analysis` dão `textual`; `archaeological-evidence` dá `archaeological`; `historical-source` e `academic-source` dão `historical`; `linguistic-observation` dá `linguistic`.
- `origin` assume `source-derived` por omissão.

O seed valida todos os ficheiros antes de gravar qualquer linha: IDs duplicados entre ficheiros, referências partidas, o tipo de cada dimensão de perspectiva e os enums do domínio. Os problemas são listados juntos, no formato `ficheiro › registo › problema`. Uma evidência ou um argumento pode estar definido mais abaixo ou noutro pack, porque as chaves estrangeiras são verificadas só no fim.

Veja também [ADR 0005](../adr/0005-argument-graph.md).
