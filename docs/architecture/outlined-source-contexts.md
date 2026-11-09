# Comentário intertextual, homilias e manuais

O especialista offline `app.outlined_sources` reutiliza os lotes canônicos de leitura
contextual. Não cria outro banco, não chama LLM e não altera os PDFs. Perfis são presos
ao SHA-256 da edição; um arquivo diferente exige calibração própria.

## Tipos de ligação

- **Beale/Carson:** destinos do sumário PDF são lemas primários. Capítulos e limites
  são conferidos no catálogo canônico exportado. Referências internas do AT permanecem
  menções/comparações secundárias, não viram automaticamente comentários no AT.
  Intervalos explícitos entre capítulos conservam os dois extremos; vírgulas não preenchem
  lacunas. Marcadores corrompidos não são corrigidos por adivinhação.
- **Crisóstomo/Mateus:** o lema de abertura indicado no sumário é o destino, não o número
  da homilia. Texto principal de 11 pontos e caracteres menores na mesma linha são
  selecionados pela geometria; notas editoriais menores e índices não são a exposição.
  A ligação ao lema não afirma que todos os versículos da homilia foram identificados.
- **MacArthur:** introduções e seções de cada livro mantêm alcance **de livro**. Não são
  distribuídas sob todos os versos. Samuel, Reis e Crônicas tratam os pares conjuntamente.
  Os três recortes contextuais anteriores são preservados; somente o restante de suas
  páginas pode receber novas unidades.

Cabeçalhos inválidos continuam delimitando o trecho anterior. Posições precisam coincidir
com texto e geometria da página, evitando incluir a última frase da seção precedente.
Páginas adjacentes quase idênticas do Beale são registradas como duplicação, sem apagar
nenhum original. Fragmento curto, ambíguo ou fora do limite fica em exceção.

## Mapas e painel direito

`analysis.sourceVisual` contém página física, tipo e legenda literal, **não URL externa**.
O especialista confere que há imagem naquela página do PDF. O importador exige que a
legenda esteja no trecho citado, na mesma página e fonte. Isso protege a rastreabilidade;
não equivale à revisão acadêmica da identificação do mapa.

O painel da passagem consulta o serviço relacional existente, exclui detecções pendentes e
mostra contextos publicados de história/geografia/arqueologia. Contextos de livro são
rotulados como gerais, não exclusivos do capítulo. Mapas vêm primeiro; os demais trechos
ficam sob divulgação progressiva. Ao expandir um mapa, a página original aparece junto
do texto da fonte e do link sublinhado para a página/unidade destacada.

`GET /api/workspace/covers/<sha256>?page=<1..9999>` estende o endpoint local existente.
Exige mesma origem, header de intenção e sessão; confere documento instalado e limite
real de páginas. Usa Poppler com argumentos separados, fila serial, timeout de 30 s e
cache privado `page-previews/`, com gravação temporária e renomeação atômica. Sem `page`,
a capa antiga continua idêntica. Nenhum PDF é carregado pelo SSR ou para mostrar um
cartão recolhido. Sem instalação/Poppler, a interface informa indisponibilidade e mantém
o link da fonte; não muda para outro workspace nem inventa imagem.

Nesta calibração, três mapas do MacArthur foram selecionados: páginas físicas **36, 81 e
407**. São mapas, não fotografias de escavações. Outras imagens do acervo ainda precisam
de identificação e vínculo documental; não são classificadas como arqueologia em massa.

## Operação

Exporte snapshot com `--protect-all-contextual` e geometria pelo exportador já existente.
No diretório `services/semantic-engine`:

```powershell
py -3.13 -m app.outlined_sources <snapshot.json> <layout.json> <original.pdf> profiles/beale-intertextual.json <staging-novo>
```

Perfis adicionais: `chrysostom-matthew.json` e `macarthur-handbook.json`. Depois, na raiz,
reúna os staging dirs com `scripts/content/combine-contextual-batches.ts` e execute o
importador canônico **com todos os escritores parados**, backup e lock. Audite o baseline
e use `verify-contextual-reading.ts` para verificar idempotência sem escrever novamente.
PDFs, snapshots, relatórios detalhados e lotes ficam em `data/workspace`, fora do Git.

