# Contextos patrísticos e confessionais privados

## Fluxo e limites

Os especialistas offline consomem as páginas já importadas, sem reextrair ou substituir o
texto do workspace. Reutilizam `ContextualReadingService`, o Rastro, as decisões de publicação
e a persistência da instalação. Não há banco paralelo, LLM ou backend remoto.

1. `export-commentary-source.ts` exporta páginas, limites canônicos e spans protegidos.
2. `export-commentary-layout.ts` verifica o PDF e alinha geometria aos offsets UTF-16 originais.
3. `export-source-references.ts` usa o **parser bíblico TypeScript existente**, não um parser
   concorrente em Python. Registra referências e notas numeradas, com hash do snapshot.
4. `app.source_context` aplica um perfil vinculado ao checksum e produz staging privado.
5. O importador canônico confere evidência literal, identidade, transações e idempotência.

Documentos são dados não confiáveis, não instruções. Os CLIs não executam conteúdo de PDFs.
Pacotes e originais permanecem privados em `data/workspace/`, fora dos assets públicos e Git.

## Tratamentos diferentes

- **Agostinho sobre João:** a referência da nota associada ao lema bíblico inicial fornece
  a passagem principal da conferência. O número de rodapé não pode transformar João em 1 João.
  O lema e a seção editorial `Análise` são excluídos do comentário atribuído a Agostinho.
  O corpo é publicado em trechos limitados, no alcance da conferência, não como uma nova
  explicação individual de cada verso. Referências no corpo continuam secundárias.
- **Gênesis e Sermão da Montanha:** capítulos internos e livros da obra patrística não são
  capítulos bíblicos. Os trechos desta entrega têm alcance de **obra bíblica**, com caminho
  interno da fonte preservado. São contexto no inspector, não cobertura verso a verso.
  O perfil do Sermão termina antes da introdução editorial de _A fé e as obras_.
- **Catecismo:** parágrafos 1–2865 são reconhecidos; listas internas não reiniciam essa
  sequência. Citações bíblicas explícitas geram `cites` + `proof-text`, nunca `discusses`
  por padrão. Parágrafo sem destino explícito não recebe uma associação inventada.
- **Confissões:** artigos/capítulos conservam seu alcance doutrinário. Referência só de
  capítulo continua só de capítulo. Não se deduz uma referência precisa apenas pela frase
  lembrar um versículo. A tradição é atributo da fonte, não do usuário nem verdade universal.

O `sourceContext` opcional da análise registra tipo, localizador, caminho de seção, autor e
tradição textual. O Reader distingue texto confessional de comentário original. Nenhum desses
rótulos equivale a revisão acadêmica ou a atribuição automática de uma doutrina ao grafo público.
Exposições patrísticas com mais de 1.500 caracteres ficam recolhidas, sem substituição do
texto integral. Trechos da mesma fonte são ordenados por página/offset, não por data de importação.

Referências ao Saltério histórico ficam em exceção neste especialista: não existe crosswalk
verificado para essas edições. Isso não remove dados dos corpora nem das fontes anteriores.

## Contratos e segurança da atualização

O formato `scriptorium-contextual-reading-v1` mantém compatibilidade; `relationType`,
`referenceRole` e `analysis.sourceContext` são adições opcionais. Texto-prova exige `cites`
e contexto `catechism`/`confession`. Uma repetição com outro papel ou análise é recusada,
não sobrescreve a associação existente. A evidência original continua literal e citável.

Manifests tradicionais usam `allBookHeadingsResolved`; os especialistas de fontes usam
`structureResolved` + `sourceType: source-context`, sem fingir que todo documento tem 66 livros.
`combine-contextual-batches.ts` verifica os pacotes antes de criar um diretório de entrega;
o manifesto declara uma lista explícita de checksums. Isso permite um backup consistente para
o lote multifonte, em vez de copiar todo o banco novamente para cada obra. Nenhuma verificação
de fonte/modo/SHA-256 é dispensada.

Migration **025** corrige somente unidades machine-generated deste especialista que foram
classificadas pelo antigo default `footnote`: passam a `paragraph`. IDs, texto, spans, relações,
propostas e revisões não mudam. Unidades com proposta revisada e namespaces antigos não são
alterados. Novas importações já usam `paragraph`. A migration é repetível e testada; o rollback
operacional é restaurar o backup offline, não fazer downgrade de schema em um banco vivo.
Atualize os runtimes antes de abrir schema 25; código antigo deve recusar versão não suportada.

## Operação

Com todos os escritores do workspace parados:

