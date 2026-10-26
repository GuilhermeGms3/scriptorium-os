# Scriptorium Android — leitura nativa e kit completo

## Queda, graça e providência — 0.6.6

Estudos → **Percursos** apresenta 14 módulos/18 aulas: finitude e niilismo,
cinco vias de Tomás, Adão arquetípico, alteridade, queda, Cristo e ressurreição,
Sheol e juízo, graça, providência, calvinismo, luteranismo, anglicanismo, oração
e síntese. São 90 seções em português, com passagens, conceitos-chave,
fundamentação e hipóteses identificadas. A trilha horizontal usa o progresso
existente; os cursos anteriores e a árvore não precisam ser refeitos.

As obras declaradas só aparecem se instaladas; buscas do acervo preservam seu
rótulo e suas fontes. Atualização só do APK, sem reimportação de PDFs. O mesmo
currículo está disponível na web, com progresso independente por dispositivo.
[Escopo, fontes e limites](../docs/content/queda-graca-providencia-2026-10-26.md).

## Conteúdo aprofundado de Estudos — 0.6.4

O APK entrega a ampliação das 95 entidades e dos 16 guias: Análise, Caso de leitura
com vínculos bíblicos quando pertinentes e Minha síntese, mostrando um contexto
por vez. A formação geral de 18 módulos, Conhecer para amar e Gênesis também foram
ampliados. A árvore, a trilha e os identificadores de progresso foram preservados.

O conteúdo editorial novo tem prioridade sobre as aulas antigas do pacote instalado.
**Basta atualizar o APK**, sem reimportar livros ou apagar progresso. O catálogo de
capítulos é deduplicado no asset; as fontes privadas continuam nos serviços existentes.
Não inclui nova curadoria de vídeos nem revisão acadêmica humana de cada parágrafo.
[Escopo e fontes](../docs/content/study-deepening-2026-10-25.md) ·
[Validação](../docs/qa/android-study-depth-2026-10-25.md).

## Conhecer para amar e árvore progressiva — 0.6.3

Estudos conserva a árvore visual e destaca uma próxima descoberta. O primeiro
percurso tem seis módulos e 30 seções, com perguntas, explicações, leituras bíblicas
por intervalo, fontes reais do acervo e síntese pessoal. A trilha horizontal libera
um módulo após o trabalho do anterior; concluir o percurso libera os ramos, e
cada guia concluído abre seus conceitos seguintes. Conclusões anteriores continuam
reconhecidas e disponíveis para revisão. Outros cursos e aulas ficam em
**Explorar outros estudos**, sem bloquear o acesso independente à Bíblia e à Biblioteca.

Atualização somente do APK; sem reimportar livros. O novo currículo está no asset
editorial. Não representa formação acadêmica integral ou avaliação da fé. O novo
percurso ainda não tem consumidor web ou vídeos selecionados. Consulte
[escopo, fontes e progressão](../docs/architecture/knowing-god-discovery.md).

## Leitor de livros e entrada leve — 0.6.2

- Biblioteca abre a estante, com capa real de primeira página em miniatura de240px,
  cache local e metadados. Não consulta o texto das páginas antes de abrir o livro.
- Tocar no livro abre um leitor dedicado: PDF original ajustado à largura, movimento
  por toque e zoom; ou Texto ajustado, com recomposição visual de linhas e fonte/tamanho
  configuráveis. O original e os offsets de citações permanecem intactos.
- Cabeçalho compacto, troca de página no rodapé, salto por página física e retomada
  da última página por livro. Índice, anotação, áudio e tradução ficam em Leitura.
- A aba Leitura/Escrituras abre o catálogo, sem restaurar o capítulo automaticamente.
  Continuar leitura retoma por escolha explícita. Busca, estudos e links diretos continuam
  abrindo a passagem indicada. Livros bíblicos mantêm emblemas leves, sem capas inventadas.
- Atualização somente do APK, sem reimportar acervo ou criar outra cópia dos PDFs.
  Progresso de livro é preferência deste aparelho; capas podem ser regeneradas se o cache
  do Android for limpo. Texto ajustado não corrige OCR nem reconstitui colunas complexas:
  nesses casos, use o PDF original. [Escopo e QA](../docs/qa/android-library-reader-2026-10-25.md).

## Áudio nativo — 0.6.1

