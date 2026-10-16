# Extração de comentários originais de Bíblias de estudo

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