```powershell
npx tsx scripts/content/export-source-references.ts <snapshot.json> <references.json>
# Em services/semantic-engine:
py -3.13 -m app.source_context <snapshot.json> <layout.json> <references.json> profiles/catholic-catechism.json <staging-novo>
# Na raiz, opcionalmente reunir vários staging dirs:
npx tsx scripts/content/combine-contextual-batches.ts <entrega-nova> <staging1> <staging2>
npm run content:import:contextual -- data/workspace/workspace.sqlite3 <entrega> --runtime-stopped
npx tsx scripts/content/verify-contextual-reading.ts data/workspace/workspace.sqlite3 <recibo-novo.json> <staging1> <staging2>
```

Perfis adicionais: `augustine-john-i`, `augustine-john-iii`, `augustine-genesis`,
`augustine-sermon`, `augsburg-confession` e `westminster-confession`. Use os nomes `.json`
completos. Layout inesperado, fonte divergente ou seção esperada ausente bloqueiam staging.
Um relatório sem notas não é um pacote publicável. Diretórios novos evitam sobrescrever
calibrações; retomada/idempotência pertencem ao importador e ao banco, não a timestamps.

## Entrega de 16–17/10/2026

| Fonte                 | Novos vínculos | Alcance real                                                 |
| --------------------- | -------------: | ------------------------------------------------------------ |
| João comentado I      |            125 | 20 conferências, na passagem principal                       |
| João comentado III    |            133 | 48 conferências; duas sem referência principal resolvida     |
| Comentário ao Gênesis |            388 | Contexto de obra, não versos individuais                     |
| Sermão da Montanha    |            129 | Contexto de obra, não versos individuais                     |
| Catecismo católico    |          1.018 | Citações de 669 parágrafos efetivamente publicados           |
| Augsburgo             |            142 | Citações de capítulo, em dez artigos                         |
| **Total**             |      **1.935** | **775 contextos patrísticos e 1.160 vínculos confessionais** |

São 23 lotes, inseridos realmente no workspace existente, com backup anterior. Os 57 documentos
e as unidades/revisões anteriores foram preservados. Todos os novos vínculos permanecem
machine-proposed/machine-visible por política documental, com auditoria pendente.

O arquivo disponível de **Jerusalém** foi inspecionado por texto/geometria nas 1.221 páginas e
por amostras renderizadas: não foi identificado aparato de notas comentadas. Nenhum texto
bíblico foi publicado como comentário. O exemplar de **Westminster** reconheceu seus 33
capítulos, mas não trouxe destinos bíblicos explícitos utilizáveis pelo perfil; zero vínculos
forçados. Continuam acessíveis como documentos importados, não como comentários novos.

Permanecem: revisão das exceções, associação fina de Gênesis/Sermão por passagem, os demais
volumes/obras de Agostinho, crosswalk do Saltério, notas de Jerusalém de outra edição/arquivo,
e resolução de alusões implícitas de confissões. Nada disso foi silenciosamente marcado completo.

O auditor exclui `proof-text` da cobertura de comentários. Contar citações confessionais como
versículos explicados produziria uma estatística enganosa. Consulte também
[leitura contextual](../content/contextual-bible-reading.md).

## Verificação da entrega

- 395 testes TypeScript/55 arquivos e 73 Python passaram; typecheck, lint, build Node,
  Prettier, Ruff e mypy strict passaram. Migration 025 foi testada em banco limpo e cenário
  de unidades anteriores/revisadas, inclusive repetição, além de aplicada ao workspace com backup.
- Idempotência real: 0 novas/1.935 reutilizadas. Os 42.484 comentários anteriores foram
  reutilizados em verificação read-only; o baseline e `quick_check`/foreign keys passaram.
- QA de produção em `http://127.0.0.1:5173`, desktop 1440×1000 e móvel 390×844. Browser plugin
  não disponível; usado Playwright do runtime já instalado, sem dependência adicional.
- João 2/Agostinho: expandir/recolher, toggle e ordem crescente das páginas 226–230, 231–235.
  João 3/Catecismo: filtro estabilizado com 21 cartões confessionais, link sublinhado para p.119
  e destaque do trecho na fonte. Identidade/conteúdo das páginas, ausência de overlay de erro,
  console e screenshots conferidos. A abertura animada foi dispensada antes da captura final.
- Nenhum erro/aviso de console; sem overflow global móvel. O cabeçalho e seletor de fonte
  estreitos mantêm dívida visual anterior. Docker, tradução e demais combinações de fontes
  não foram validados nesta entrega. Build continua no preset Node local, sem alterar produção.

A verificação estrutural não certifica as referências impressas/OCR nem a interpretação da
fonte. Alguns recortes ainda incluem cabeçalhos editoriais de transição. Revisão de exceções,
precisão/recall e ligação fina permanecem trabalhos próprios; não há estimativa estatística
de acurácia ou aprovação humana integral.
