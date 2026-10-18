# Estudos a partir do acervo

A árvore abre espaços de investigação com **Percurso, Leituras, Conexões, Caderno e Vídeos**.
O ambiente usa os mesmos temas, fontes e componentes da leitura. Os núcleos apresentam até oito
temas por página num diagrama, com filtro e navegação; não exibem todo o catálogo em uma lista.

O percurso tem uma linha horizontal de etapas conectadas. Em desktop, a mesa de estudo dispõe
orientação e fontes à esquerda, pergunta e escrita à direita. Em telas estreitas, essas áreas
ficam empilhadas e a linha de etapas mantém a rolagem horizontal contida. Dourado identifica
orientação, verde identifica fontes e lilás identifica investigação, com contraste adaptado aos
ambientes Branco, Preto, Cinza e Marrom. Rótulos e ícones acompanham as cores. A interface usa
IBM Plex Sans para instruções, Source Serif 4 para leitura/perguntas e IBM Plex Mono para referências;
a pergunta recebe itálico e a Escritura conserva seu próprio corpo de leitura.

## De onde vêm os dados

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

Não há conteúdo demonstrativo de fallback nem sínteses acadêmicas produzidas para preencher lacunas.
Uma busca vazia ou uma fonte indisponível aparece como tal, preservando os demais materiais.

## Percorrer, ler e registrar

1. Abra um ramo e um núcleo da árvore. Cada círculo menor abre um tema real do catálogo.
2. No tema, acompanhe uma etapa do percurso por vez. As perguntas podem ser guardadas na
   investigação ou usadas para abrir um rascunho de nota, sem salvar uma conclusão automaticamente.
3. Em **Leituras**, escolha a origem e uma leitura. O corpo mostra um texto por vez, com anterior,
   próxima e seletor. A prévia limita o trecho a 2.800 caracteres; o original pode ser aberto inteiro.
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
