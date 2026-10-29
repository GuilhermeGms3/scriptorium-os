# Busca por sentido, vetores e estatísticas lexicais

## Limites preservados

- O workspace canônico, seus PDFs, revisões e comentários não mudam de schema nesta entrega.
- `candidates.sqlite` continua sendo índice derivado do pipeline existente, não outro repositório
  de conhecimento. Publicação e auditoria de associações não são alteradas.
- Busca textual/FTS continua padrão. A opção **Por sentido** é explícita e não usa LLM geradora.
- Nenhum modelo é iniciado/baixado para testes; SSR não prepara índices nem inicializa WASM.

## Contratos e ambiente

`app.checkpoint.Checkpoint` é o contrato compartilhado entre analisador e API: mapa de escalares
JSON. Respostas de um lote podem alimentar diretamente o seguinte, incluindo estado de correferência.
Valores aninhados recebem 422. Providers existentes não precisam mudar o formato escalar.

`uv.lock` é o artefato reproduzível, com instalação em `.venv`, sem instalar bibliotecas no Python
global. `npm run semantic:install` exige uv no PATH. `semantic:typecheck` executa **mypy --strict app**,
não apenas o analisador; `semantic:lint` cobre app/tests/scripts. Factories dinâmicas do Transformers
são isoladas por protocolos tipados; respostas externas são validadas por Pydantic.

## Vetores e migração 3

As tabelas `candidate_embeddings` e `embedding_cache` usam BLOB `<f4` e dimensão explícita 1–4096.
Constraints exigem `length(vector)=dimension*4`; FKs impedem candidatos órfãos. Leituras validam
dimensão, finitude, checksum da unidade, recipe, modelo, revisão e edição. A revisão é declarada
pelo operador: trocar o arquivo do embedding exige atualizar sua revisão e preparar o índice.

1. Recusar schema desconhecido antes de alterações.
2. Adquirir `BEGIN IMMEDIATE`, verificar versão novamente e criar backup SQLite consistente.
3. Criar novas tabelas; converter JSON legado; validar cada vetor; substituir tabelas e registrar 3.
4. Qualquer falha faz rollback; backup permanece. Nenhum PDF é aberto nessa migração.

Para rollback operacional: pare **todos** os processos do companion, preserve o índice atual e seus
sidecars, e restaure uma cópia do backup com o executável anterior. Nunca substitua um SQLite aberto
ou deixe WAL de outra versão junto ao arquivo restaurado. Por ser índice derivado, também é possível
usar um novo `SCRIPTORIUM_PIPELINE_DATA` e reindexar, conservando o antigo para diagnóstico.

Na mutação de candidatos, a matriz em cache é invalidada inclusive após falha; não se reutilizam
vetores de texto alterado. O cache de embeddings por checksum evita recalcular o mesmo texto/modelo.
Recuperação usa NumPy float32, não Torch; a matriz da edição ainda ocupa RAM proporcional ao índice.
Não é ANN nem uma promessa de suportar milhões de vetores sem trabalho adicional.

### Medição local reproduzível

`npm run semantic:benchmark`: 10.000 vetores × 768 dimensões, seed 42, dois bancos temporários,
mesmos float32, igualdade exata após leitura, sem abrir biblioteca privada. Python 3.13.3/Windows,
2026-10-17. Um ensaio, sem pretensão de benchmark universal:

| Medida | JSON TEXT | Float32 BLOB |
| --- | ---: | ---: |
| Banco SQLite | 163.938.304 B | 41.058.304 B |
| Gravação | 3.906,54 ms | 138,23 ms |
| Leitura + decodificação + matriz | 2.450,95 ms | 62,76 ms |
| Produto NumPy | 1,58 ms | 1,51 ms |

Redução de ~75% no tamanho; conversão/leitura ~39× mais rápida **neste ensaio**. Não mede rede,
inferência do embedding, pico de memória ou latência total da busca em produção.

## Busca híbrida e interface

