# Extração de comentários originais de Bíblias de estudo

Para fontes patrísticas e confessionais, veja o especialista de
[contextos de fonte](patristic-confessional-context.md): referências confessionais não são
promovidas a exegese universal e capítulos internos não viram versículos.

## Responsabilidades

O companion Python agora tem uma ferramenta **offline**, sem LLM, para extrair notas de PDFs
**notes-only calibrados**. Não é outro banco nem um substituto do pipeline documental.

- Node exporta páginas existentes em snapshot somente leitura, com limites canônicos e spans
  editoriais protegidos. O texto já extraído não é substituído nem normalizado permanentemente.
- Python reconhece cabeçalhos na ordem dos livros e marcadores de notas, reúne continuações
  entre páginas e produz pacotes para `ContextualReadingService` e relatório privado.
- Na Genebra calibrada, `pypdf` verifica o SHA-256 do original e exige evidência de negrito no
  marcador. A Shedd calibrada tem imagem e camada textual; sua fonte textual não conserva o
  negrito. Usa regras mais conservadoras de início de linha e sequência de capítulos.
- O importador canônico valida evidência literal única e, no modo `source-excerpt`, exige que o
  texto apresentado coincida com os spans. A descrição não é uma síntese gerada.
- Destinos principais explícitos recebem visibilidade por política documental solicitada pelo
  operador. Permanecem `machine-proposed`, com auditoria pendente, não revisão humana simulada.
- Referências encontradas no corpo são metadados tipados de comparação/menção. Não entram em
  `additionalPassages` nem publicam o comentário em cada versículo mencionado.

## Alcances

Marcadores podem representar versículo, intervalo, perícope entre capítulos ou capítulo explícito.
Uma perícope guarda o endereço principal e intervalos adicionais resolvidos pelos limites
canônicos; não produz notas individuais inventadas. Um comentário de capítulo não conta como
cobertura individual de todos os versos e respeita o comportamento existente do leitor.

Endereços são abstrações de obra em `scriptorium-bcv-1`, não igualdade universal entre edições.
Limites da Bíblia Livre fornecem validação estrutural dos 66 livros usados nesses perfis. Isso não
constitui um crosswalk documental novo para LXX, MT, outras tradições ou qualquer PDF arbitrário.

## Falhas conservadoras

Migration **024** permite que unidades distintas reutilizem o mesmo intervalo físico, mantendo
unicidade por unidade, todas as linhas existentes, índice de página e FKs. A unicidade global
anterior impedia importar uma nota multi-página quando um fragmento já pertencia a uma unidade
antiga. Não se apagam unidades anteriores para resolver a colisão.

O importador offline aceita schema 23 e aplica 024 **depois do backup**; Native e WASM também
recebem a migration canônica. Ela normaliza somente rótulos de capítulo gerados pelo extrator
inicial, ainda não revisados, sem mudar texto/âncoras ou notas editoriais anteriores. As mudanças
de payload permanecem no Rastro. Atualize código e imagem Docker antes de abrir o acervo migrado;
binários antigos devem recusar a versão nova.

Rollback seguro: restaurar o snapshot completo anterior com todos os runtimes parados. Não
recrie a unicidade global se já houver evidência compartilhada, pois isso perderia relações.
Não há downgrade automático. As migrations são transacionais e testadas sobre spans existentes.

São separadas como exceções: destino inválido, lista não contígua ambígua, regressão de capítulo,
possível nota incompleta, fragmento curto/demasiado longo, referência sem explicação e intervalo
que não possa ser resolvido. Nenhuma referência corrompida é corrigida silenciosamente.

Texto de introdução/esboço não se torna comentário apenas por mencionar versículos. Cabeçalhos
faltantes bloqueiam a importação do diretório inteiro. Uma edição com texto bíblico, notas e
colunas misturados precisa de outro perfil calibrado: o extrator atual recusa layout desconhecido.
Não há recuperação de OCR nesta ferramenta; preserve o pipeline de OCR existente.

## Operação privada