Menu → **Áudio** abre Início, Reflexões, Voz e Música/Ambiente. Escrituras, páginas e etapas de estudo
oferecem leitura local e fila; o mini player acompanha a navegação. Media3 mantém a sessão
em segundo plano, com transportes do Android e posição real por segmento. Importe música
pelo seletor do sistema; a cópia privada tem volumes independentes e repetição.

Atualização somente do APK, sem reimportar PDFs nem substituir notas. Os arquivos de áudio,
perfis e histórico pertencem ao dispositivo e não entram automaticamente no backup de notas.
Reflexões permite autoria manual, revisão, rascunho persistente e coleção local, com narração
nativa e ambientação por episódio. **Não inclui ainda voz neural expressiva, gerador de roteiro
por IA, produção cinematográfica, exportação ou sincronização de projetos com o desktop**.
Tradução reconhece localmente trechos sem idioma declarado (modelo embarcado), oferecendo
inglês/espanhol → português. Copta não é suportado; Tomé oferece o início real da tradução
espanhola no volume privado instalado quando identificado. Filtros não tornam todo catálogo
de Nag Hammadi uma tradução instalada. Abrir um volume em Escrituras usa o leitor integral.
Consulte [arquitetura, limites e próximas fases](../docs/architecture/audio-android.md).

## Acervo atualizado — 0.5.3

- Pacotes completos novos incluem recortes documentais temáticos e verbetes delimitados do
  desktop. Estudos consulta a associação explícita do tema, preservando questão, objeção e
  resposta; a leitura abre a página de origem com o intervalo destacado. O léxico oferece
  também o verbete português identificado, com fonte/página e acesso ao original.
- As tabelas opcionais `documentary_readings` e `documentary_topics` são projeções aditivas
  no pacote de consumo v2; não alteram o workspace canônico nem o banco pessoal Android.
  Pacotes anteriores continuam legíveis, apenas sem esses novos resultados.
- Para entregar a outra pessoa sem copiar notas, grupos e progresso do PC, acrescente
  `--without-personal` ao `mobile:export`. Isso não exclui PDFs nem comentários e não apaga
  dados pessoais existentes no telefone. Respeite os direitos das obras ao repassar o kit.
- Snapshot de23/10:57PDFs/47.707páginas,46.083comentários elegíveis,29.216recortes temáticos,
  5.160verbetes e11edições. OCR segue parcial; recortes automáticos não são revisão teológica.

Aplicativo **Kotlin + Jetpack Compose**, sem WebView, para consumir offline o acervo preparado
no PC. Há entrega privada com aplicativo e todos os PDFs no mesmo kit; **não é ainda paridade integral com o desktop**.
O desktop, o pipeline Python e o workspace original não são substituídos.

**Entrega completa com os livros:** siga [kit completo e consumo nativo](../docs/architecture/mobile-consumption.md).
O kit-base reúne 57 PDFs, 47.707 páginas e 10 edições; o complemento 0.5.2 amplia para 11 edições. `npm run mobile:bundle`
gera um ZIP com APK, acervo e instalador USB automático, sem importação livro por livro.
Não use o APK sozinho se deseja levar o acervo. Um APK de ~2 GB causou falha no sistema
de recursos do emulador; por isso os livros vão juntos no kit, não dentro do APK.

## Textos adicionais e títulos em português — 0.5.2

- Apócrifo/Não canônico incluem os livros das coleções adicionais já instaladas, como
  Judite, Macabeus e Daniel Grego. O cânon varia conforme a tradição.
- Metadados abrangem os 85 livros distintos da Bíblia Livre, Bíblia Portuguesa Mundial
  e King James. Referências da busca normal/por sentido e títulos das obras estruturadas
  são apresentados em português; nomes originais, IDs, edição e texto-fonte são preservados.
- Evangelho de Judas tem acesso à seção real encontrada no PDF instalado (em espanhol).
  Tomé tem título em português, com indicação de que a fonte é copta. Não há tradução
  inventada do corpo dos textos.
- O complemento do acervo acrescenta a edição King James já existente no desktop,
  com Susana, Bel e o Dragão, Cântico dos Três Jovens e Adições a Ester como obras separadas.
  Transferência de cerca de 15MB, aproximadamente 140MiB adicionais instalados;
  arquivos antigos são reutilizados. O APK sozinho não instala esse corpus novo.
- Consulte [QA e limites](../docs/qa/android-additional-texts-2026-10-22.md).

## Catálogo completo de leitura — 0.5.1

