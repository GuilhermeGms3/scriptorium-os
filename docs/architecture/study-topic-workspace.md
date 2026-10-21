# Estudos a partir do acervo

## Ampliação de 21/10/2026

- **Estudar com vídeo ao lado** mantém Conteúdo/Leituras abertos e oferece um painel opcional.
  Em telas menores ele fica abaixo do conteúdo. Recolher o painel desmonta o iframe, interrompendo
  a reprodução; a escolha permanece na tela até sair do tema. Sem chave, pode-se fornecer um link
  HTTPS do YouTube. Os hosts e o ID são validados; nomes/canais não são inventados como metadados
  consultados. A busca automática continua exigindo a chave da API. Não há vídeos acadêmicos
  pré-curados nem garantia de disponibilidade/reprodução de cada vídeo externo.
- Leituras selecionadas: **19 localizadores de edição/página conferidos**, sendo 12 da Suma e
  sete de Agostinho, Institutas, hermenêutica e Augsburgo. Só aparecem quando a edição e o hash do
  texto extraído coincidem. Isso é curadoria de partida, não leitura integral dessas obras.
- Treze capítulos editoriais novos introduzem documentos/recepção conciliar, os sete primeiros
  concílios, comparação luterana/reformada, ortodoxias, cruzadas, crítica das fontes cátaras e início
  do islã. Entram nos guias explicitamente correspondentes; a abertura específica de cada entidade
  foi preservada. O guia patrístico não recebe silenciosamente as guerras medievais.
- Referências externas identificam suas perspectivas. Não foram instaladas atas completas nem
  transcrições de discursos; os credos anteriormente instalados continuam na Biblioteca. A série
  católica de 21 concílios e uma história extensa das campanhas albigenses ainda não foram produzidas.
- A leitura original oferece tradução auxiliar quando a língua é inglês e o serviço está disponível.
  Notas e marcações utilizam o [editor compartilhado](study-notebook.md). O suporte atual não traduz
  espanhol, grego, hebraico ou copta por meio do modelo inglês→português.

Validação e pendências operacionais desta ampliação:
[relato de integração desktop](../content/desktop-study-context-2026-10-21.md).

A árvore abre espaços de investigação com **Conteúdo, Percurso, Leituras, Conexões, Caderno e Vídeos**.
**Conteúdo** é a entrada inicial: explica o assunto antes de propor uma investigação.
O ambiente usa os mesmos temas, fontes e componentes da leitura. Os núcleos apresentam até oito
temas por página num diagrama, com filtro e navegação; não exibem todo o catálogo em uma lista.

O percurso usa a direção visual **Biblioteca celeste**, escolhida pelo usuário: bronze envelhecido,
pergaminho e gravuras astronômicas. A imagem em `public/images/study-celestial-library.png` é arte
decorativa gerada com Image Gen, sem textos ou controles, e não representa dados nem um mapa científico.
Ela ocupa o cabeçalho e o rodapé com máscaras independentes, mantendo o corpo da leitura livre.
No ambiente branco, recebe tratamento de gravura; Preto, Cinza e Marrom preservam seus contrastes.

As etapas conectadas formam uma linha horizontal. A mesa aberta de estudo dispõe orientação e
fontes à esquerda, pergunta e escrita à direita, separadas por um eixo com estrela. Em telas estreitas,
as áreas ficam empilhadas e a linha de etapas mantém rolagem horizontal contida. Rótulos, numeração,
peso e espaço diferenciam as funções, sem os acentos verdes/lilás da versão anterior. O esclarecimento
editorial fica no detalhe **Sobre este percurso**, preservando seu texto.

Títulos, orientação e perguntas usam Manrope, sem serifa nem itálico; referências usam IBM Plex Mono.
Apenas a Escritura conserva seu corpo próprio de leitura. Manrope é carregada pelo provedor de fontes
já usado no projeto, com fallback para a sans-serif do sistema; não altera a fonte das demais telas.

## Percurso acadêmico desenvolvido

O piloto **Gênesis 1: texto, contexto e interpretações** está em `/study/course/genesis-1`.
São seis módulos e doze aulas, com avanço salvo, leituras bíblicas completas e unidades reais do
acervo. As seis áreas acompanham a etapa. A árvore e os conteúdos introdutórios existentes são
preservados. Ver [contrato do percurso](academic-study-course.md) para fontes, limites e migration028.

## De onde vêm os dados

### Conteúdo para aprender

`src/lib/content/study-lessons` contém textos explicativos originais em português: introduções
específicas para as 95 entidades atuais e capítulos de aprofundamento correspondentes aos 16 guias.
O catálogo usa correspondências explícitas por ID, com contexto, conceitos, diferenças de posição e
exemplos de leitura. Não utiliza perguntas do roteiro como substituto de explicação.