Pare Vite, Docker e outros importadores que usam a pasta. O escritor adquire `WorkspaceLock`;
não use remoção de lock como forma de contornar um processo vivo.

Na raiz do projeto:

```powershell
npx tsx scripts/content/export-commentary-source.ts data/workspace/workspace.sqlite3 <sha256> data/workspace/fonte-snapshot.json
npx tsx scripts/content/audit-commentary-workspace.ts data/workspace/workspace.sqlite3 data/workspace/baseline.json capture
```

Na pasta `services/semantic-engine`, com Python 3.11–3.13, Pydantic e o extra opcional
`commentary` (`pypdf>=6.12,<7`) instalado:

```powershell
py -3.13 -m app.commentary_cli ../../data/workspace/fonte-snapshot.json profiles/genebra-notes-only.json ../../data/workspace/lotes --pdf ../../data/workspace/documents/<sha256>.pdf
```

O argumento `--pdf` é obrigatório no perfil `bold-font`. O cache de fontes é derivado e privado,
verificado pelo checksum do PDF; não muda o arquivo original. O outro perfil disponível é
`profiles/shedd-notes-only.json`. Não aplique os perfis a outras edições: checksums são exigidos.

Após conferir relatório, estrutura e amostras, na raiz:

```powershell
npm run content:import:contextual -- data/workspace/workspace.sqlite3 data/workspace/lotes --runtime-stopped
npx tsx scripts/content/audit-commentary-workspace.ts data/workspace/workspace.sqlite3 data/workspace/baseline.json verify
```

O diretório deve conter `report.json` com a lista e SHA-256 dos lotes. O importador valida o
manifesto, cria **um backup SQLite consistente** e importa cada lote em transação independente.
Cache nativo de 64 MiB e checkpoint final reduzem I/O no processamento em massa, sem reduzir a
durabilidade `synchronous`. Recibo por lote permite acompanhar; a fonte de verdade continua SQLite.

Reexecutar é idempotente: lotes já incorporados são reutilizados, sem sobrescrever análises ou
decisões humanas. Não há transação única para o diretório inteiro: uma falha preserva os lotes
completos; corrigir a exceção e retomar, sem restaurar automaticamente por cima de alterações.

Snapshots, pacotes, recibos, relatórios, caches e backups ficam sob `data/workspace`, ignorados
por Git/Docker. Nenhum texto privado entra nos fixtures públicos ou nos pacotes redistribuíveis.
Os testes usam somente material sintético.

## Evidência e limites do relatório

O relatório informa páginas percorridas, cabeçalhos, notas por livro, exclusões de spans protegidos
e motivos de exceção. Percorrer uma página não equivale a lê-la intelectualmente nem garante
recuperar todas as suas notas. Não foi medida precisão/recall estatística do extrator.

O auditor compara hashes de documentos, unidades anteriores e propostas/revisões editoriais,
executa `quick_check` e `foreign_key_check` e conta os novos comentários por fonte/livro/alcance.
Endereços únicos incluem versos abrangidos por intervalos; não são comentários individuais.

Os comentários aparecem no leitor com rótulo de original, página e link sublinhado. O Rastro
explica o marcador/contexto e distingue comparações de menções. Notas anteriormente incorporadas
permanecem; não se reconstrói o documento para adicionar esses comentários.

A consulta por capítulo separa o orçamento de comentários contextuais (até 2.000) das referências
gerais (até 200), evitando que o antigo teto global de 200 esconda notas de capítulos longos.
Esses limites são de carregamento do leitor, não relatório integral de cobertura; bibliotecas com
muitas fontes simultâneas ainda precisarão de paginação/filtros no repositório.

Ainda exigem trabalho próprio: outros layouts/fontes, notas ambíguas e OCR, qualidade linguística
da edição digital Genebra, referências implícitas, extração de monografias e validação editorial
das interpretações. Os perfis não são um motor universal de compreensão de livros.

## Especialistas Wesley e Novo Comentário Bíblico do AT