- A seleção de livros reúne as edições instaladas, independentemente da última passagem.
  Abrir uma edição só do Novo Testamento não oculta mais o Antigo em Todos/Todas as seções.
- Cada livro conserva sua edição, obra e esquema reais; a Bíblia Livre em português tem
  prioridade quando disponível. Edições originais continuam em Interlinear/Comparação.
- Atualização somente do APK, sem migração ou reimportação de livros.

## Formação e percurso por pontos — 0.5.0

- **Formação em Teologia** aparece em Estudos com 18 pontos graduais, 58 aulas e
  48 leituras de capítulos bíblicos. Parte de fundamentos e leitura, passa por método,
  história e doutrinas e termina em ética e investigação final.
- Mapa horizontal com estações conectadas, destaque do ponto atual, conclusão e
  cadeados. Concluir A libera B; é possível revisar pontos anteriores. O percurso
  acadêmico mantém a regra de aulas/leituras confirmadas, resposta e critérios.
- Guias e aulas temáticas também apresentam avanço por pontos. O progresso pessoal
  usa o banco existente; não há migração ou reimportação do acervo.
- Um conteúdo por etapa; navegação Anterior/Próxima fixa nos percursos acadêmicos.
  Leituras do acervo abrem a obra/página na Biblioteca. A árvore foi preservada.
- Atualize instalando o APK sobre a versão existente, sem desinstalar. A versão mantém
  as correções de comentários da 0.4.1. Consulte [escopo e QA](../docs/qa/android-study-progression-2026-10-22.md).

## Correções de uso — 0.4.1

- Home centralizado no cabeçalho em todos os módulos; Menu abre seis opções em uma janela
  central com a página ao fundo escurecida. Painel continua exclusivo da passagem aberta.
- Busca com cabeçalho curto, campo arredondado, Pesquisar central e resultados usando o espaço
  restante. Escrituras/Biblioteca são separados; Exegese e Hermenêutica consultam páginas com
  associações explicitamente classificadas no pacote. Não classificam todos os livros por inferência.
  Pesquisa acadêmica e Na web continuam separados e acionados pelo usuário.
- Por sentido usa o motor semântico local existente, apenas em Escrituras; a explicação curta
  distingue proximidade de significado de frase exata. Sem novo modelo, serviço ou áudio.
- Resultados da busca enviam endereço completo ao leitor, consumido uma vez e aplicado sobre
  a passagem restaurada. Voltar do Android e Voltar pra escolha retornam ao catálogo de livros.
- Livros em lista de retângulos com emblemas temáticos locais; Gênesis representa a origem.
  O seletor de edição redundante foi retirado do cabeçalho; os originais e demais edições
  continuam acessíveis pelo interlinear/comparação. Filtros e textos não canônicos foram preservados.
- Leitura/Interlinear/Comparação acessíveis por abas. As ferramentas conservam a referência
  visível e as relações reais por unidade; não criam alinhamento lexical inexistente.
- Segurar o versículo por dois segundos abre Anotar, Favoritar, Interlinear e Copiar. A leitura
  normal não repete botões por versículo. O painel deixa de ancorar em uma sobra do anterior.
- Dock com referência, Filtrar e recolhimento em uma linha, sem a contagem redundante.
  Filtros começam recolhidos. Todas as fontes existentes continuam disponíveis.
- Janelas de comentários usam serifa de leitura, tamanho limitado e recomposição visual de
  quebras de linha de PDF. Texto original, offsets da evidência e PDF não são alterados.

## Histórico de uso — 0.4.0


- **Home** fica junto ao nome Scriptorium. **Painel** aparece ao lado apenas em Leitura,
  quando uma passagem está aberta. O acesso flutuante Ir para… foi retirado.
- Referência/edição continuam no cabeçalho; tocar a referência abre a seleção de livro/capítulo.
  Selo do versículo reduzido para26dp de base, com número branco e mais espaço para o texto.
- Comentários recolhidos mostram somente o nome da fonte e Expandir. Recolher oculta todo
  o corpo. Tocar no cartão abre a fonte; não há outro botão de fonte completa repetido.
- **Filtrar** fica no cabeçalho da leitura em linha. Assunto declarado e livro de origem
  combinam-se; Limpar filtros restaura a coleção. O acesso a Mais comentários foi preservado.