Os vínculos permanecem machine-proposed/machine-visible, com auditoria pendente. Nenhum
teste estrutural transforma isso em revisão humana integral ou certificação teológica.
As homilias continuam em inglês; o tradutor existente é opcional e não foi substituído.

## Incorporação executada em 17/10/2026

| Fonte             | Trechos | Seções com destino resolvido | Limite                                                      |
| ----------------- | ------: | ---------------------------: | ----------------------------------------------------------- |
| Beale/Carson      |     391 |                          120 | 410 marcadores sem lema resolvido; 27 páginas duplicadas    |
| Crisóstomo/Mateus |     521 |                           85 | 424 iniciais + 97 recuperados; homilia inicial sem lema     |
| MacArthur         |     502 |      63 conjuntos, 66 livros | Contextos de livro; três mapas, não cobertura verso a verso |

Foram gravados **1.414 vínculos novos**, em 16 lotes, no workspace existente. Os 57 documentos,
89.231 unidades anteriores não geradas por esse especialista e 232 propostas editoriais/revisões
do baseline foram preservados. `quick_check` e foreign keys passaram. A verificação read-only
reutilizou os 1.414 vínculos e não escreveu nenhum novo; recibos e dois backups SQLite consistentes
ficam na pasta privada, não no Git.

A amostragem encontrou folios/cabeçalhos correntes de 11 pontos nas homilias. Eles faziam blocos
válidos cair na validação de tamanho. A seleção agora exclui as margens (91,2/737,8 pontos) e
preserva os caracteres menores na linha do corpo. Um snapshot com proteção de todas as associações
existentes permitiu acrescentar somente os intervalos ainda ausentes: 97 trechos, sem substituir
os 424 iniciais. As citações reunidas abrangem 895 páginas físicas da exposição; introduções,
índices e notas editoriais continuam separados. Isso não significa mapear cada verso tratado
implicitamente pela homilia, nem limpar retroativamente todos os cabeçalhos do lote inicial.

O Beale cobre 419 páginas citadas em 11 livros do NT neste lote. Os 410 marcadores ainda não
resolvidos continuam no relatório de exceções; não se anuncia integração integral das 1.495
páginas com texto. MacArthur possui 465 páginas citadas, em contextos gerais dos 66 livros.
Contagem de trechos não é contagem de versos exclusivos. A cobertura global de comentários,
excluindo texto-prova e contexto de livro/capítulo, chegou a 30.559 endereços com intervalos.

## Verificação

- 397 testes TypeScript/55 arquivos e 81 Python passaram; typecheck, lint, build Node,
  Ruff e mypy strict passaram. Nenhuma migration nova: os campos JSON são opcionais e validados.
- Uma execução concorrente com a reconstrução do índice público falhou no checksum transitório;
  a suíte foi repetida **depois** do build e passou integralmente. Não foi desativada validação
  de checksum para esconder a disputa entre ferramentas de desenvolvimento.
- QA de produção em `http://127.0.0.1:5173`, 1440×1000 e 390×844, com Playwright porque o
  Browser plugin não estava disponível. Identidade, tela não vazia, ausência de overlay e
  console sem erros de aplicação conferidos.
- Josué 11: zero requests de prévia antes de expandir; depois, somente a página 81, PNG
  773×1000. Fonte abre página/unidade e destaca o texto. Filtros em Mateus mostram Crisóstomo
  (incluindo recuperação da p.37) e Beale; Êxodo não mostra o mapa de Josué.
- No móvel, selecionar um versículo abre o painel existente; mapa e texto carregam, sem overflow
  global. Enter recolhe o item e desmonta a imagem. O cabeçalho móvel anterior continua estreito;
  não houve redesenho fora do escopo. Uma tentativa de QA usou o botão desktop oculto no móvel;
  o teste foi retomado pelo fluxo real de seleção do versículo.
- O preview de QA foi encerrado e o lock liberado. Docker/tradutor não foram reconstruídos ou
  certificados nesta entrega; o target Cloudflare/Lovable e os arquivos de produção não mudaram.
