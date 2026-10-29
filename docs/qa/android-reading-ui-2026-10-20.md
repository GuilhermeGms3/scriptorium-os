# Android 0.4.0 — ajustes do leitor e aulas

## Escopo entregue

Uma experiência de leitura, sem perfis culto/estudo. Sem reexportação de livros, migration,
alteração do banco canônico ou redução de comentários. Árvore e identidade do produto mantidas.

- Botão flutuante retirado; Home junto ao título, Painel junto a Home somente com passagem aberta.
- Selo bronze menor; fundo do versículo sem bloco marrom. Fonte e tamanho configuráveis.
- Fontes recolhidas exibem só nome e expansão; cartão abre a fonte. Biblioteca no topo da janela.
  Detalhes técnicos retirados da interface; Rastro permanece recolhível. Proveniência no banco intacta.
- Filtros visíveis na leitura em linha ou dentro do painel inferior opcional, agrupado por versículo.
  A coleção é compartilhada; endereços explícitos com obra/livro/esquema preservados.
- Quatro temas e três famílias nativas, tamanho18–32, prévia e animação configurável em Mais.
  Preferências locais; não são sincronização nem parte do backup pessoal de notas.
- Contextos/fontes em cartões com cores de origem e hierarquia de títulos. Mais contextos permite
  continuar a coleção, em vez de encerrar em20. Construção de seções em cascata e transição de módulo.
- Catálogo de aulas horizontal por família/pesquisa; conteúdo, leituras e síntese. Marcação de leitura
  salva em course_progress com namespace lesson, sem alterar critérios do curso acadêmico.
- Metadados públicos de aulas/vínculos gerados do catálogo editorial desktop, sem trechos privados
  no APK. Obras instaladas são abertas por ID exato; pesquisa FTS de trechos privados é identificada
  como pesquisa (até12 resultados), com página real. Nenhum resultado é apresentado como curadoria.

## Verificação de dados e código

- Gradle: assembleDebug, assembleDebugAndroidTest, testDebugUnitTest, lintDebug.
- 45 testes JVM passaram: instalador, referências, políticas, sequência e filtros/agrupamento.
- Typecheck e ESLint do projeto passaram. Vitest scripts/mobile: 8 testes/2 arquivos passaram.
- Lint Android sem erros, 22 avisos de versões/KTX/armazenamento/estilo existentes ou equivalentes.
- Seis testes instrumentados de dados passaram em 8,097s: migração pessoal, backup/links, seed,
  seleção de notas, referências/textos antigos e leituras reais da aula com conservação de comentários.
- Gênesis 1: 467 comentários no capítulo (incluindo contexto de livro) conservados integralmente no
  agrupamento. Trindade: 14 leituras reais, entre obras editoriais instaladas e páginas de pesquisa.
- Instalação incremental em AVD privado API37/porta5560. Banco pessoal antes/depois do install:
  `6deb3ca8aeb7b4a0e3b1c445337f0e90592d654c4636e108042be54597b042e2`.
  Testes de progresso gravam somente no banco pessoal desse emulador, nunca no telefone do usuário.

- Cobertura das111 aulas passou em22,758s:103 com leitura editorial/resultado específico e8
  com apoio à área identificado como tal. O apoio vem da trilha que compartilha os capítulos
  editoriais; os termos e obras são os dos guias existentes, sem atribuir correspondência exata.
- Quatro cenários de interface passaram juntos em80,679s: leitor compacto/cartões/filtros/fonte,
  persistência de fonte/tamanho/tema/dock e reabertura no versículo105, aula→Biblioteca→retorno
  com etapa lida, e curso de14 etapas preservando rascunho e critérios de conclusão.
- Conferência visual de Preto/Cinza/Marrom/Claro, fontes recolhidas e área inferior. Leitura
  em Claro conferida após estabilização do quadro, com números105/106 integrais. Capturas
  temporárias privadas fora do Git; não houve teste em telefone físico nem API28 nesta versão.
- Acervo ativo manteve b289f600.../3.637.896KiB. Nenhuma cópia adicional dos livros foi importada.

Nas primeiras tentativas, o driver da aula selecionou o texto do campo de pesquisa em vez
do cartão e ultrapassou um cabeçalho com swipe. Seleção corrigida para Abrir aula e rolagem
acessível, conservando as verificações de livro real, retorno e progresso. Asserções não foram removidas.

As animações usam APIs nativas de Compose, mantendo a escala de duração do Android:
[documentação de AnimationSpec](https://developer.android.com/develop/ui/compose/animation/customize).

## Limites

Fontes disponíveis são famílias nativas; PDFs originais mantêm a tipografia do próprio arquivo.
Leituras encontradas por palavras precisam ser conferidas no contexto; não são associações
editoriais novas nem revisão acadêmica. Fonte sem página exportada informa a ausência.
Marcação de etapa lida é autorrelato; conclusão dos módulos acadêmicos mantém CoursePolicy.
Sem alteração do provedor de tradução, instalação de acervo ou sincronização com desktop.

## Entrega

APK0.4.0/versionCode6: 183.779.663 bytes. SHA256
`68a9576c286a810127fb4997e276c58aed6652736fdb57ebd87895b21f36b13e`.
Pasta privada `C:/Users/comical/Desktop/Scriptorium-Android-0.4.0/` com APK, instruções e hash.
Sem PDF/SQLite nos assets e sem outro ZIP do acervo. Instalar por cima, sem desinstalar.