- **Mais → Aparência e leitura** oferece fonte predefinida (serifa, sem serifa, monoespaçada),
  tamanho18–32 com prévia, temas Preto/Cinza/Marrom/Claro e construção animada das páginas.
  Ajustes ficam nas preferências deste aparelho, separados do banco e do backup de notas.
- Nessa mesma tela, **Comentários no painel inferior** troca a apresentação em linha por uma
  área inferior recolhível, agrupada por versículo. Os filtros acompanham essa área. Os mesmos
  comentários/endereço/esquema são usados; não é outro acervo nem outro perfil de leitura.
- O painel da direita mantém visão geral, texto/língua, fontes e notas. Contextos são cartões
  com títulos e cores de fonte; Fontes usa os mesmos cartões recolhíveis. Na janela de uma fonte,
  **Biblioteca ↗** está junto ao título; detalhes técnicos foram retirados da interface.
- Aulas temáticas e guias têm seleção horizontal. Cada aula reúne conteúdo em etapas, leituras
  reais e síntese em nota. Marcar uma etapa como lida registra avanço pessoal no banco existente;
  não certifica domínio. A regra dos percursos acadêmicos continua separada e inalterada.
- Leituras editoriais usam os vínculos do catálogo desktop. Resultados do índice dos livros
  privados são identificados como pesquisa, com página e abertura direta na Biblioteca.
  Quando falta resultado específico, o apoio da área é identificado. Ausências continuam explícitas; não são inventados trechos ou livros instalados.

- Livros em duas colunas, separados por Pentateuco, históricos, poesia, profetas, evangelhos,
  cartas e deuterocanônicos/outros, com os mesmos grupos editoriais do desktop.
- Filtros **Não canônico**, **Apócrifo**, **Esotérico** e **Fontes antigas** dão acesso aos textos
  realmente instalados e aos volumes privados identificados pelo título. Nag Hammadi não vira
  52 traduções fictícias: texto crítico copta, catálogo e volumes privados são distintos.
- Escritura com fonte configurável; comentários menores em sans-serif, em superfícies
  separadas. Número branco em selo bronze. Cada comentário começa recolhido e pode ser
  expandido/recolhido separadamente; a fonte completa abre à parte com página/seção disponível.
- Filtros de comentários combinam assunto declarado e livro de origem. Texto-prova
  confessional não é rotulado automaticamente como exegese. Ausência de classe não é inventada.
- **Home** e o título Scriptorium levam ao início. Há retomada do último versículo visível,
  passagem diária calculada sobre capítulos/textos reais e trilha diária entre guias instalados.
  A seleção por data não é calendário litúrgico nem revelação personalizada.
- Botão Voltar do Android retorna nos módulos e subpáginas; apenas no início sem histórico
  fica com o comportamento normal de saída. A confirmação de descarte das notas é preservada.
- Cores de notas/grupos por paleta nomeada, sem digitar hexadecimal. Cores anteriores preservadas.
- Transições suaves de módulo e expansão de comentários. Som breve opcional em **Ajustes e
  backup → Ambiente de estudo**, inicialmente desligado e respeitando silencioso/volume de mídia.
- Tradução segue local por decisão do usuário, sem Google Cloud/chaves/serviço remoto. Os
  modelos podem ser preparados em **Ajustes e backup → Tradução local**. Modelos instalados
  são usados sem consultar atualizações; download, tradução, timeout e erro têm estados próprios.
  Inglês/espanhol → português; não traduz copta/hebraico/grego por esse provedor.

Os rótulos e vínculos editoriais leves do APK são gerados por `npm run mobile:labels` a partir do catálogo editorial
versionado do desktop. Não trazem livros nem dados pessoais. Esta atualização não exige
reexportar o acervo: instale o APK novo **por cima**, sem desinstalar o anterior.

## Compilar

Abra esta pasta no Android Studio. Requer JDK 21, SDK Android 36 e Build Tools 36.0.0.
O wrapper fixa Gradle 9.4.1 com SHA-256; AGP 9.2.1 usa Kotlin embutido 2.2.10 e plugin
Compose da mesma versão. Compose BOM 2025.10.00 / Activity 1.11.0 / Lifecycle 2.9.4
foram fixados para compilar com API 36. Não há dependências dinâmicas. Mínimo: Android 9/API 28.