`POST /v1/pipeline/search`: `{query, editionId, limit?}` (até 2.000 caracteres, 1–50 resultados).
Retorna candidatos com identidade completa, score de relevância RRF, ranks lexical/semântico,
`retrieval` e `embeddingConfigured`. Query vazia é 422; edição/versão não indexada é 409;
pipeline ocupado 429; modelo/dimensão inválidos 503. Não retorna afirmação de verdade teológica.

Fluxo: FTS5/BM25 top32 + similaridade global do embedding top24 → união → reciprocal-rank fusion
`1/(60+rank)` por lista → desempate pelo ID. FTS sem configuração é fallback **identificado**,
nunca anunciado como compreensão semântica. Índice parcialmente vetorizado exige reindexação.
Sem modelo multilíngue adequado, não há garantia de qualidade para português/grego/hebraico.

A Busca mantém texto/referências e acrescenta modo, edição, preparação cancelável e mensagens.
Reutiliza `LocalKnowledgePipelineService.indexEdition` em lotes; nenhum corpus é importado só por
digitar uma consulta. Preparação retoma idempotentemente, percorrendo os lotes já concluídos sem
recalcular vetores válidos. Requisições antigas recebem cancelamento; cache separa modo/edição/query.
O resultado leva à passagem **e edição** solicitadas, com versículo no hash.

Na instalação/Docker o cliente usa `/api/workspace/pipeline/v1/{info,index,search,link,ocr}` com
sessão, header de intenção, mesma origem, métodos e tamanhos limitados. Servidor encaminha somente
essas operações ao companion configurado; não é proxy arbitrário. Browser-only sem instalação
mantém acesso loopback. A rede de inferência continua restrita a loopback, conforme política anterior.

## Glossário e cache

Regras versionadas em JSON, validadas (sem sources duplicados), até 200 regras e arquivo 256 KiB.
`modelRevision = commit do modelo + :glossary: + SHA256 das regras`. O commit real continua sendo
usado para baixar/carregar o modelo, sem passar o identificador composto ao Hugging Face.
Cache exato não reutiliza outra revisão de regras. Traduções humanas não são sobrescritas.
Se o serviço estiver offline, o fallback de tradução já armazenada foi preservado; ele pode vir de
um glossário anterior e não certifica aplicação das regras novas.

Testes usam modelo falso, verificam proteção e fallback quando placeholders se danificam. Fluência
do Marian e qualidade de um embedding real precisam de validação com modelos carregados; não há
download automático desses modelos na suíte.

## Estatísticas lexicais

`CorpusStorage.getLexicalStatistics` → `LinguisticRepository` → `ScriptureKnowledgeEngine` →
disclosure **Distribuição e palavras vizinhas** na aba Ocorrências. Grego TAGNT/SBLGNT e hebraico
WLC/OSHB usam o índice linguístico já entregue, sem importar JSON de corpus na UI.

- Distribuição: tokens por lema/edição/livro, endereço no scheme da unidade, sem duplicar contagem
  quando há múltiplos endereços. Sem endereço, grupo explícito “Sem endereço de livro”.
- Vizinhos: janela padrão ±2 posições (máximo5), sem cruzar unidade textual/edição. Agrupamento por
  forma de lema (ou superfície se ausente/codificada), direção, distância e frequência; top24
  determinístico. OSHB frequentemente fornece códigos numéricos, não o lema hebraico escrito:
  nesses casos mostramos a superfície hebraica, nunca os números como se fossem palavras.
  Referências compostas do OSHB não são automaticamente unificadas em uma raiz lexical.
- São contagens de dados instalados, não definições lexicais, traduções ou prova de interpretação.
- SQL parametrizado utiliza os índices existentes de lema, unidade/posição e endereço/scheme.
  Não exige migration do corpus. O pacote linguístico é aberto somente quando consultado.

## Verificações

Suítes cobrem evidência inventada, candidato/edição trocados, offsets UTF-16, abstinência, semaphore,
índice ausente/incompleto, falha de embedding/rollback, revisão e dimensão, migração/backup/FKs,
busca global sem match literal, cache por glossário, tradução com termos protegidos e contagem
lexical em bancos sintéticos e corpora gregos/hebraicos reais. Resultados de execução e QA estão
registrados em `.codex/PROJECT_MEMORY.md`; workflow remoto e Docker devem ser verificados à parte.