O material é carregado sob demanda, funciona sem chave de API e não depende de livros importados.
Não é um curso exaustivo nem uma transcrição das referências: é conteúdo editorial, com bibliografia
por capítulo e identificação das perspectivas confessionais e acadêmicas. A bibliografia abre os
sites originais; não há scraping, cópia remota nem geração por LLM durante a navegação. Novas
entidades pessoais sem lição cadastrada mostram essa ausência e suas fontes reais, sem receber
silenciosamente o texto de outro assunto.

Uma leitura fica aberta por vez, com seletor de capítulo e anterior/próximo. A seção recolhida
**Continuar nos meus livros e nas fontes do acervo** oferece as mesmas fontes de **Leituras**, dentro
do conteúdo. Para cada resultado com âncora, `loadTopicReadingText` consulta a unidade original ou
a página física completa (`page - 1` no repositório). Não promove snippets da busca a texto integral.
Erros, páginas sem extração e indicações sem unidade são identificados; o leitor contextual e a
captura de notas continuam disponíveis. A árvore e a ambientação Biblioteca celeste permanecem.

| Informação         | Origem                                                                 | O que ela permite afirmar                                                                            |
| ------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Temas e afirmações | `KnowledgeQueryService`, SQLite de conhecimento                        | O registro já existe no catálogo; seu estado de revisão continua explícito.                          |
| Percurso           | `StudyGuide` e correspondências explícitas em `study-topic-service.ts` | É orientação editorial de estudo, não uma citação da fonte nem progresso medido.                     |
| Texto bíblico      | `ScriptureKnowledgeEngine` e edição instalada                          | A abertura do capítulo mostra os três primeiros versículos com a edição identificada.                |
| Obras de partida   | Indicações do catálogo, conferidas nas obras instaladas                | A obra pode ser aberta; sem unidade indicada não se inventa um trecho específico.                    |
| Trechos em obras   | FTS dos pacotes públicos                                               | São ocorrências de busca, com unidade e idioma. Não constituem confirmação doutrinária.              |
| Páginas privadas   | FTS de `PrivateDocumentRepository`                                     | O trecho mantém documento e página física; o rótulo editorial da página é apresentado separadamente. |
| Notas e grupos     | `StudyRepository` e `StudyNotebookRepository`                          | São observações e associações pessoais, mantidas no workspace existente.                             |
| Vídeos             | YouTube Data API v3, após ação explícita                               | São resultados externos, sem revisão acadêmica atribuída pelo Scriptorium.                           |

Não há conteúdo demonstrativo de fallback nem trechos inventados atribuídos às fontes do acervo.
Uma busca vazia ou uma fonte indisponível aparece como tal, preservando os demais materiais.

## Percorrer, ler e registrar

1. Abra um ramo e um núcleo da árvore. Cada círculo menor abre um tema real do catálogo.
2. No tema, leia **Conteúdo** por capítulo. Em **Percurso**, acompanhe uma etapa por vez. As perguntas podem ser guardadas na
   investigação ou usadas para abrir um rascunho de nota, sem salvar uma conclusão automaticamente.
3. Em **Leituras**, escolha a origem e uma leitura. O corpo mostra um texto por vez, com anterior,
   próxima e seletor. O corpo carrega a página/unidade inteira, com a origem preservada.
4. **Ler o contexto e anotar** reutiliza a janela de fontes. A nota guarda a unidade/página original,
   o tema atual e o grupo escolhido. Reabrir a fonte pela nota conserva esse contexto.
5. Em **Caderno**, crie um grupo para o tema ou associe um grupo existente. A associação usa um
   `StudyItem` do tipo conceito: o ID da entidade ou `study-guide:<id>`. Não há outro banco ou schema.
6. As notas guardam `NoteLink` para o tema e mostram o caminho de volta. O editor já existente
   continua responsável por cor, atualização, origem, conexão e desconexão de notas.

O caderno permanece montado ao trocar as abas do tema, preservando rascunhos. Trocar de grupo,
abrir outro rascunho ou sair com alterações não salvas mantém as proteções de descarte existentes.
O modo contextual limita o mapa inicial a 12 notas; selecionar uma mostra sua vizinhança.
Todas continuam acessíveis pelo seletor e pelo filtro, sem criar cópias das notas.

Uma nota ligada diretamente a um tema não torna automaticamente todas as notas de seu grupo
pertinentes a esse tema. A expansão para o grupo inteiro exige a associação explícita do grupo.

## Conexões

`buildTopicGraph` aceita somente relações registradas no catálogo, campos de parentesco da
ontologia, percursos editoriais existentes, vínculos pessoais e arestas de `note_connections`.
Coincidência de palavras em título ou corpo de nota não cria arestas.