Os perfis `wesley-outline.json` e `novo-at-serif.json` são vinculados aos respectivos SHA-256,
sem reaproveitar cegamente o parser notes-only. A versão `structured-commentary-v1` reutiliza o
mesmo snapshot e o mesmo importador/serviço canônico; não introduz outro banco.

`scripts/content/export-commentary-layout.ts` lê o PDF original com PDF.js, verifica checksum e
alinha cada item aos offsets UTF-16 do texto já importado. Registra fonte genérica, posição,
altura e hash por página. Nenhuma página existente é reextraída/substituída no banco. Página
desalinhada é recusada. Geometria não autoriza alterar o texto-fonte.

- **Wesley:** outline real fornece livro e capítulo; recuo das notas separa os marcadores do NT
  das listas internas. Cabeçalhos, rodapés, índices e introduções ficam fora. No AT, a numeração
  interna não é promovida a versículos: trechos originais são ligados ao capítulo, com tamanho
  limitado. São consultáveis no contexto/inspector, não repetidos abaixo de cada verso.
- Outlines desta edição têm erros: capítulos intermediários de Provérbios aparecem colapsados
  no capítulo X, e há divergências entre título de seção e capítulo pai. Esses segmentos ficam
  como exceções; nenhum destino é corrigido por adivinhação.
- **Novo Comentário AT:** cabeçalhos dos 39 livros e marcadores principais `capítulo.versículo`
  seguidos de travessão/hífen fornecem o destino. Geometria e predominância serifada da linha
  separam comentários dos quadros sans-serif. Versaletes e palavras gregas em outra fonte na
  mesma linha são preservados: filtrar só um tamanho/família de fonte mutilaria a explicação.
- Marcadores corrompidos também encerram a nota anterior e geram exceção, em vez de fazer a nota
  seguinte vazar para um versículo errado. Listas não contíguas não viram intervalos inventados.
- O inglês do Wesley permanece original; não é uma nova tradução portuguesa. O tradutor local
  existente e a revisão de traduções mantêm suas próprias limitações.

Exemplo, com caminhos privados e runtimes parados:

```powershell
npx tsx scripts/content/export-commentary-layout.ts <snapshot.json> <original.pdf> <layout.json>
# Em services/semantic-engine:
py -3.13 -m app.commentary_cli <snapshot.json> profiles/wesley-outline.json <lotes> --pdf <original.pdf> --layout <layout.json>
# Ou profiles/novo-at-serif.json, com --layout.
# Na raiz:
npm run content:import:contextual -- data/workspace/workspace.sqlite3 <lotes> --runtime-stopped
```

As novas associações permanecem `machine-proposed`, com evidência literal e auditoria pendente.
Testes sintéticos cobrem listas internas, fontes, versaletes, Unicode, marcadores danificados,
perícopes, conflitos e lacunas de outline. Calibração/amostragem não equivale a revisão humana
integral ou medição estatística de precisão/recall.

## Recuperação conservadora de exceções existentes

`export-commentary-source ... --protect-all-contextual` protege spans de todas as análises
contextuais existentes, inclusive quando a análise reutilizou uma unidade genérica. Usa relação
real entre proposta e unidade, não apenas o método da unidade. Assim, uma execução de recuperação
não recria, reinterpreta nem substitui comentários ou revisões já incorporados.

O parser notes-only agora reconhece listas **explicitamente consecutivas**, como `3:15,16,17`,
como o intervalo 15-17, preservando a notação original. `3:15,17` continua em exceção: não inventa
o versículo 16 nem usa menções no corpo para preencher lacunas. Regressões de capítulo permanecem
bloqueadas. Essa recuperação não resolve referências corrompidas, notas incompletas ou remissões
sem explicação; esses casos não são aprovados em massa.

`scripts/content/verify-contextual-reading.ts` verifica um diretório importado com o serviço
canônico e adapter estritamente **somente leitura**. Recusa qualquer lote que ainda exigiria uma
escrita, verifica SHA-256 de cada arquivo e registra quantas notas seriam reutilizadas, sem
criar outro backup ou alterar o workspace.