No PowerShell, dentro de `android/`:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA/Android/Sdk"
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
.\gradlew.bat :app:installDebug
```

Linux/macOS: `./gradlew` com as mesmas tarefas. APK de desenvolvimento:
`app/build/outputs/apk/debug/app-debug.apk`. O APK sozinho não contém livros; o kit os coentrega.
A assinatura de produção e publicação na Play Store ainda não estão configuradas.

## Levar o acervo do PC

Na raiz do repositório, após os índices existentes estarem gerados:

```powershell
npm run mobile:export -- --output data/mobile-inicial --workspace data/workspace/workspace.sqlite3 --editions biblia-livre-n4-2025.1.0,sblgnt-1.2,wlc-oshb-2.2
```

A pasta de saída precisa ser **nova**. O comando não sobrescreve exportações nem grava no banco
de origem. Com `--workspace`, usa uma transação de leitura consistente para projetar documentos,
páginas, comentários elegíveis, evidências e eventos existentes. Sem essa opção, o pacote leva
somente as edições públicas selecionadas e a ontologia pública. Não se conecta à API SQL do servidor.

Para incluir também os **PDFs originais**, acrescente `--include-pdfs`: serão conferidos por SHA-256.
Sem a opção, todos os textos extraídos das páginas são incluídos, mas não as imagens do PDF.
O exportador para se um original solicitado estiver ausente ou divergente; não inventa substitutos.

Transfira `data/mobile-inicial/acervo.scriptorium` por USB ou outro canal privado.
No aplicativo: **Mais → Pacotes → Importar/Instalar pacote**. O seletor de arquivos do Android
dispensa acesso amplo ao armazenamento e não requer um servidor acessível pela rede.

### Atualizar sem apagar notas

```powershell
npm run mobile:export -- --output data/mobile-atualizacao --workspace data/workspace/workspace.sqlite3 --editions biblia-livre-n4-2025.1.0,sblgnt-1.2,wlc-oshb-2.2 --base data/mobile-inicial/manifest.json
```

Use a mesma seleção de edições/PDFs que deseja manter. O novo manifesto descreve o catálogo
completo desejado; o arquivo ZIP contém apenas arquivos alterados, além do manifesto.
Sem `--include-pdfs` numa atualização, os PDFs anteriores deixam de fazer parte do catálogo novo.
O patch exige o ID exato da base. Para pular versões, gere e importe um pacote completo.

O diferencial é **por arquivo**, não por linha SQL/página de banco. Se `content.sqlite3` mudar,
esse banco será reenviado inteiro, comprimido. A partir do APK0.2.1, o instalador guarda somente
arquivos alterados e um manifesto local que referencia os arquivos imutáveis já instalados.
Não depende de hardlink e não copia PDFs/corpora inalterados para cada atualização. Confere
tamanhos, SHA-256, SQLite/FTS e FKs antes de ativar o ponteiro atomicamente; só após confirmar
sua gravação coleta arquivos obsoletos. Notas e progresso ficam fora dessa coleta.
Instalar novamente o mesmo ID é idempotente. Na abertura, remove também cópias obsoletas
criadas pelo instalador antigo, sem copiar o acervo atual. O instalador USB não reenvia o
pacote quando seu ID já está ativo: atualiza apenas o APK.

Reserve espaço para arquivos novos descompactados +64 MiB, além do pacote de entrada e da
instalação do APK. Um patch apenas de manifesto não reserva outra cópia dos3,72GB do acervo.
O espaço básico continua necessário; a atualização por arquivo não é um delta de linhas SQL.
O layout local com `locations.json` exige APK0.2.1 ou posterior; não faça downgrade para0.2.0.
A recuperação de um conteúdo antigo usa um pacote completo; versões obsoletas não são backup.
Resultados: [QA de armazenamento](../docs/qa/android-storage-2026-10-19.md).

## Implementado e restante

| Área           | Nesta entrega                                                                                         | Ainda falta para paridade                                               |
| -------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Leitura        | Edições, livros/capítulos, comentários/ranges, toggle, comparação, original e interlinear por unidade | Refinar seleção/filtros e alinhamentos não fornecidos pelas fontes      |
| Texto original | Léxico, tradução, morfologia, ocorrências e estatísticas por livro/vizinhos                           | Todos os painéis especializados do inspetor desktop                     |
| Biblioteca     | PDFs originais, capas reais, páginas, índice extraído e fontes antigas paginadas                      | Leitor com todas as ferramentas editoriais do desktop                   |
| Rastro         | Histórico paginado/filtrável, fonte, rationale e evidência                                            | Auditoria visual de todos os payloads históricos                        |
| Busca          | FTS, referência completa, sentido offline, OpenAlex e atalhos externos                                | Ranking híbrido idêntico ao PC, abreviaturas completas e filtro por ano |
| Estudos        | Árvore, guias/aulas, curso com atividades/progresso; mapa ontológico/argumentos separado              | Editor completo de investigações e recursos vinculados                  |
| Notas          | Pastas, grupos, cores, links, grafo, seed pessoal e backup/restore                                    | Abas múltiplas, Markdown completo e sync bidirecional                   |
| Tradução       | ML Kit local inglês/espanhol→português, glossário e cache, preservando original                       | Mesma implementação Marian do PC e pesos de tradução incluídos          |
| Pacotes        | Exportação privada, integridade, instalação completa e patch por arquivo                              | Assinaturas/autenticidade, download e delta por registros               |

Não há OCR, desmontagem, análise editorial por LLM nem geração de conhecimento no Android.
O modelo ONNX é usado somente para recuperação por sentido. O aplicativo desta
etapa pede permissão INTERNET para pesquisa acadêmica e download explícito do modelo de tradução.
Não execute inferência remota ou exponha a API local do PC para "completar" botões.

## Arquitetura e segurança

- `content/`: manifesto versionado e instalador JVM testável. ZIP DEFLATE compatível com
  `ZipInputStream`; limites por entrada e cumulativos, paths allowlisted e staging privado.
- `data/`: SQLite embarcado AndroidX **2.6.2**, com FTS5/STRICT mesmo em aparelhos cujo SQLite
  de sistema não suporta os bancos existentes. Corpora são abertos read-only e mantêm IDs,
  edições, esquemas, crosswalks, direitos e proveniência. Endereços de navegação explícitos
  existentes são preferidos; não se igualam números entre esquemas incompatíveis.
- `AppModel`: IO/coroutines fora da composição; pacote instalado por ação explícita e feedback
  real de etapa. `AtomicFile` ativa a geração. Consultas parametrizadas; UI não escreve SQL.
- `ui/`: Compose nativo, tema escuro/bronze, serifas na leitura, fonte em modal, divulgação
  progressiva de contexto de livro/capítulo e múltiplos comentários.
- `personal.sqlite3`: notas do aparelho, sem ser anexado pelo instalador de conteúdo.
  Banco e esquema pessoais versionados. O conteúdo do PC é derivado read-only, não uma segunda
  autoridade editorial. O seed pessoal é incorporado uma vez sem sobrescrever edições locais; não é sync.
- Diretórios de exportação `data/mobile*/`, builds e `local.properties` são ignorados.
  Livros privados não vão para Git, imagem Docker nem artefato de CI. Backups automáticos do
  Android estão desativados; backup manual das notas está em Mais → Ajustes e backup.

Hashes detectam corrupção, **não autenticam o autor do pacote**. Nesta fase importe somente
arquivos preparados por você. Há limite de 12 GiB descomprimidos, 4 GiB por arquivo e 2.000 arquivos;
é necessário espaço para os arquivos alterados sem apagar os ativos antes da confirmação.
Arquivos inalterados são compartilhados por referência e obsoletos são coletados após ativação.

## Testes e QA

```powershell
# Na raiz: contrato e projeção com SQLite temporário, sem livros privados
npx vitest run scripts/mobile/export-content.test.ts --maxWorkers=1

# No Android: instalador, corrupção, idempotência, rollback e preservação de notas
.\gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug

# Com emulador/aparelho: teste SQLite/FTS real; QA privado é opcional sem packagePath
.\gradlew.bat :app:connectedDebugAndroidTest
```

`InstalledAcervoTest` permite QA privado adicional, com um pacote real já copiado para `filesDir`
do APK debug, usando argumentos `packagePath` e, opcionalmente, `patchPath` do instrumentation
runner. Sem `packagePath`, **esse caso privado é marcado como skipped**, não considerado validado.
O teste de capacidades SQLite/FTS roda sem acervo privado. CI executa build/lint/testes JVM e
publica somente o APK debug vazio; nunca os pacotes de livros.

Verificação inicial: [fundação mobile](../docs/architecture/mobile-foundation.md).
Resultados da expansão: [QA de consumo nativo](../docs/qa/mobile-consumption-2026-10-18.md).