Linhas contínuas distinguem relações do catálogo e percursos editoriais pelos seus rótulos;
pontilhadas representam associações pessoais. O detalhe **Por que estas conexões aparecem?**
expõe cada vínculo. Afirmações, argumentos, evidências e estado de revisão continuam disponíveis
em um detalhe recolhido, em vez de ocupar a tela inteira inicialmente.

A rede mostra dez vizinhos por página e até 48 notas por tema, com indicação do restante no
caderno. Paginação visual não implica remoção de notas ou conexões persistidas.

## Busca e falhas parciais

- Até três termos por tema; os roteiros possuem equivalentes explícitos de termos em inglês para
  consultar as obras históricas instaladas. Não se enviam esses termos a serviços remotos.
- Catálogo, busca pública, busca privada e evidência são consultados em paralelo com falhas isoladas.
- São apresentados até oito materiais por origem, com deduplicação por unidade ou página.
- Unidades marcadas `isDemo` são excluídas. O texto do acervo privado não é promovido a corpus público.
- O estado de importação, revisão e direitos existente não é modificado por abrir um tema.

## YouTube

Em **Vídeos → Conectar minha API do YouTube**, informe uma chave de navegador restrita à
**YouTube Data API v3** e aos referenciadores HTTP da instalação, por exemplo
`http://127.0.0.1:5173/*`. A própria tela mostra a origem atual. Ative a API no
[Google Cloud](https://console.cloud.google.com/apis/library/youtube.googleapis.com).

A chave é mantida somente na memória da aba e enviada ao Google no header `X-Goog-Api-Key`,
sem aparecer na URL, nos bancos, no localStorage, nos backups ou no código versionado.
Navegação interna conserva a configuração; recarregar exige informá-la novamente. **Desconectar**
remove a chave, os resultados e o cache da sessão.

A busca acontece somente ao pressionar **Buscar no YouTube**, com até seis resultados, preferência
por português, `type=video`, `videoEmbeddable=true` e busca segura moderada. O Google recebe somente
os termos que a tela mostra. Notas, páginas e textos privados não integram a requisição.

Resultados têm validação estrutural, IDs permitidos, timeout de 15 segundos e cache em memória
de 15 minutos/20 consultas. Trocar a chave invalida respostas em trânsito. Falhas de cota, chave,
conexão ou resposta inválida não exibem payloads brutos do provedor. Não há retries automáticos.

Miniaturas aparecem depois da busca; o player `youtube-nocookie.com` só carrega após escolher
um vídeo. Ele mantém a identificação de origem exigida pelo YouTube. **Anotar sobre este vídeo**
abre um rascunho com título, canal e URL, que o usuário precisa salvar explicitamente.

Referências de implementação:
[search.list](https://developers.google.com/youtube/v3/docs/search/list),
[uso de chaves por header](https://docs.cloud.google.com/docs/authentication/api-keys-use),
[identificação do player](https://developers.google.com/youtube/terms/required-minimum-functionality).

A validação com uma chave real e reprodução de resultados reais depende da configuração do
proprietário. Os testes automatizados simulam respostas do provedor somente no ambiente de teste;
o produto não possui vídeos fictícios ou uma resposta simulada quando falta a chave.

## Operação

O acervo continua sendo o workspace já configurado. Não há ingestão, reprocessamento ou nova
migração nesta entrega. A migração 026 do caderno é pré-requisito da instalação, com seu mecanismo
de backup já documentado em [study-notebook.md](study-notebook.md).

Não remova um lock para visualizar os livros. Se outro runtime detém o acervo ou uma migração
anterior foi interrompida, conclua a recuperação conforme a documentação da instalação, com todos
os escritores parados. A prévia isolada continua útil para o QA sem alterar os documentos privados.

## Validação desta entrega

- `npm run typecheck`, `npm run lint` e `npm run build` executados com sucesso.
- `npx vitest run --testTimeout=60000`: 65 arquivos, 437 testes aprovados.
- Playwright em 1536×1024 e 390×844: navegação de temas e etapas, leitura de fontes e Escrituras,
  nota com unidade original, conexão entre notas, persistência após reload e ausência de overflow
  global. Os rascunhos permanecem entre abas e impedem descarte por navegação sem confirmação.
- Respostas controladas do YouTube conferiram sucesso, falha de cota, carregamento do player
  somente sob ação e rascunho com URL. Não substituem teste com chave e reprodução reais.
- O acervo original foi consultado somente em leitura; o QA de escrita usou um workspace OPFS
  isolado. Lock Linux e journal de backup preexistentes foram preservados. O Docker indisponível
  impediu validar o fluxo completo da instalação com seus livros privados no navegador.
