# Project Memory

## Android — formação e estações de estudo 0.5.0 — 2026-10-22

- Estudos mantém a árvore. Guias/aulas e percursos usam estações horizontais conectadas,
  ponto atual, concluídos e cadeados; conclusão libera o próximo, com revisão dos anteriores.
- Novo `course:theology-formation`, revisão1, distribuído em `reading-labels.json` no APK:
  18 pontos graduais,58 aulas,199 parágrafos,48 capítulos bíblicos. Formação geral introdutória;
  capítulos editoriais existentes + panoramas AT/NT/ética, sem fingir trechos de obras privadas.
- Fontes de cada módulo usam guia editorial e busca temática no acervo real; abrem Biblioteca.
  CoursePolicy preservada (aulas/passagens/resposta/critérios), sem certificação automática.
- Guias retomam primeiro ponto incompleto; progresso na tabela pessoal existente, sem schema
  ou reimportação. Navegação dos cursos fora do conteúdo rolável; rascunho preservado.
- Janela de comentários mantém a correção0.4.1: serifa/tamanho limitado/refluxo de PDF,
  sem alterar texto-fonte, offsets ou quantidade de comentários.
- QA e limites: `docs/qa/android-study-progression-2026-10-22.md`. Entrega é APK de atualização,
  sem acervo privado; instalação sobre a versão atual. Celular físico não conectado nesta rodada.
- Verificação:50 testes JVM,11 testes TS,4 cenários com dados reais e8 cenários nativos
  (148,202s) aprovados; typecheck/lint focado/build aprovados; Android lint0 erros/22 avisos.
- Trabalho de música web foi preservado e entregue separadamente no commit9d8d881.

## Música e Ambiente — primeira entrega web — 2026-10-22

- Motor global de áudio coordena voz + canal musical: modos Voz/Misto/Música, volumes separados,
  loop, pausa conjunta opcional, troca de trilha sem reiniciar fala, mini player e atalho Ambiente.
- Importação pessoal: assinatura/codec/duração, SHA256,50MiB/arquivo,100 arquivos/500MiB,
  cópia IndexedDB v1 (`scriptorium-local-audio`,tracks/files) com escrita/exclusão atômicas.
  Metadados e limites validados; reimport não duplica, edição preserva hash. Nenhuma trilha fictícia.
- Ajustes `scriptorium.ambience.v1`; sem autoplay ao restaurar. Músicas pertencem ao navegador/
  origem, não a SQLite/acervo/Git/Docker/APK/backup. Interface explicita esse limite.
- Ganho musical imediato onde suportado; voz nativa recebe volume só no próximo segmento,
  sem cortar a fala. Sem exportação, ducking, fades, perfis ou favoritos (entregas seguintes).
- 600 testes/90 arquivos no estado colaborativo passaram,15 novos de ambiente; typecheck,
  lint focado e build. QA produção1440/390 com voz nativa/Gn1+WAV real, modos, navegação,
  reload, idempotência, renomeação/exclusão e arquivo inválido; sem erros. No dev, relatórios
  Android paralelos provocavam reload; QA final não depende de HMR. Acervo original preservado.
- Android e scripts de formação estavam em edição paralela: preservar e não incluí-los no
  commit de áudio. Documento: docs/architecture/audio-ambience.md. Ainda sem APK/Docker novos.

## Android — correções de uso 0.4.1 — 2026-10-21

- Substitui decisões anteriores de Home junto à marca/duas colunas: Home centralizado,
  Menu modal2×3 e livros em lista com emblemas locais. Seletor redundante de edição retirado;
  originais/edições continuam disponíveis em Interlinear/Comparação no cabeçalho do leitor.
- Busca separa Escrituras/Biblioteca/Exegese/Hermenêutica e conserva acadêmica/web. Assuntos
  dependem da classificação existente nas associações; não é classificação completa de PDFs.
- Destino da busca consumido uma vez com revisão de navegação, inclusive no mesmo capítulo;
  capítulo isola carga assíncrona anterior. Voltar físico na passagem retorna aos livros.
- Ações por versículo somente ao segurar2s; toque indica foco. Dock compacto com Filtrar central,
  sem contagem redundante; âncora ignora sobra do versículo anterior. Comentários preservados.
- Fonte em serifa limitada/refluxo visual de linhas; originais/offsets não alterados. Interlinear
  em blocos, morfologia legível em vez de JSON, códigos preservados no inspetor.
- 49 testes JVM, lint0 erros/22 avisos, build;6 cenários nativos103,058s e3 dados reais11,091s
  aprovados.467 comentários em Gn1/14 leituras Trindade. Hash pessoal mantido no install-r.
  QA exclusivo AVD porta5562; celular não conectado. Desktop/pipeline/schema/acervo preservados.
- Relatório: docs/qa/android-usage-fixes-2026-10-21.md. Atualizar APK por cima, sem reimportar livros.

## Scriptorium Áudio — Fase 1 — 2026-10-21

- `/audio`, navegação web/Mais e player único no shell; capítulo, versículo/intervalo e texto
  pessoal literais. Repositório abre somente obra/edição pedida, preserva unidades/esquema/licença.
- Adapter Web Speech somente `localService === true`; sem nuvem, chave, dependência nova ou
  arquivo exportável. Naturalidade depende das vozes instaladas; não prometer voz neural.
- Progresso/histórico validado em `scriptorium.audio-progress.v1`, até20 referências/hash/posição;
  não contém texto/PDF e não faz parte do backup SQLite. Texto pessoal e fila só na sessão.
  Não abre outro banco nem altera schema/acervo. Android e Docker não atualizados nesta entrega.
- 582 testes TS/88 arquivos aprovados (30 novos), typecheck, lint dos arquivos alterados e build
  node-server. QA em workspace temporário: vozes reais Daniel/Maria detectadas; fala/pausa/retomada,
  continuidade entre rotas, reload, Gênesis1:2–3, velocidade/volume/fila e ausência de voz tratada.
  Produção1440/390 sem erros; ausência de voz simulada só no teste negativo. Acervo original
  manteve mtime14:32:28, anterior ao trabalho. Não foi migrado para testar áudio.
- Próximo: perfis/prévias, leitura ancorada de fontes/estudos/notas, fila persistente, arquivos
  com direitos e player nativo Android. Escopo e limites: docs/architecture/scriptorium-audio.md.

## Desktop — auditoria e aproveitamento do acervo — 2026-10-21

- Retomada executada sobre o original: 57 PDFs, 47.707 páginas/45.905 com texto, schema26.
  Backup consistente, FKs limpas e baseline de 232 propostas anteriores preservado.
- `audit-delivery-20261021`: publicados 8 vínculos de A Trindade que antes só existiam no QA,
  2 notas Shedd delimitadas (2Ts1:1/1:3) e 2 destinos Price (Lc3:1/Jo18). 12 novas, uma antiga
  retida com evidência e sucessora; reimportação somente leitura 0 novas/12 reutilizadas.
- 24 amostras estruturais das quatro Bíblias; leitura contextual seletiva. Corrigida exclusão
  visual de notas de capítulo/livro também nos modos completo/painel (930 Wesley,34 Shedd).
  Não confundir amostra assistida com aprovação humana ou todos os comentários corretos.
- Jerusalém instalada é texto bíblico sem aparato identificado (p2/600/1100/1220 revalidadas).
  Não fabricar comentários. Precisa da edição anotada. Veja checksum no relatório canônico.
- Inspetor lexical privado: FTS limitada + delimitação grega e 3 localizadores com hash
  (ראשית p497, ארץ DITAT p150, שאר NDITAT IV p44); fragmentos/OCR qualificados, não obra integral.
- Estudos:22 localizadores; separação local de questão/artigo/objeções/solução/respostas,
  Institutas e confissões; Ware tem localizadores temáticos, não falsa estrutura escolástica.
- Rastro `/trace?view=utilization`: SQL por documento/passagem/esquema; contagens de ligações,
  não versículos únicos. Arqueologia traz lugar/período/limites e imagem real Price p252.
- 552 testes TS/86 arquivos passaram após integração (513/84 antes), typecheck/lint alterados/build. QA produção1440/390:
  panorama nos três modos, filtro relatório, nota de seção salva, λόγος com destaque, imagem.
  Aviso React ocorreu durante HMR; repetição de produção sem erros. Python não alterado nesta fase.
- Integrados seis commits remotos até bad2498, incluindo KJV e regra noteTargets compartilhada;
  preservada a exibição no painel, sem algoritmo concorrente de alcance. KJV abriu texto real em QA.
- Não reconstruído Docker (daemon desligado); alterações Android do colega preservadas, sem novo APK validado. Não publicar PDFs no Git.
  Continuação: ampliar auditoria/OCR/verbetes multipágina/roteiros e imagens, sem alegar cobertura
  integral. Relatório: docs/content/acervo-utilization-audit-2026-10-21.md.

## Desktop — estudos e notas na leitura — 2026-10-21 (estado anterior; publicação atualizada acima)

- Commits9013cac (funcionalidade) e e676003 (integração do remoto20bb808) preservam melhorias
  colaborativas: versículo por URL, comentários resumidos, panorama e barra de fontes persistente.
  Filtros de tradição/tipo em detalhe na barra; sidebar acompanha fontes ocultas/área/tradição.
- Editor de página de Notas reutilizado na janela/leitores, sem migration. Seleção UTF16 + quote
  validada no original integral e guardada no JSON da fonte; volta marcada em Consultar fonte.
  Biblioteca integral conserva âncora de página/unidade, não seleção pessoal exata por URL.
- 19 localizadores verificados por hash, sete novos de Agostinho/Calvino/hermenêutica/Augsburgo;
  13 capítulos introdutórios históricos/conciliares/confessionais, sem fingir atas completas.
  Vídeo ao lado por link validado ou API, sem recomendações fictícias; recolher desmonta player.
- Lote privado desktop-context-20261021:8 notas literais de A Trindade, páginas39/43/51, preparado
  e importado SOMENTE no snapshot de QA (8 novas,0 novas/8 reutilizadas na verificação).
  NÃO está publicado no banco original. Docker indisponível; lock Linux original preservado.
- Original confirmado:57 docs, schema26, quick_check=ok e FKs limpas. Não migrar original para28
  só para QA. Snapshot temporário em AppData/Local/Temp/scriptorium-study-context-qa-20261021;
  seus rascunhos e relações de teste NÃO são produção. Documentos via junction apenas leitura.
- 506 testes TS/113 Python aprovados; mypy em 15 fontes, Ruff, typecheck, lint TS/TSX alterados e build.
  QA produção1440/390: fonte real, nota/grupo/formatação, reload+destaque, filtros e Biblioteca.
  Tradução nova não validada: somente cache existente e erro recuperável com serviço desligado.
- Próximo seguro: concluir publicação do lote original com exclusão de escritores; reativar e
  testar tradutor real. Não reconstruído Docker, não modificado Android. Não alegar cobertura
  integral dos temas/concílios/acervo. Relato: docs/content/desktop-study-context-2026-10-21.md.

## Desktop — retomada contextual — 2026-10-20

- Mobile fora do escopo. Acervo canônico: data/workspace/workspace.sqlite3, 57 documentos.
- Importadas 118 relações de aberturas de homilias de Crisóstomo: 80 Atos/38 Romanos. Perfil novo
  chrysostom-acts-romans.json; 85 lemas válidos/84 aberturas publicadas, 5 exceções. Lote integral 507 NÃO importado:
  não ligar aplicações posteriores ao primeiro verso. Restante aguarda segmentação própria.
- Suma: 12 localizadores temáticos reais com SHA da edição/texto da página; estudos/árvore usam
  Leituras selecionadas via repository. Não equivale ao grafo de argumentos nem à leitura integral.
  Objeções/solução distinguidas no aviso; compilação de traduções mistas permanece identificada.
- Baseline preservada, quick_check/FKs aprovados; idempotência: 0 novas/118 reutilizadas. Recibos
  privados em data/workspace/desktop-context-20261020. Catálogo Suma: 12/12, somente leitura.
- Docker parado/religado com autorização. Lock antigo preservado após backup e confirmação do
  container parado. Importador aceita 25–28 sem migration alheia e manteve 25. Docker possui
  schema 26 e cria seu próprio backup/migração aditiva ao reabrir a instalação.
- Reabertura concluída: HTTP 200, schema 26, 57 documentos. Backup do caderno terminou;
  os timeouts iniciais ocorreram durante VACUUM síncrono, não foram perda do acervo.
- QA em cópia temporária isolada; não impor 28 ao original: imagem Docker existente até 26.
  Código novo de estudos exige rebuild posterior da imagem; nesta entrega não reconstruir Docker.
- Próximos: A Trindade/Institutas/métodos/léxicos/arqueologia; Salmos exigem crosswalk e 6 PDFs sem
  texto continuam com OCR pendente. Detalhes: docs/content/desktop-context-expansion-2026-10-20.md.
- Passaram 494 testes TS, 113 Python, typecheck, build, ESLint alterados, Ruff e mypy/app.
  Playwright em 1440/390 px: Suma por página, janela original e Crisóstomo em Atos 1:1;
  sem erros de console/overflow. Não testados tradução nem escrita de notas novas.

## Android — revisão do leitor e aulas 0.4.0 — 2026-10-20

- Feedback atual substitui a decisão anterior do botão flutuante: retirar Ir para…, selo26dp,
  Home junto ao título e Painel junto a Home só com passagem aberta. Sem perfis culto/estudo.
- Comentários recolhidos só com fonte/expansão; cartão abre fonte, Biblioteca no topo da janela,
  sem detalhes técnicos. Mesma coleção/filtros por assunto+documento em linha ou dock opcional,
  agrupado por versículo e acompanhando posição. Mais comentários preservado; Gn1:467 intactos.
- Mais/Aparência e leitura: famílias nativas, tamanho18–32, Preto/Cinza/Marrom/Claro, dock e
  animações. SharedPreferences separado de notas/backup. Leitura em fontes/Biblioteca também
  responde às preferências; PDF original mantém tipografia do arquivo. Contextos em cartões.
- Guias/aulas em trilhas horizontais; conteúdo, leitura e síntese. Etapa lida autorrelatada em
  course_progress/lesson, sem migration nem mudança em CoursePolicy. Livros abrem na Biblioteca.
- Metadados públicos gerados por mobile:labels: famílias e workIds editoriais; FTS local por aula.
- 103/111 têm leitura direta/pesquisada;8 usam apoio explícito da trilha por capítulos compartilhados.
  Não apresentar apoio de área ou FTS como curadoria exata. Na página de conteúdo só uma leitura
  de partida, demais na etapa Leituras. Nenhum conteúdo privado novo incluído no APK.
- Passaram 45 JVM, 8 Node/mobile,typecheck/ESLint,Android build/lint sem erros (22 avisos),7 verificações
  instrumentadas de dados/cobertura e 4 cenários UI em 80,679s. Quatro temas conferidos no AVD
  isolado, acervo b289f600.../3.637.896KiB mantido. Sem teste físico/API28 desta versão.
- Entrega somente APK0.4.0/versionCode6 em C:/Users/comical/Desktop/Scriptorium-Android-0.4.0.
  QA: docs/qa/android-reading-ui-2026-10-20.md. Desktop/pipeline/banco canônico preservados.

## Android — painel e percurso horizontal 0.3.1 — 2026-10-20

- Decisão explícita: experiência única de leitura, sem separar culto/estudo. Não reconstruir
  árvore nem identidade bronze/escura. Cabeçalho compacto e Ir para… flutuante acessível.
- Painel contextual pela direita (tela inteira no telefone, max480dp em telas largas): visão
  geral/texto e língua/fontes/minhas notas. Leitor preservado abaixo; notas por IDs exatos,
  sem migration. Ferramentas existentes permanecem; retorno usa versículo visível.
- Guias/aulas com etapas horizontais; cursos com módulos e etapas, uma seção por vez.
  Textos conservados. Salvar antes de navegar/sair; conclusão e liberação mantêm CoursePolicy,
  sem completar por clique/rolagem. Progresso atualizado sem desmontagem integral por etapa.
- Título humano com dois-pontos não pode virar Estudo temático. Trilha usa Surface visual +
  clickable para evitar falha de nó semântico destacado do Material em troca de estado.
- 42 JVM e 5 dados instrumentados passaram, build/lint sem erros. Dois cenários UI passaram:
  painel/retorno/versículo105 e 14 etapas/rascunho/saída sem conclusão automática.
- Entrega só APK0.3.1/versionCode5 em C:/Users/comical/Desktop/Scriptorium-Android-0.3.1,
  sem reenviar livros. Acervo b289f600.../3.637.896KiB mantido. QA somente AVD isolado;
  sem teste físico/API28. Detalhes: docs/qa/android-contextual-reading-2026-10-20.md.

## Android — uso diário 0.3.0 — 2026-10-20

- Feedback mobile implementado preservando tema/bronze e acervo: salto `Jo3:16`/ranges e grid
  livro→capítulo→versículo, FTS com destino exato, cache por geração, leitor sem aguardar comentários,
  previews independentes/filtros classe+fonte, selo branco/bronze e hierarquia serif/sans.
- Home visível por título/botão, retomada do versículo e passagem/trilha derivadas de dados reais;
  histórico Android entre módulos e na leitura, subpáginas e confirmação de descarte preservados.
- Duas colunas/grupos do desktop, textos antigos/volumes privados em Leitura e filtros explícitos;
  não inventar 52 traduções a partir do catálogo NHC. Aulas com rótulos reais também em pacote antigo;
  exportador futuro corrigido. Paleta de cores nomeadas. Transições e som opcional inicialmente off.
- Usuário recusou Google Cloud por não ter chave. Tradução mantida ML Kit; modelos preparáveis
  nos ajustes, progresso/timeout/tentativa e offline sem checar atualizações de modelos presentes.
- Passaram38 JVM,8 Node/mobile,typecheck/lint,Android build/testAPK/lint; cenário UI nativo completo,
  referências/dados antigos e3 regressões pessoais. Tradução real passou após download e em modo avião.
  Banco pessoal SHA idêntico após atualização e UI; acervo b289f600.../3.637.896KiB preservado.
- Entrega apenas APK0.3.0/versionCode4 em C:/Users/comical/Desktop/Scriptorium-Android-0.3.0,
  sem outro ZIP de livros. Baseline usado: kit0.2.1 Desktop; antigos data/mobile* não foram encontrados.
  QA em CTemp/scriptorium-feedback-avd-20261020, sem tocar Pixel_8. Sem teste físico/áudio audível.
- Relatório completo: docs/qa/android-reading-experience-2026-10-20.md. Desktop, pipeline e banco
  canônico não alterados; semântica experimental/traduções acadêmicas/sync permanecem limites prévios.

## Android — instalação física / PowerShell 5.1 — 2026-10-19

- Erro real do usuário: StandardInputEncoding não existe no ProcessStartInfo do .NET
  Framework/Windows PowerShell5.1. Teste anterior cobria somente caminho sem reenvio.
- Transferência por stdin no Windows também falhou no Samsung:exec-in truncou e shell
  recebeu EOF prematuro. Instalador passou a adb push para pasta shell0700 +pipe local
  Android para incoming privado; remove staging e exige SHA256 remoto antes de ativar.
- Testes do kit/exportador:8 passaram;regressões WindowsPS5.1 usam ADB falso compilado
  para cobrir primeira instalação/cópia binária, checksum divergente bloqueado e update
  sem reenvio. Não confundem simulação com validação real no telefone.
- Instalador extraído em Desktop/Scriptorium-Android-0.2.1 corrigido;sem rebuild do APK,
  sem mudanças de schema/desktop/OCR. Instalação física concluída:script confirmou acervo
  b289f600...,UI exibiu “Acervo instalado”/Hoje Salmos55;incoming ficou vazio. APK não foi
  desinstalado. ZIP e checksums da Área de Trabalho também atualizados com instalador novo.

## Android — atualização com espaço limitado — 2026-10-19

- Usuário tem20GB livres no celular e pediu resolver cópias/acúmulo de atualizações.
  APK0.2.1/versionCode3 mantém pacote/manifesto v1 e acervo completo; não retira PDFs.
- ContentPackageStore usa InstalledContent +locations.json privado achatado. Arquivos imutáveis
  inalterados são referenciados pelo mesmo caminho físico, sem hardlink nem cópia. Repositórios
  de leitura/semântica resolvem paths pela snapshot; cache ONNX considera toda a receita.
- Confere SHA/SQLite, ativa AtomicFile, confirma ponteiro e só então coleta arquivos derivados
  não usados. Não alcança personal.sqlite3, paths externos ou symlinks. Startup limpa cópias
  legadas e staging sob lock; não copia/converte o acervo ativo. Leitura SQL/semântica no processo
  é excluída durante instalação. Layout exige0.2.1+, não fazer downgrade para0.2.0.
- Instalador USB:mesmo ID ativo→só APK, sem reenviar1,79GB. Mudança de banco continua delta por
  arquivo; content.sqlite3 (~1,02GB) pode exigir essa folga. Reserva mudou para novos bytes+64MiB;
  arquivo de entrada e instalação do APK ainda exigem espaço. Primeira preparação não é instantânea.
- QA real AVD5560:content de10.912.160KiB para3.637.920KiB,liberou~7,45GB de cópias obsoletas.
  Patch6.050bytes aplicou em17.601ms (anterior268.079ms),reutilizou75 paths físicos; crescimento
  lógico15.645bytes. SHA e backup pessoal integral preservados. Restart manteve c256f804...,
  Activity COLD2.162ms (não é tempo até todos os dados prontos). Sem teste em aparelho físico.
- Passaram31 JVM,5 instrumentation selecionados (patch+consumo/migração/seed/backup),483 Node,
  typecheck/lint,assembleDebug/AndroidTest/lintDebug. Gate semântico/tradução continuam pendentes.
- Relatório:docs/qa/android-storage-2026-10-19.md. Kit privado0.2.1 em
  C:/Users/comical/Desktop/Scriptorium-Android-0.2.1,fora do F para evitar novo pacote grande no
  projeto. Não publicar acervo/modelos/APKs. Pacotes originais/desktop/Pixel_8 preservados.

## Android — expansão de consumo em andamento — 2026-10-18

- Pedido atual reforçado: PDFs originais e funções de consumo junto ao APK Kotlin, não um
  shell vazio nem importação manual de cada livro. Produção/OCR/editorial continuam no PC.
- Alterações ainda em validação nesta continuação: leitura/comparação/interlinear, léxico,
  estatísticas, fontes/PDF/capas/índice, árvore/guias/aulas/curso, notas/pastas/links/grafo,
  backup pessoal, pesquisa externa, tradução local ML Kit e busca ONNX experimental.
- Projeção privada atual: `data/mobile-personal-dense-20261018/`,57 PDFs,47.707 páginas,
  45.949 comentários elegíveis,10 edições,16 guias/111 aulas/curso e catálogo NHC52.
  Pacote ~1,787 GB; não comitar livros/modelos/APK. Docs: `mobile-consumption.md`.
- Decisão de entrega revisada após QA: APK ~2GB causou timeout `ApkAssets.finalize()` no
  `system_server` do emulador API37. Não insistir nesse formato. `mobile:bundle -- --package
data/mobile-personal-dense-20261018 --output data/mobile-delivery-complete-20261018` gera
  ZIP único com APK pequeno, pacote completo e instalador USB automático. Todos os PDFs vão
  juntos, sem importação por livro. O APK sozinho não tem o acervo. Não habilita ADB remoto.
  AppModel processa entradas privadas `incoming/<id>.scriptorium` e apaga a cópia após sucesso.
  Modo de assets embutidos retirado; propriedade antiga falha com orientação. O gerador do kit
  limpa somente build Android para evitar resíduos privados em ZIP incremental. CI não gera
  kit privado. Script nunca desinstala/wipa notas. Emulador QA reiniciado com6GB/4cores após
  watchdog no próprio system_server/API37; não alterar Pixel_8 nem dados do usuário.
- SQLite pessoal v2 aditivo, seed uma vez por IDs, backup/restore transacional. Conteúdo
  imutável tem lock de arquivo, staging recuperável e reúso por SHA/hardlink/fallback cópia.
  SHA é sempre conferido; SQL validado previamente só é reutilizado para bytes idênticos.
- QA achou inicialização SQLite pessoal na thread principal; movida para IO. Primeiro
  carregamento do pacote grande foi lento no emulador. Abertura posterior medida ~1,8s.
- ONNX inicial sem Dense foi substituído pela projeção oficial 768→512/Tanh/L2. Receita
  `distiluse-onnx-dense-tanh-l2-96-v2`;69.130 vetores,geração4threads ~759s. Não mistura
  índice antigo. A relevância de “perdoar os inimigos” continua inadequada: busca marcada
  experimental e teste privado de qualidade mantido como gate pendente, sem mascarar falha.
- Verificado nesta expansão:482 testes Node/75 arquivos;typecheck/lint/build web;19 JVM.
  Lint Android:0 erros/18 avisos. Instrumentation API37:6 testes,5 passaram/1 falhou
  (gate de relevância semântica). Acervo/consultas/FTS/léxico/probes512 e preservação da
  nota criada pela UI passaram; migração/seed/backup transacional também passaram.
  Consulta semântica aquecida medida960ms; consistência vetorial não implica relevância.
- Kit final: `data/mobile-delivery-ready-20261018/Scriptorium-completo.zip`,1.968.288.826
  bytes,APK181.193.301 bytes;livros fora dos assets. Instalador PS real concluiu transferência
  binária e ativação do acervo b289f600...;atualização para APK final preservou conteúdo.
  Relatório: `docs/qa/mobile-consumption-2026-10-18.md`. Kit anterior foi preservado porque
  a tentativa de remover apenas o artefato obsoleto foi bloqueada pelo ambiente.
- Emulador isolado `Scriptorium_QA`,porta5560 em `data/mobile-qa-avd`,não usa/wipa Pixel_8.
  Canonical workspace do PC só foi aberto read-only; não recriou Docker nem expôs serviço.
- Patch real aprovado em268s:manifesto6.278 bytes,ID e6c451cb...,base b289f600...;
  comparação integral do backup pessoal e reinstalação idempotente passaram. Total privado:
  7 casos,6 passaram/1 falhou (relevância). No AVD houve fallback para cópia (inodes distintos),
  não prometer economia/patch instantâneo. Restart manteve e6c451cb...,abertura COLD1757ms.
  UI final confirmou notas com links/grupos/capas e Didaquê+tradução já preparada no PC.
  ML Kit:consentimento/download/tradução local confirmados;qualidade ruim no inglês arcaico
  (fast→rápido no contexto de jejum),não aprovada para estudo. Preservar original,sem remendo
  global de palavra ambígua. Relatório distingue funcionamento técnico de qualidade.
- Próximo seguro:calibrar recuperação com coleção de avaliação, melhorar tradução/testar OpenAlex
  e aparelho físico;continuar lacunas da matriz de paridade, sem declarar tudo concluído.
  Não declarar paridade integral: faltam editor de investigações, sync/abas/Markdown completo,
  painéis especializados, Marian idêntico e calibração semântica/aparelho físico.

## Android nativo para consumo — 2026-10-18

- Autorizado: levar funcionalidades de consumo do desktop ao Android Kotlin/Compose, sem OCR,
  desmontagem ou produção de conhecimento no aparelho. PC prepara conteúdo; celular recebe patches.
- Projeto independente em `android/`, AGP9.2.1/Kotlin embutido2.2.10, Gradle9.4.1 verificado por SHA,
  SDK36/min28, SQLite AndroidX bundled2.6.2 para FTS5/STRICT. Sem WebView e sem permissão INTERNET.
- Primeira vertical real: edição/livro/capítulo, comentários/ranges, fonte/página com realce,
  Rastro, FTS, ontologia/relacionamentos, notas pessoais locais e importação de pacotes/patches.
  Não é paridade total: comparação/interlinear/léxico completo, cursos/mapas, pastas/grafo de notas,
  migração pessoal do desktop, busca semântica/externa e tradução ainda precisam ser portados.
- `scripts/mobile/export-content.ts`/`mobile:export`: transação read-only sobre workspace canônico,
  projeção de consumo com IDs/páginas/evidência, política accepted/machine-visible sem rejeitados,
  bancos públicos originais e PDFs opcionais. Derivado não é segunda autoridade nem restore pessoal.
- ZIP `.scriptorium` DEFLATE, manifesto v1, SHA/tamanhos, base exata e delta por arquivo.
  Geração imutável em staging; valida SQLite/FKs antes de AtomicFile. Nunca toca personal.sqlite3.
  Gerações antigas retidas: ainda exige gestão de espaço. Sem assinatura/autodownload/delta SQL.
- QA real: 57 livros,47.707 páginas,45.949 comentários elegíveis; pacote com uma Bíblia/ontologia
  212.452.898 bytes, sem PDFs. Patch real de labels PT:1.336 bytes; notas preservadas no Android.
  Esses números não equivalem a cobertura integral ou revisão humana das ligações.
- 479 testes/74 arquivos Node passaram;10 JVM e2 instrumentation no Pixel8/API37 passaram,
  incluindo pacote real/patch/FTS/STRICT. Typecheck/lint desktop e build/lint Android passaram;
  lint Android tem12 avisos (versões/SDK/otimização), zero erros. Aparelho físico/API28 não testados.
- Build desktop também passou. APK debug ~34,3 MB; QA visual de leitura/fonte e reinício conferidos.
  Workflow Android criado (execução remota ainda não conferida). Pacote/patch reais ficam privados.
- Regressões corrigidas: ZIP STORED/data-descriptor incompatível com Java; seleção do esquema
  original em vez do endereço explícito de navegação. Não ignorar esquema para "achar" comentários.
- `android/README.md` e `docs/architecture/mobile-foundation.md`: matriz, contratos e operação.
  `data/mobile*/` e builds privados ignorados. Acervo original não alterado; Docker não reconstruído.

## Busca acadêmica e caminhos externos — 2026-10-18

- `/search` preserva texto/referências, busca por sentido, edição/preparo do índice e Ctrl+K.
  Três ramos: Meu acervo, Pesquisa acadêmica e Na web; gravura celeste existente e bronze.
- OpenAlex direto por ação explícita, filtros idioma/ano/acesso aberto,10 registros/10 páginas,
  Zod, timeout15s, abort/stale guard, cache5min/20 consultas. Sem chave/conta criada ou proxy.
  Google/Scholar/SciELO/BDTD/USP/UnB/Harvard/Frankfurt/Archive são atalhos identificados, não SERP.
- CSL via SourceImportService, DOI/URL idempotentes, FTS/invalidação e anotar via leitor/caderno.
  StudySourceService consulta também LibraryRepository para metadados privados guardados.
  Não baixa PDF, não muda direitos de conteúdo, não publica claims nem envia textos privados.
- CSS próprio importado pela rota; palavra hebraica com movimento reduzido, sem atrasar resultados.
  AppShell mantém Search montada ao cruzar o breakpoint. Estudos/Rastro concorrentes preservados.
- 17 testes focados passaram; suíte atual477/73 passou. QA real OpenAlex e ausência de requests
  antes do submit; cotas simuladas somente no QA, referências/rotações e fontes reais conferidas.
  Guia: docs/architecture/external-academic-search.md. Acervo real e Docker não alterados.

## Notas independentes e explorador — 2026-10-18

- Escopo: separar Notas na navegação, editor de página/abas inspirado no Obsidian, pastas
  aninhadas, grupos/cores e referências escritas, preservando Estudos/Biblioteca celeste e acervo.
- `/notes?group=&note=`; URL antiga `/study?view=notebook` redireciona. Investigações apontam
  para o grupo; captura contextual permanece e seu sucesso abre a nota específica.
- Migração027 somente aditiva: note_folders, note_placements por nota/grupo, note_references
  dirigidas separadas das arestas manuais. FKs, ciclos, nomes irmãos e restauração pai→filho.
  Worker OPFS/CLI atualizados; backupv3 inclui arrays opcionais, mantendo leitura dos anteriores.
- Seletor `/`/`[[`/Inserir link grava destino por ID; título ambíguo não cria aresta. Leitura
  Markdown parcial escapada, sem HTML/URLs executáveis. Links do texto não apagam arestas manuais.
- Salvar explícito/Ctrl+S, rascunhos em memória entre abas, guard de descarte e controle de versão.
  Sem autosave ou restauração de rascunho após fechamento forçado. Último grupo é preferência local.
  AppShell usa contêiner estável em /notes para não perder abas/rascunhos ao cruzar o breakpoint móvel.
- 452 testes/69 arquivos passaram; QA1536/390 e OPFS real/reload em workspace temporário.
  Typecheck, lint completo, build e produção/reinício/breakpoints passaram sem erros de console.
  Acervo real não migrado/reimportado, sem rebuild Docker. Guia: docs/architecture/study-notebook.md.
- Trabalho concorrente em Estudos/Rastro deve ser preservado; baseline desta entrega ae0a572.

## Leitor contextual e caderno conectado — 2026-10-17

- Pedido atual: fontes/imagens da sidebar abrem janela sobre a Bíblia; notas por grupo com
  cores e conexões pessoais em Estudos. Preservar árvore/guia e mapa acadêmico separado.
- Migração026 aditiva: cores de studies/notes, notes.source_json e note_connections com FKs,
  canonical pair e idempotência. Mesmo WorkspaceDatabase; nenhum reprocessamento de livros.
- SourceReaderProvider único; StudySourceService consulta unidade limitada, sem carregar obra
  inteira. Biblioteca é botão explícito com página física e unit; referências sem texto integral
  identificadas como metadados. Inglês reutiliza tradutor existente; não adicionar LLM.
- Caderno em /study?view=notebook e em cada investigação. Notas antigas editáveis, FTS atualizado
  transacionalmente, controle de edição concorrente, guard de rascunhos e cores herdadas.
- OPFS worker alinhado a025/026. Instalação faz VACUUM INTO pré026 sob lock exclusivo; a cópia
  exige espaço equivalente ao DB inteiro. Não migrar o DB real durante QA nem recriar Docker
  sem pedido. Usar workspace temporário e preservar os PDFs/revisões/propostas canônicos.
- Especificação operacional: docs/architecture/study-notebook.md.
- Validação:425 testes/62 arquivos, typecheck, lint focado e build; QA1440/390 com notas, cores,
  conexões, reload nativo/OPFS e vínculo imediato à passagem. Usar Playwright quando Browser
  plugin indisponível. Corrigida sobreposição com drawer móvel; modal mantém fechar visível.
- Trabalho paralelo de árvore/tema entrou separadamente em88a0a2c; não reverter nem misturar.

## Fila de incorporação privada — 2026-10-16

- Usuário autorizou incorporar os livros adicionais, com execução independente dos tokens/chat.
  Inventário SHA-256: 52 arquivos na pasta de origem (51 PDF/1 EPUB), 31 já importados,
  21 novos candidatos. Banco anterior: 37 documentos, incluindo seis vindos de outros locais.
- Worker CLI `scripts/content/process-library-queue.ts` reutiliza repositório de documentos,
  desmontagem determinística em lotes, perfis/papéis e pipeline canônico de referências explícitas.
  Sem LLM; `sourceSchemeConfirmed=false`, propostas ficam para revisão, não são comentários
  originais aprovados. Não aplicar perfis Shedd/Genebra automaticamente aos novos livros.
- Fila operacional privada: `data/workspace/library-import-queue/queue.json`; comandos
  `library:enqueue/run/status/retry/pause`. JSON guarda só jobs, não conhecimento/texto paralelo.
  Helper `start-library-queue.ps1` inicia Node oculto fora do chat; `-RetryFailed` retoma falhas
  com menos de três tentativas. Aguarda locks até quatro horas sem takeover. Sem auto-start no reboot.
- Agendados 20 PDFs + EPUB Anchor bloqueado (importador ainda não implementado).
  Worker real iniciado; snapshot durante execução: 41 documentos no banco, Wesley importado
  com 4.465 páginas, Mar Morto concluído (1.387 páginas/1.964 unidades/4.408 propostas),
  Beale em desmontagem. Doutrina Cristã incorporada sem texto, exige OCR. Consultar a fila/logs
  para estado atual; não considerar todos concluídos a partir deste registro.
- Falha transitória Windows EPERM na troca atômica do recibo interrompeu a estruturação Wesley.
  Adicionado retry limitado de rename sem apagar recibo vivo, testado; worker atualizado aguarda
  pausa normal do primeiro e retoma falhas/checkpoints. Recursos PDF.js de fontes/CMap/WASM locais.
- Backup consistente `workspace.sqlite3.before-library-queue-*` criado antes de alterar o acervo.
  Worker adquire o mesmo lock exclusivo de Vite/Docker, mantém posse até fechar SQLite; front pode
  receber 423 enquanto a manutenção processa. Não iniciar outro escritor nem remover lock vivo.
- Conferência durante execução: 232 propostas editoriais antigas com hash preservado, todos os
  24.057 comentários originais anteriores intactos. Novos documentos não foram certificados.
- Validação: 391 testes/54 arquivos passaram, typecheck, lint e build Node passaram;
  teste de integração nativo importa/desmonta PDF sintético, mantém EPUB bloqueado, verifica
  idempotência/FKs e recusa outro escritor. Sem redesign/frontend QA ou Docker nesta entrega.
- Fonte canônica: `docs/architecture/library-import-queue.md`. Pendentes: OCR onde necessário,
  EPUB, calibração contextual das novas fontes e isolamento/timeout forte por parser.

## Próxima prioridade editorial preservada (2026-10-16)

- Antes de expandir módulos, completar/operar o pipeline especializado nas Bíblias comentadas:
  separar texto/notas/margens, reconstruir livro-capítulo e notas entre páginas, distinguir
  comentário direto de mera menção, disponibilizar originais com página/fonte e auditar lotes.
- Reutilizar Python e serviços canônicos existentes; não criar motor ou banco concorrente.
  Relatório por fonte/livro/página com retomada e exceções. Nenhuma promessa de comentário
  individual onde a fonte só comenta um intervalo. Preservar as 116 notas existentes e revisões.
- Usuário interrompeu essa frente para ajustar animações do commit do colega `23e54fe`.
  Essa alteração visual não executa ingestão, reprocessamento ou leitura editorial adicional.
- Abertura agora roda por carga/recarga de documento, ignora a antiga chave localStorage e não
  repete em navegação interna. Hoje recebe revelação CSS tinta/papiro, pausada durante a abertura,
  com foco imediato e respeito a movimento reduzido.
- Verificação: 383 testes/52 arquivos, typecheck, lint e build passaram. Playwright local em
  1365×900 e 390×844 confirmou reload, Esc, replay, navegação interna, movimento reduzido,
  ausência de overflow horizontal e pageerrors. Cabeçalho mobile já quebra texto do botão de
  busca; dívida visual fora deste escopo. Imagem Docker não reconstruída nesta tarefa.

## Proposta adiada — Compor leitura (2026-10-15)

- Ideia registrada em `docs/architecture/reading-composer-proposal.md`: blocos conectáveis para
  compor texto, fontes e perspectivas, com consultas determinísticas, sem inferência LLM.
- Apenas documentação autorizada. Antes de implementar, priorizar cobertura contextual do acervo
  já entregue ao longo da Bíblia e ampliação das traduções realmente legíveis. 116 notas em
  passagens selecionadas de Gn 1–12 não significam cobertura completa desses capítulos.
- King James, NAA e outras Almeida são opções desejadas, não corpora declarados instalados;
  identificar edição/idioma/direitos antes de adquirir e integrar.

## Exclusividade do acervo (2026-10-15)

- Corrigido o protocolo de `8c58d9a`: heartbeat antigo não prova morte de processo Windows/Docker;
  não há takeover automático por timeout. Locks inválidos também falham fechados.
- API verifica posse antes das operações e após leitura assíncrona de uploads/comandos; heartbeat
  usa descriptor sem recriar lock ausente e qualquer falha suspende acesso. Importador contextual
  compartilha o lock até fechar SQLite, inclusive durante backup.
- Crash exige recuperação offline com todos os escritores parados. Atualizar todos os runtimes/
  imagem Docker; scripts/editores externos que ignoram o protocolo não são protegidos.
- Fonte canônica: `docs/architecture/installation-workspace.md`. Acervo privado não usado para
  testes de concorrência; sem alteração de schema, reprocessamento ou redesign nesta correção.
- Verificação: 360 testes/45 arquivos, typecheck, lint completo, build e formatação passaram.
  Inclui importador em processo separado e perda de posse durante streaming sem apagar registro.
  SQLite privado manteve tamanho/mtime; Docker não foi reconstruído nem iniciado nesta correção.

## Acervo compartilhado da instalação (2026-10-13)

- Escopo ativo: migração integral OPFS → pasta local do projeto/Docker e biblioteca/leitor reais.
  Leitura contextual editorial retomada em 14/10: 116 notas reais (Shedd, Genebra, MacArthur),
  seleção Gn 1–12. Não é cobertura integral nem revisão humana. Consulte a seção de leitura
  contextual abaixo e `docs/content/contextual-bible-reading.md`. Esta seção substitui a
  limitação histórica OPFS-only das notas abaixo.
- `SCRIPTORIUM_WORKSPACE_DIR` habilita adapter SQLite nativo autenticado por sessão local, header e
  origem. Sem configuração, o modo navegador/Cloudflare permanece OPFS; falhas não alternam bancos.
  Compose monta `data/workspace`; loopback single-user, não pronto para LAN/internet.
- Migração real preservou 37 PDFs/671.893.492 bytes, 26.243 páginas, 49.229 unidades, 388.961 propostas,
  137.375 decisões e eventos de Rastro. Original OPFS intacto. Pasta privada ignorada por Git/Docker;
  não confundir estar na pasta do repositório com ser publicado no Git ou incluído na imagem.
- Backup SQLite consistente `data/workspace/workspace.sqlite3.before-index22` e recibo local SHA-256
  verificado. Nenhum PDF foi reprocessado, aceito ou rejeitado para fazer a migração.
- Schema 22: índice parcial de secondary targets + união materializada dos IDs evita o scan causado
  pelo OR de additionalPassages. Teste verifica índices, deduplicação e esquema. Medição Windows real:
  Gênesis 1/200 relações 124 ms cold/91 ms warm; camada completa 184 ms. Em 14/10, camada completa
  pelo adapter HTTP/Docker retornou os 200 itens em 5.440 ms; não confundir o transporte com SQL nativo.
- Estante usa primeiras páginas reais via Poppler lazy, perfis por título explicitamente sugeridos;
  leitor tem estrutura/assuntos extraídos, dicionário FTS e links página+unidade com realce. Estrutura
  detectada ainda não é sumário editorial validado. Nag Hammadi localiza ocorrências nos volumes,
  não inventa limites de tratados/códices. Contexto editorial bíblico fica recolhido.
- Tradutor Marian inglês→português funciona no companion CPU com SentencePiece/Sacremoses e cache
  /models corrigido para uid1001. Proxy same-origin, botão visível, tradução preservada separadamente.
  Teste real Didaquê foi armazenado, mas mostrou qualidade ruim/omissões em trecho longo arcaico;
  não declarar tradução acadêmica fiel. Espanhol não implementado, botão informa indisponibilidade.
- Gates finais: 344 tests/44 arquivos e 11 Python tests, typecheck, lint e formatação passaram;
  imagem Node/Docker produzida e verificada com as alterações finais; build Cloudflare também passou.
  Docker reiniciado em 14/10 confirmou 37 livros/26.243 páginas/schema22, ambos serviços healthy.
- QA IAB anterior à interrupção: estante 37 livros em localhost3000 sem reimportar, dicionários com
  ocorrências reais de aliança, Nag Hammadi/Apócrifo de João na p.229, citação Shedd p.922 com um mark,
  tradução Didaquê persistida após recriação, leitor 390px sem overflow, console Docker limpo.
  Na retomada de 14/10, abas restauradas chrome-error foram bloqueadas pela política do navegador;
  não houve tentativa de contorno nem nova validação visual dessa retomada. Abrir a URL normal
  manualmente para uma nova rodada visual. A leitura contextual editorial integral não foi feita.
- Fonte canônica: `docs/architecture/installation-workspace.md`. Reset/deleção física compartilhados
  recusados; restore JSON grande, sincronização push entre browsers, HTTP Range e catálogo público
  metadata-only permanecem dívida documentada. Nunca subir Vite/Windows + Docker/Linux sobre o mesmo DB.

## Profile reliability integration (2026-10-12)

- Integrated coworker branch `origin/melhoria/confiabilidade-perfis` into
  `melhoria/verificacao-no-versiculo` with a merge, preserving published history and seven local
  contextual-reading files in checkpoint `e45cafe`; merge commit `c305963`.
- Canonical payload keeps reference zones, profile-specific roles and optional contextual analysis.
  Contextual importer uses the shared secure-context hashing helper; trace explanations recover
  from the canonical analysis after quote-redacted structural backup restore.
- Five synthetic integration tests cover evidence offsets/errors, idempotent import and human
  rejection preservation, profile/analysis coexistence, backup restore and atomic prevalidation.
- Verification: 339 tests / 43 files, typecheck, full lint and production build passed. Browser QA
  opened the real 37-book OPFS catalog, contextual-import disclosure, Shedd's profile selector and
  Genesis 1; explanations toggled off/on and console had no warnings/errors. No private content
  was imported, reprocessed or newly committed.
- Existing-document reference-zone fixes still require explicit reprocessing. Whole-library
  contextual reading is paused, not completed by this integration.
- Structural rebuilding of a book with contextual analysis now refuses before deleting units;
  span reconciliation is still required before safely reprocessing those notes. Existing books
  without assistant contextual notes retain their normal reprocessing flow.

## Knowledge trace module (2026-10-12)

- `/trace` joins real proposals/decisions/private document spans; paginated filters and detail with
  rationale, source page, scheme, original unit and timeline. Private Reader cards link directly.
- Migration 020 captures proposal/decision changes with SQL triggers; legacy records get an honest
  baseline snapshot. Reprocessing retains history by old proposal ID; deleting a document cascades it.
- Backup v3 optional traceEvents preserves history and suppresses artificial restore events within
  the transaction. No book corpus was newly analyzed by this UI delivery.
- Canonical spec: `docs/architecture/knowledge-trace.md`. Migration 021 indexes paginated queries.
- Verification: 256 tests in 37 files, strict typecheck, full lint and production build passed.
  Browser QA recovered the persistent collection after a transient memory fallback, opened a real
  Shedd link to physical page 935, and filtered Genebra references at Genesis 1:1. No editorial
  analysis, acceptance, rejection or book reprocessing was performed during this read-only QA.
- OPFS baseline history survived closing/reopening the browser tab on the same origin. Final
  clean-tab console had no warnings/errors; mobile 390 px and desktop 1280 px had no global overflow.

## Gamified visual study tree (2026-10-11)

- Follow-up: every map node now navigates to its own `/study/guide/$topic` page; the center is
  Teologia and the former right node inspector is removed. The previous inspector behavior below
  describes the first iteration and is superseded by this navigation contract.
- Sixteen distinct guides use editorial curricula plus bounded private-page FTS and verified
  manifest resources. Search occurrences are not presented as approved semantic knowledge.
- Personal investigations resume via stable `study-guide:<id>` markers, with legacy title fallback;
  guide questions use existing ResearchQuestion persistence and workspaces link back to their guide.
- Follow-up verification: 247 tests in 36 files; strict typecheck, full lint and Node production
  build passed. Browser QA verified real PDF pages, duplicate-question prevention, guide/workspace
  navigation, clean console and 390 px layout. Guide-only router scroll reset preserves Reader.

- `/study` now opens a visual learning map inspired by a skill tree, while preserving the academic
  workstation identity. Four journeys connect eleven existing source-backed study paths.
- Node state is honest and derived from current data: an exact matching local study means started;
  a path with sources is available; a path without source resources is an explicit collection gap.
  No XP, mastery score or completion is fabricated.
- Selecting a node shows contextual description, real starting works and the next action. Starting
  creates the existing SQLite-backed `Study`; continuing opens its current workspace. Personal
  investigations and workspace backup remain available in a dedicated view.
- The Knowledge route remains the free graph mode. Study-map edges are pedagogical organization,
  not theological truth claims or ontology relations.
- Canonical graph content and derivation live in `src/lib/content/study-learning-map.ts`; rendering
  lives in `src/components/study/study-learning-map.tsx`.

## Functional front-end restructuring (2026-10-10)

- Home rotates a real daily passage across all installed chapters and persists the last chapter in
  localStorage. It never fabricates exegesis/hermeneutics for uncovered passages.
- Scripture navigation is grouped by literary/canonical blocks; additional traditions remain an
  explicit group rather than being mixed into the 66-book order.
- Study is the primary learning tree and links to Knowledge as a deeper concept map. Knowledge was
  removed from primary navigation but its route and graph remain available.
- Library catalog has focused views for private books, installed primary sources, Nag Hammadi and
  bibliographic records. PDF import/OCR/linking/audit moved to `/library/process`.
- Passage and word inspectors hide empty tabs. Private passage cards foreground extracted claims
  and arguments and collapse the source excerpt. English lexicon translation is now foregrounded.
- Search offers intent examples and result-group filters over the existing SQLite-backed service.

## Front-end experience foundation (2026-10-10)

- Canonical UX direction: `docs/architecture/frontend-experience.md`. Preserve the dense academic
  workstation identity, but organize the product into reading, library and investigation contexts.
- The passage/word inspector is now route-scoped to chapter reading. Library, Study, Knowledge,
  Search and other general routes no longer sacrifice space to an empty biblical inspector.
- Library pipeline controls use progressive disclosure; the catalog remains the primary surface.
- Knowledge Explorer now filters entities and omits empty relation cards, replacing an entirely
  empty graph with one honest explanatory state.
- Translation is already exposed for English primary-source units, accepted English private units
  and eligible word definitions. Private batch translation and the configured Docker model remain
  English-to-Portuguese only; Spanish-to-Portuguese is not implemented yet.
- Verification: 229 tests across 31 files, typecheck, repository lint, Node production build and
  desktop/mobile browser QA passed. Browser QA covered contextual inspector visibility, pipeline
  disclosure, Knowledge filtering, 390 px overflow and clean-console fresh-page loads.

## Contextual private knowledge engine (2026-10-02)

- Workspace schema 14 preserves reviewed proposals while adding explicit bibliographic reference,
  attribution and coreference proposal kinds. The deterministic analyzer carries bibliography,
  recent-person and recent-work context across its 50-page checkpoints.
- The optional Python service now implements the same bounded `analyzeBatch()` contract and returns
  a serializable provider checkpoint. The client accepts only loopback endpoints, validates output
  with Zod, rejects proposals for units outside the submitted batch and keeps every result
  `machine-proposed`.
- Private PDF batch import continues after per-file failures, detects Portuguese/English/Spanish and
  Greek/Hebrew script conservatively, reports partial text layers and accepts files up to 256 MiB.
  OCR remains explicit future work; protected bytes/text remain OPFS-only.
- Python development is pinned to 3.13.3 through `.python-version`; npm semantic commands prefer the
  local venv or Windows `py -3.13`, avoiding the stale `python` 3.10 PATH alias.
- Client chunking separates React runtime from the application entry. The final measured entry fell
  from 550.03 kB to 372.11 kB (React runtime 189.73 kB) without raising the warning threshold.
- Browser QA imported the 37 PDFs found in the user's private library into OPFS: 31 were indexed and
  six were rejected explicitly because they have no extractable text layer and require OCR. Protected
  bytes and extracted text remain local and are not tracked by Git. Checksum reimports corrected
  metadata without duplicating documents.
- The contextual analyzer was exercised end-to-end against the local Python service. Reprocessing a
  21-page document produced 260 reviewable proposals; a detected lowercase false attribution was
  eliminated by the deterministic guard, and the browser console remained clean.
- Fast Refresh ESLint exceptions are restricted to known stable component helpers/hooks; all eight
  previous warnings are gone while the rule remains active.

## Local pipeline implementation milestone (2026-10-04)

- Architecture: `docs/architecture/local-knowledge-pipeline.md`; local companion setup in
  `services/semantic-engine/README.md`. Extension of canonical units/proposals, not a duplicate engine.
- Workspace migration 15: jobs/configuration/checkpoints, unit receipts, publication/audit decisions,
  OCR layouts. Optional backup-v3 fields preserve compatibility with older checksums.
- Scanned originals can now be imported; Tesseract recovers only empty pages. Native PDF geometry is
  retained on new text-layer imports. Existing text/evidence is never overwritten by OCR.
- Companion: bounded loopback-only OCR/index/link endpoints; optional global multilingual CPU vector
  retrieval plus FTS and cosine rerank; candidate-constrained JSON LLM output and literal UTF-16 spans.
- Front: per-book preparation, OCR languages, model toggle, scheme confirmation, pause/resume, audit
  sampling and bulk review/revocation. Inspector distinguishes private machine links from editorial review.
- Inferential auto-publication remains blocked pending evaluation; explicit reference auto-visibility
  requires verified source numbering and corpus resolution. Author/bibliography/coreference still heuristic.
- Validation: typecheck, focused ESLint, Ruff, Python 3.13.3 syntax and production build passed;
  migrations reapplied to an in-memory SQLite database at version 15 with zero FK violations.
- Deferred at user request: automated suites, real OCR/model processing, performance and browser QA.
  No new PDFs were processed during this code-only stage. Concurrent tabs/job leases, neural structure,
  cross-encoder and calibration remain debt. Rebuilding canonical units invalidates private derived audits.

## Canonical private knowledge consolidation details (2026-10-01)

- Workspace schema 13 migrates accepted `semantic_segments` passage/domain results into canonical
  `semantic_units` and `knowledge_proposals`. Production UI and Passage Inspector no longer query
  the legacy semantic engine; its service/repository remain deprecated compatibility surfaces.
- Library now lists persisted private documents after reload. Backup schema v3 preserves private
  document identity, structure, spans, review decisions, translations and translation-job state,
  but deliberately exports empty page anchors rather than protected text. Reimport of the original
  checksum rehydrates those page IDs without deleting derived knowledge.
- Knowledge Explorer now consumes supporting/opposing arguments, evidence, objections, responses
  and multidimensional perspectives. Private passage knowledge renders arguments, premises,
  citations and entities in addition to claims/topics/translations.
- Immutable knowledge builds use the epoch migration timestamp and a byte-for-byte reproducibility
  test. Curated claims now include actual evidence and perspective links instead of schema-only
  support.
- Local English-to-Portuguese translation resolves Hugging Face aliases to a commit SHA, separates
  model-info and inference timeouts, persists batch progress and supports pause/resume through the
  checksum cache. `main` is rejected as cache identity.
- The document analyzer provider boundary remains canonical. Deterministic analyzer v2 improves
  claim-kind and qualifier classification and processes 50-page batches with a serialized
  hierarchy/ordinal checkpoint. Failed runs resume after the last committed batch with idempotent
  inserts. Full author/citation/coreference understanding remains future work; optional providers
  only gain resumability when they implement `analyzeBatch()`.

## Passage aggregation and editorial gate (2026-10-01)

- Workspace schema 12 keys local translations by provider model revision and expands controlled
  semantic domains for social/political history, tradition, soteriology, eschatology and religious
  currents.
- Accepted private-book passage relations now resolve to their citeable semantic unit, sibling
  accepted proposals, physical pages and optional local translation in Passage Inspector. This is
  a private overlay; curated knowledge remains read-only and separate.
- Passage Inspector exposes an honest 15-area coverage matrix. Pending links do not count as
  coverage.
- The deterministic resolver supports full pt/en references, same-chapter continuations and
  context-bound relative verses; exact per-chapter verse counts remain future work.
- Accepted English units can be translated in batch, without tokenizer truncation, and translations
  have an explicit human-review action.
- Claims and arguments can declare an interpretive perspective. Editorial staging always has
  `publicationAllowed: false` and blocks private rights, missing passage or missing evidence before
  any future curated import.

## Book Decomposition Pipeline v1 (2026-10-01)

- Workspace schema 11 adds private `document_nodes`, multi-span `semantic_units`,
  `semantic_unit_spans`, reviewable `knowledge_proposals` and versioned
  `document_knowledge_indexes`. No proposal writes to the public knowledge snapshot.
- `DocumentKnowledgeAnalyzer` is the provider boundary. The deterministic v1 implementation
  detects book/part/chapter/section/bibliography structure, joins simple cross-page continuations
  and proposes topics, passage relations, claims, arguments, quotations and controlled entities.
- Proposal IDs include a payload fingerprint. Reprocessing is idempotent and preserves accepted or
  rejected decisions, including edited claim text, when the semantic proposal remains the same.
- The private document reader now exposes Structure, Review and Aggregate views. Export is explicit,
  local-only JSON (`scriptorium-private-knowledge-export-v1`) marked as requiring rights review.
- Verification: strict typecheck passed; focused ESLint passed; 24 focused tests passed; direct Vite
  client/SSR/Nitro build passed. Direct full Vitest without `pretest` remained blocked by local
  corpus SQLite files whose checksums differ from the committed registry after a Node 24 rebuild;
  this is the previously identified cross-toolchain artifact reproducibility issue.
- Next safe actions: browser QA with a real text-layer PDF; add golden-layout fixtures for footnotes,
  bibliographies and complex tables of contents; pin the binary corpus build toolchain.

## Semantic content engine (2026-09-30)

- Workspace schema 10 adds page-offset semantic segments, controlled domain classifications,
  reviewable passage-link candidates and cached local translations. Deterministic extraction is a
  reproducible baseline; scores describe pattern matching, never theological or historical truth.
- A candidate link starts as `machine-proposed`. Only accepted links surface back in the biblical
  Passage Inspector. Protected PDF text and its derivatives remain in the browser workspace and do
  not enter distributable corpus packages.
- English primary-source units and English Greek/Hebrew lexical definitions can be translated on
  demand by the optional Python service using `Helsinki-NLP/opus-mt-tc-big-en-pt`. Original text is
  always preserved, translations are cached by checksum/model and labeled machine-generated.
- No configured “Premier 18”/18B model was found. Translation provider/model remain replaceable;
  the Python service is a separate Docker profile and does not alter the Node, Lovable or Cloudflare
  production targets.
- Repository research identified Sefaria, ETCBC/BHSA, Open Scriptures morphhb/Strong's and Concord
  as useful architectural/data references. Every future import still requires per-artifact rights
  and provenance review.
- Six commercial PDFs are currently tracked in `livros/` by user-authored commit `ffe3b8a`; do not
  derive and publish their text. Runtime analysis of user-owned copies remains local-only.

## Phase 10.2 (2026-09-25)

- The primary-source runtime now includes the Coptic SCRIPTORIUM Gospel of Thomas (CC BY 4.0) as prologue, sayings 1–114 and colophon. It is explicitly a Sahidic Coptic source text with no translation.
- The Library has a complete metadata catalog of 13 Nag Hammadi codices and 52 tractate witnesses. Repeated witnesses remain distinct; catalog presence is not presented as installed text.
- Public-domain historical English editions add Augustine's complete Confessions (13 books) and all four Project Gutenberg parts of Aquinas's Summa Theologica (2,661 addressable articles) as work-sharded SQLite/FTS packages.
- Source acquisition is pinned by URL, revision/eBook id, byte size and SHA-256 through `npm run content:fetch:theology`. A modern complete Portuguese Nag Hammadi translation is not bundled; it requires explicit redistribution permission or private OPFS import.
- Study now exposes source-backed starting paths for exegesis/reception, patristics, Trinity/Christology, ethics/soteriology, Nag Hammadi and ecclesiology/liturgy. The routes open installed primary works rather than displaying methodological prompts as content.
- Phase 10.2 verification passed 139 tests across 20 files, typecheck, focused ESLint and the full client/SSR/Nitro build. A repeated corpus build reused all ten packages; browser QA covered Thomas, Aquinas, Study and Knowledge, including Portuguese presentation labels and per-volume citations.

## Docker deployment (2026-09-28)

- Local/self-hosted packaging uses a multi-stage Node 22 image around the existing Nitro `node-server` output. Runtime is non-root, read-only and needs no server-side data volume because mutable studies, notes and private documents remain browser-owned in OPFS.
- Remote browser access must terminate HTTPS to retain the persistent OPFS path; plain HTTP outside `localhost` can force the visibly degraded in-memory workspace.

## Phase 10.1 (2026-09-16)

- Primary-source runtime now packages seven Apostolic Fathers works and five historic creeds/conciliar documents from pinned public-domain Project Gutenberg artifacts into work-sharded SQLite plus FTS5 search shards.
- Ancient reception now includes 65 navigable units from Books I-II of Origen's Commentary on John, extracted from the public-domain 1885 ANF IX Internet Archive/Cornell scan. John 1:1 links directly to Book II section 2 and the Reader history tab opens the exact primary-source unit; this is classified as reception history, not as an automatically accepted grammatical or theological conclusion.
- Phase 10.1 passage analyses were migrated from the wrong canonical-anchor JSON shape to the Knowledge `TextAnchor` shape and from nonexistent lens IDs to `philological`/`exegetical`; Genesis 1, Philippians 2, Romans 3, Mark 1, Psalm 22 and the new Origen reception entry are now queryable by the Reader. Knowledge claim labels and source-checked states render in Portuguese, and authored claim summaries were localized while original-language tokens and primary-source text remain unchanged.
- Primary-source titles have a Portuguese presentation label while preserving the canonical English source title; source text is never translated silently. The `/library` route is now a proper layout with `/library/` index and `/library/read/$workId` child, so the actual reader renders instead of the parent catalog swallowing the child route.
- WLC/OSHB morphology now has a positional decoder; TBESH contributes Hebrew identifiers, lemma, transliteration, morphology and short glosses only. Long TBESH definitions remain excluded because the source header requires separate permission.
- Corpus builds use package fingerprints and verified artifact reuse. A clean no-change corpus index completed in about 2.4 seconds and reported all five editions as reused; changing the Hebrew lexical input rebuilt only WLC.
- Study UI is organized as a three-step personal flow (question, gathered material, notes). Backup and methodological prompts use progressive disclosure, and the prompts explicitly state that they are not academic content.
- Private PDF ingestion is operational for documents with a text layer: originals stay in OPFS, page text is stored in workspace SQLite/FTS5, and results open at the physical page. EPUB/OCR remain unimplemented.
- Phase 10.1 verification snapshot before the Origen increment: 122 tests across 16 files passed; typecheck, production Node build and focused lint passed. Repository-wide lint is still blocked by pre-existing CRLF/Prettier debt. Browser QA passed desktop Study, Study detail interaction, Didaquê reader routing/localization and 390x844 mobile Study with no console warnings/errors.

## Phase 9.5 (2026-09-14)

- Canonical knowledge schema is version 9; knowledge, theology, perspectives and arguments share `public/knowledge/knowledge.sqlite3`.
- Corpus schema is version 11; global FTS uses compact contentless search shards and indexed address joins, while Reader opens only the selected work shard.
- Phase 10 imports WLC/OSHB v2.2 from pinned commit `6a5db284c715c18b239422e57bb89684e6a19f00`: 39 books, 929 chapters, 23,213 verses and 305,507 tokens. WLC text remains Public Domain and OSHB annotations CC BY 4.0.
- TBESG is now an operational SQLite lexical package with 11,035 source records, normalized lexical references and lazy Word Inspector lookup; it is no longer merely a downloaded source artifact.
- `content/packs/phase10-content-v0.2.json` adds source-backed John 1:1–18 observations, draft machine-assisted analyses, Apostolic Fathers metadata and council identities. Draft analyses are not human-reviewed.
- Production fixture fallbacks for knowledge sources, `LibraryResource`, demo lexicon definitions and demo occurrences were removed from Reader/Search paths.
- `Scriptorium Content Seed v0.1` lives in `content/scriptorium-content-seed-v0.1.json`; editorial taxonomy is explicitly separate from source-derived claims.
- Workspace schema is version 9 and backup schema is v2. Migration 9 adds private documents, page-preserving text and a dedicated FTS5 index. Backups cover library/research metadata but intentionally exclude private PDF bytes and extracted protected text; those documents require reimport after restore.
- TBESG acquisition is pinned in `content/source-lock.json`; run `npm run content:fetch:lexicon` to fetch and verify it.

## Project identity

- Purpose: Open, local-first Biblical Knowledge OS for reading, research, library, study and evidence-aware knowledge connections.
- Repository root: `F:\DSF\scriptorium-os`
- Main stack: TypeScript 5.8, React 19, TanStack Start/Router, Vite 8, Tailwind CSS 4, Radix primitives.

## Canonical sources

- Architecture and requirements: `README.md`
- Repository constraints: `AGENTS.md`
- Route conventions: `src/routes/README.md`
- Domain/contracts: `src/lib/domain/**`
- Demo data: `src/lib/fixtures/**`
- Tests/build: `package.json`

## Architecture map

- Modules: file routes; feature components; domain types; SQLite-backed corpus, knowledge and personal workspace repositories; workbench context.
- Dependency direction: passage routes/components -> Knowledge Engine -> repositories -> domain/corpora; general catalog views may use their own repositories.
- Important flows: route -> PassageRef -> PassageKnowledgeBundle -> reader/inspectors; selected token -> WordKnowledgeBundle -> TAGNT lexeme/concordance; user notes remain in workbench/local storage.
- Persistence: corpus packages are immutable work-sharded SQLite; curated knowledge is a separate read-only SQLite DB; sources and user research use a mutable Worker-owned SQLite database persisted through OPFS. Theme, reading preferences and package enablement remain localStorage preferences.
- Auth/security boundaries: no authentication or remote backend in phase 1.

## Non-negotiable constraints

- Source-first, tradition-aware, local-first and usable without an account.
- Never present DEMO/SEED material as sourced scholarship.
- No unauthorized copyrighted corpus, fake AI/RAG/interlinear engine or silent methodology mixing.
- Preserve the dense academic workstation identity.

## Active scope

- Requested outcome: Phase 10 content expansion over the Phase 9/9.5 runtime.
- In scope: Greek lexicon, full Hebrew/WLC linguistic layer, John 1:1–18 pilot, patristic and historical-document catalogs, real Synoptic Problem content and focused Reader integration.
- Out of scope after Phase 10.2: LXX, apparatus, the remaining Nag Hammadi source texts/translations, remote backend, IA/RAG, EPUB/OCR, automatic bibliographic merge and complete scholarly encyclopedic coverage.

## Decisions

- 2026-08-25 — model interpretive approaches as distinct study lenses with evidence kinds and source requirements — user request and source-first principle.
- 2026-08-25 — show honest empty/awaiting-source states instead of generated academic conclusions — README requirements.
- 2026-08-26 — separate token occurrences from lemmas and identify occurrences by edition, text unit, passage and position — Knowledge Core requirements.
- 2026-08-26 — model `TextAnchor` as a discriminated union and keep Study Lens separate from Perspective — prevents string identity and methodology/tradition conflation.
- 2026-08-26 — separate bibliographic `SourceReference`, concrete `SourceFragment` and cataloged `LibraryResource` — copyright and provenance requirements.
- 2026-08-26 — use semantic support/review states for claims and relations; numeric confidence remains deprecated compatibility only — avoids false precision.
- 2026-08-26 — keep `ScriptureKnowledgeEngine` as repository orchestration in `src/lib/knowledge-engine/` — no UI, persistence or AI responsibilities.
- 2026-08-26 — primary product locale is `pt-BR`; internal technical/domain language remains English; corpus and document language remain independent from UI locale — localization phase requirements.
- 2026-08-26 — use a local typed semantic-key catalog in `src/lib/i18n/` with presentation helpers instead of translating domain values, canonical IDs, URLs or saved records — preserves architecture and legacy data.
- 2026-08-26 — represent edition direction independently (`ltr`/`rtl`) and infer controlled fallback from document language — enables Greek, Hebrew and Aramaic without coupling bidi behavior to UI locale.
- 2026-08-26 — make `CorpusPackageManifest` the machine-readable source of truth for corpus identity, edition, artifacts, rights, provenance, capabilities, integrity and versification; Library rows may reference it through `corpusPackageId` — avoids parallel license/corpus architectures.
- 2026-08-26 — require SHA-256, byte size and retrieval metadata for every concrete `SourceArtifact`; candidate packages have no placeholder artifact and remain `not-verified` until a file is actually received — preserves honest chain of custody.
- 2026-08-26 — preserve immutable source artifacts separately from normalized derivatives, transformations and internal dataset/record receipts — makes future ingestion reproducible without overwriting originals.
- 2026-08-26 — `CorpusRightsGate` permits bundling only for `verified` rights with redistribution explicitly `yes` and structured attribution when required; all other statuses block — safety policy, not legal advice.
- 2026-08-26 — split WLC text from the OSHB lemma/morphology layer; keep STEPBible at per-subdataset review and Bíblia Livre at `conflicting-metadata` until a concrete edition/artifact is selected — official notices and candidate requirements.
- 2026-08-27 — pin SBLGNT 1.2 to upstream commit `736fdc76158950c3d04b949b7e013ca14305145a`; preserve all 28 source XML artifacts as original bytes and calculate the package digest with code-point-sorted source paths — reproducible acquisition independent of locale.
- 2026-08-27 — keep acquisition, verification, import and build as distinct commands behind a generic `CorpusAdapter`; the SBL adapter rejects DTD/entity declarations and maps one book at a time into chapter shards — bounded memory and fail-closed XML handling.
- 2026-08-27 — serialize loaded chapter data through the TanStack route loader and prime the repository cache before client render — SSR and client now share identical corpus/provenance state without hydration mismatch.
- 2026-08-27 — pin TAGNT/TEGMC to `efe428a0047bf7b9c3ce2624f60c252c6e435945`; keep textual tokens immutable and linguistic annotations in a separate dataset — source separation and reproducibility. Canonical details: `docs/corpora/stepbible-tagnt.md` and `linguistic-alignment.md`.
- 2026-08-27 — accept unique edition-aware sequence links; keep ambiguous/unmatched targets without analysis and audit both target and unused source records — coverage is measured, not inferred.
- 2026-08-27 — compact SBL chapter storage v2 by removing whitespace and four inherited fields only; reconstruct prior domain exactly; lazy linguistic chapters and 256 lexical buckets — preserve identity without loading the entire NT for concordance.
- 2026-08-27 — TAGNT headers include CC BY 4.0/software permission and a redistribution-centralization request; retain both notices and document the operational interpretation. Exclude translations/glosses from runtime; raw source publication still needs review — no blanket STEPBible rights grant.
- 2026-08-27 — generated TAGNT publication uses exclusive writer lock, identical-tree no-op, backup and rollback after a Windows/Vite rename failure — preserve the previous derived snapshot on failure.
- 2026-09-06 — pin official Bíblia Livre N4 to `a315a15e9f4d01883b62206fe441d57762f126b3` and ingest 66 F4 files plus README/license directly — avoid eBible metadata mixing and opaque conversion.
- 2026-09-06 — retain the generic conflicting-metadata candidate while bundling a distinct source-specific CC BY 3.0 BR package — rights evidence is package-scoped and historical evidence remains intact.
- 2026-09-06 — use canonical PassageRefs to combine BLIVRE N4 and SBLGNT while keeping `PassageKnowledgeBundle.texts[]`, originals and TAGNT provenance independent — passage alignment is not word alignment.
- 2026-09-06 — recognize F4 notes/titles/additions; exclude notes/titles from visible verse text, preserve added text, and never invent absent paragraph markers — source-faithful transformation.
- 2026-09-08 — make `PassageKnowledgeBundle` the official composition unit for passage UI and add `WordKnowledgeBundle` for occurrence-level inspection — components no longer orchestrate textual and linguistic repositories.
- 2026-09-08 — resolve corpus sources and fragments from package/artifact provenance in the engine; retain demo knowledge as `demo` and real TAGNT ambiguity as `ambiguous` — prevents empty/demo/real states from collapsing into one meaning.
- 2026-09-10 — make stable `TextUnit.id` the textual identity and keep human addresses scheme-dependent; direct overlap requires the same versification and cross-scheme comparison requires an explicit N:M crosswalk — verse numbering is not universal identity.
- 2026-09-10 — use per-edition SQLite/FTS5 packages behind `CorpusStorage`, with SHA-256 verification, schema migrations and lazy opening through SQLite WASM — large corpora no longer govern the Vite module graph.
- 2026-09-10 — import TAGNT alignments, lemmata, morphology and provenance into the SBLGNT SQLite package; concordance queries use an indexed lexeme identity instead of generated JSON buckets — one effective corpus runtime.
- 2026-09-10 — distinguish Topic, Doctrine, Tradition, School, Method, EpistemicStance, InterpretiveFramework, Position and Theory; compose them through multidimensional perspective profiles — avoids categorical conflation.
- 2026-09-10 — retain claims as propositions and model premises, evidence, objections, responses and competing theories as a typed argument graph — no automated theological winner or truth score.
- 2026-09-13 — shard corpus delivery by work; use a dedicated compact cross-work linguistic index for concordance while retaining the complete SQLite index only for global text search. Cache API installation and SHA-256 verification stay behind `CorpusPackageRegistry` — bounds Reader and lexical transfer without requiring a range server.
- 2026-09-13 — persist user-owned sources, citations and research in a dedicated Worker-owned SQLite database using the OPFS SAH-pool VFS, with an honest in-memory degraded state — separates mutable private data from reproducible corpora and curated knowledge.
- 2026-09-13 — model Author, Work, Edition and Source independently and store citations as structured locator/content/relation records — enables traceability without turning source presence into truth.
- 2026-09-13 — import CSL-JSON, BibTeX and RIS through preview, normalization, validation, duplicate detection and report; conflicting duplicates are skipped rather than merged destructively.
- 2026-09-22 — quarantine the Wikisource Tradução Brasileira from distributable runtime packages because US hosting does not establish Brazilian public-domain status; preserve the artifact only for rights review.
- 2026-09-22 — pin the official eBible porbrbsl USFM ZIP (SHA-256 52eae6cc562494ac9d68e618e271ff764628dec34017cc2a4f37fd446f3e66bd) as the public-domain Portuguese expansion; label it as a draft in active revision and preserve all 81 works without treating its collection as a universal canon.
- 2026-09-25 — ingest user-owned PDFs only into private browser storage: keep original bytes in OPFS, index page text in workspace SQLite/FTS5, derive stable IDs from SHA-256, make checksum reimports idempotent and never add protected files/text to Git or public corpus packages.
- 2026-10-05 — orchestrate the complete private library through the existing canonical knowledge pipeline, persisting run/document state and continuing after isolated failures; do not introduce a competing analyzer or storage path.
- 2026-10-05 — represent contextual passage reach as one primary target plus bounded additional targets, with explicit verse/range/pericope/chapter/book scope; keep source edition and versification provenance on every relation.
- 2026-10-05 — release explicit reference links under their own policy and keep inferred links withheld behind deterministic distributed batch samples; accepting a sample is an operational publication gate, not proof of theological or statistical truth.

## Current state

- Completed: phases 1–8 plus the Phase 9 implementation foundation for delivery, source/citation/library and persistent research.
- Completed: Phase 9 implementation and final validation, including OPFS reload/restart persistence, workspace export/wipe/import, idempotent bibliography, mutation refresh, measured delivery, compact concordance, client-only corpus runtime during SSR and separate Node/Cloudflare builds.
- Data: 142,096 TAGNT records processed; 137,074/137,741 targets aligned (99.5158%): 82,918 exact, 53,740 normalized, 416 positional, 75 ambiguous, 592 unmatched. 5,621 lexical identities; 27 books/260 chapters. John 7:53–8:11 retains all 187 textual tokens with no accepted TAGNT link.
- Storage: SBL generated 74,746,655 → 23,829,469 bytes (-68.12%); generated TAGNT 33,726,686 bytes. Exact metrics and timing in `docs/corpora/phase5-metrics.json`.
- Bíblia Livre: 68 artifacts, 4,582,764 source bytes; 66 books, 1,189 chapters, 31,101 verses; 1,167 notes, 116 psalm titles, zero explicit paragraphs; 8,472,398 generated bytes. One explicit anomaly: Mark 5:19 omitted in N4.
- Known issues: repository-wide CRLF/Prettier debt remains. The generic Bíblia Livre candidate remains blocked, while only the official pinned package is bundled. Knowledge/interpretation/bibliographic fixtures remain DEMO. F4 notes/titles are audited but lack their own editorial UI. No Portuguese word alignment, LXX or aparato crítico. Global text FTS still opens the complete edition index; concordance now uses a 60,268,544-byte linguistic index and Reader paths use work shards. Browser workspace persistence requires OPFS support; unsupported contexts run in visibly degraded memory mode. Private PDF ingestion, deterministic structure/linking and optional OCR exist; OCR requires Tesseract/idiomas locais e EPUB permanece futuro.
- Verification performed: Phase 9 passed 106 tests across 11 files, typecheck, focused lint, Node production build and Lovable sandbox Cloudflare build. Browser QA covered João 1, OPFS across reload/server restart, immediate source-list invalidation, duplicate import, λόγος with 328 paginated occurrences and a clean console. A byte-counting proxy observed 31,744,000 corpus bytes for João versus 358,256,640 monolithic bytes; concordance transferred only the 60,268,544-byte linguistic part. Direct SSR returned the client loading shell without SQLite/OPFS initialization. Repository-wide lint remains blocked by the pre-existing line-ending/Prettier debt snapshot.
- Phase 10.1 continuation: imported the public-domain 1885 ANF IX OCR source for Origen's Commentary on John Books I-II as 65 stable primary-source units and a 1,908,736-byte work-sharded SQLite/FTS5 package. John 1:1 now links to exact unit II.2 through a source-backed reception-history analysis. Final verification passed 126 tests across 16 files, typecheck, focused ESLint and Node production build; a no-change corpus rebuild reused all six packages. Browser QA opened the exact II.2 unit, confirmed real global FTS results and a clean console. Repository-wide lint still reports 2,974 pre-existing formatting/CRLF problems.
- Phase 10.1 content continuation: imported the public-domain eBible Bíblia Portuguesa Mundial draft as 81 works, 1,402 chapters, 38,029 text units and 2,311 detected editorial notes. Added 15 Portuguese deuterocanonical/other apocryphal works to navigation and work-sharded SQLite/FTS delivery. Wikisource TBB is blocked from the public registry pending Brazilian rights review.
- Private library continuation (2026-09-25): six user-purchased Portuguese PDFs were imported locally as 4,280 physical pages, 4,261 with searchable text. Global search opens exact document pages; reload persistence and checksum-idempotent reimport were verified in the browser. The files and extracted content are not tracked by Git.
- Private library orchestration (2026-10-09): schema 18 persists workspace identity, whole-library runs, per-document stage state, document profiles, semantic-unit roles and review batches; an indexed unit/proposal lookup keeps deterministic resumptions bounded. Coverage reports missing text/OCR/structure/linking state, profile distribution, proposal policy and target/domain gaps. Reader selection can narrow the inspector to one verse; accepted private excerpts appear below the relevant verse with page/section/author metadata and obey the explanations toggle.
- Workspace consolidation (2026-10-10): the canonical OPFS origin is `http://127.0.0.1:5173` and now contains all 37 PDFs, 26,243 pages, 49,229 semantic units and a completed deterministic run (37/37, zero operational failures). It reaches 16,701 distinct verses; 60,036 relations are machine-visible and 77,339 remain in exception/review. The former six-book OPFS workspace was archived outside the live browser profile after a verified raw backup.
- The final raw OPFS backup is `C:\Users\comical\Documents\Scriptorium Workspace Backups\2026-10-10-final-workspace-consolidation`; its 1,187,467,264-byte main database file matches the canonical source by SHA-256 (`926C73C2B41FB23EB015459121391D9C28C4B9B1627D5861C58EECC9C1015FDC`). The retired six-book store is recoverable at `2026-10-10-retired-six-book-workspace` and the earlier before/after snapshots remain available.
- Reader consolidation (2026-10-10): schema 19 adds the passage lookup index; contextual proposal resolution now uses the already-computed publication set instead of a correlated scan and fetches only required document nodes/pages. A native Gênesis 1 diagnostic fell from about 28.2 s to 0.51 s. Browser QA on the 1.1 GB OPFS workspace showed 200 published links in Gênesis 1, source/page cards, filters, inspector coverage and a working clean-reading explanations toggle. OPFS cold startup remains around 30 s and the browser/WASM reader path around 18 s for the 200-item chapter cap.

## Next safe actions

- Add editorial rendering for F4 notes/titles and investigate Mark 5:19 against source evidence without renumbering.
- If translation/original alignment is added later, use an explicit dataset and algorithm; never infer Portuguese↔Greek links by position.
- Keep the 667 TAGNT residues unchanged unless explicit editorial evidence is introduced.
- Build a compact cross-work search/lexeme index or range VFS before global operations span substantially larger corpora; preserve the `CorpusStorage` boundary.
- Audit high-density explicit references and false positives by document profile; the completed deterministic run connects the library but does not make every extracted link academically correct.
- Install Tesseract with Portuguese/English/Spanish language data only when recovering the remaining 219 image-only pages; OCR no longer blocks the 37-document collection.
- Add EPUB support and improve structural section/citation extraction without weakening local-only privacy or provenance.

# Leitura contextual privada — 2026-10-14

- Incorporadas realmente 116 notas. Primeiros lotes: Shedd p. físicas 5–6 (Gn 1–3), Genebra p. 28–36
  (seleção Gn 1–2). Lote privado `genesis-shedd-genebra-20261014-01`, JSON/plano em
  `data/workspace/`; idempotência real: 0 importadas/48 reutilizadas. Não é leitura integral.
- Segundo lote: 3 notas MacArthur p. 37–39, Gn 1:26, 3:1–24 e 12:1–3,
  `genesis-macarthur-20261014-01`; reimportado 0/3. Snapshot completo de 48 notas
  verificado por IDs + ambos os pacotes permitem recuperação; `.partial` não é backup válido.
- Terceiro lote `genesis-shedd-genebra-20261014-02`: 65 notas novas, Shedd p. 7–11
  (seleção Gn 3–12), Genebra p. 38–41 (seleção Gn 3–4). Importado 65/0 e repetido 0/65.
  Novos snapshots completos antes dessas operações preservam 51 e 116 notas. Não é cobertura integral.
- `content:import:contextual` usa serviço canônico + backup SQLite e exige runtimes parados.
  Não executar Windows e Docker escrevendo simultaneamente no bind mount.
- Reader mostra múltiplas fontes contextuais, links sublinhados para página/unidade;
  intervalos >7 versos recolhidos; consulta prioriza contexto antes do teto de 200 relações.
- A versão digital Genebra tem português e referências defeituosos no próprio PDF;
  limitação preservada nas notas. Não afirmar que a edição foi certificada.
- Continuidade: completar notas/capítulos na ordem bíblica; nunca converter citações
  cruzadas existentes em comentário direto sem leitura. Docs: `docs/content/contextual-bible-reading.md`.
- Marcadores editoriais: Shedd p. física 11, próxima nota `13.2`; Genebra p. física 41,
  após `4:01`, seguir na p. 42. Lacunas deliberadas incluem Shedd 5:24 (p. 7–8) e
  Genebra 3:2–5 (p. 37–38), 3:17 (p. 39–40): precisam recortes multi-página.
  O livro de exegese/hermenêutica ainda não recebeu um lote editorial nesta entrega.

# Comentários originais em escala — 2026-10-16

- Estado atual: workspace da instalação em `data/workspace/workspace.sqlite3`, schema 24;
  não é mais exclusivamente o OPFS antigo. Preservados os 37 documentos, 26.243 páginas,
  49.345 unidades preexistentes, 116 notas editoriais e 232 propostas associadas por hashes.
- Incorporados realmente 24.057 comentários originais adicionais: Shedd 11.876, Genebra 12.181.
  Extração Python percorreu 935/1.740 páginas e reconheceu os 66 livros de ambas as fontes.
  São 21.297 notas pontuais, 2.514 intervalos, 212 perícopes entre capítulos e 34 notas de capítulo.
  Notas pontuais: 16.276 endereços distintos; com intervalos/perícopes: 28.142. Não é cobertura
  individual integral, revisão humana de todas as páginas ou geração de novas interpretações.
- CLI `app.commentary_cli` usa perfis vinculados ao checksum, estrutura e negrito quando disponível;
  serviço TypeScript canônico valida citações literais, separa comparação/menção do alvo primário,
  importa transacionalmente com lock, backup e retomada. Nenhuma LLM necessária.
- Novas notas machine-proposed/machine-visible por política documental, auditoria pendente.
  Exceções incluem referências não contíguas, remissões sem explicação e texto incompleto;
  não foram corrigidas nem publicadas cegamente. Outros livros não reprocessados nesta execução.
- Migration 024 permite evidência compartilhada por unidades distintas, sem duplicar a mesma
  evidência dentro da unidade. Atualizar todos os runtimes antes de abrir schema 24. Docker não
  foi reconstruído: daemon indisponível. Reversão exige backup offline, não downgrade arbitrário.
- Pacotes privados finais: `shedd-commentary-publish-v1`, `genebra-commentary-publish-v1`.
  Auditoria: `data/workspace/commentary-baseline-20261016.json.verification.json`.
  Shedd reimportada 0/11.876; Genebra retomada com 100 reutilizadas/12.081 novas.
  `quick_check` e `foreign_key_check` passaram; backups privados completos preservados.
- Reader mostra comentário original literal, fonte/página sublinhada e trecho destacado ao abrir.
  Consulta separa orçamento contextual (2.000) de referências gerais (200); futura paginação
  necessária para fontes adicionais. Salmos 119 exibiu 342 cartões, filtro Shedd 256, toggle 0/256.
- Validação: 387 testes TS/53 arquivos, 54 Python, typecheck, lint integral, build Node, Ruff e
  mypy strict passaram. QA produção João 3, Salmos 119, citação/página/destaque e viewport móvel
  sem pageerrors; há dívida visual preexistente no cabeçalho/filtro de fonte em tela estreita.
  OPFS roundtrip e Docker não foram validados nesta execução. Docs canônicos:
  `docs/architecture/original-commentary-extraction.md`, `docs/content/contextual-bible-reading.md`.

# Wesley e Novo AT incorporados — 2026-10-16

- Estado mais recente substitui as contagens anteriores: fila encerrada (14 PDFs completos,
  seis originais sem texto aguardando OCR, um EPUB bloqueado). Workspace: 57 documentos,
  47.707 páginas físicas/45.905 com texto; todos os originais presentes.
- Incorporadas 18.427 entradas adicionais: Wesley 6.232 (5.302 notas pontuais NT + 930
  trechos de capítulo AT, não versos), Novo AT 11.248, recuperação Shedd 497/Genebra 450.
  Wesley em inglês; não foi gerada tradução. Não houve LLM ou revisão humana integral.
- Extração especializada `commentary_structured.py`: outline + layout checksum-pinned,
  offsets UTF16, serif/body vs boxes, falha fechada para marcadores corrompidos e capítulos
  faltantes no outline. Recuperação protege todos os spans contextuais antigos.
- Totais: 42.484 comentários originais + 116 editoriais = 42.600. Incluindo editoriais,
  20.089 endereços pontuais/30.477 com intervalos; 625 versículos instalados sem cobertura.
  1.189 capítulos com algum contexto, 87 completos por notas pontuais/1.028 com intervalos.
  Métricas dos 66 livros, não certificação de qualidade nem comentário individual universal.
- Baseline preservado: 57 metadados, 89.231 unidades genéricas anteriores, 232 propostas
  editoriais. SQLite integrity/FKs ok. Serviço canônico read-only confirmou idempotência
  0 novas/6.232 reutilizadas, 0/11.248, 0/497 e 0/450.
- Pacotes privados finais: `wesley-commentary-publish-v1`, `novo-at-commentary-publish-v3`,
  `shedd-adjacent-recovery-v1`, `genebra-adjacent-recovery-v1`; calibrações não publicadas.
  Auditoria: `data/workspace/commentary-baseline-second-sources-20261016.json.verification.json`.
- Gates: 391 testes TS/54 arquivos, 64 Python, typecheck, lint, build, Ruff/mypy passaram.
  QA produção: João 3 filtro Wesley 29 cartões/toggle; Gn 1 Novo AT 29; link p.48 com dois
  destaques; móvel sem overflow global/console errors. Cabeçalho/filtro móvel ainda têm
  dívida visual preexistente. Nenhum componente front alterado, Docker não reconstruído.
- Continuar por Jerusalém, Agostinho e Catecismo/confissões, depois léxicos/temáticos;
  preservar exceções, revisões e fonte literal. Não anunciar prioridades 3–7 concluídas.

# Patrística e confissões — 2026-10-17

- Entrega realmente incorporada: 1.935 vínculos em 23 lotes. João comentado Agostinho I:
  125/20 conferências; III: 133/48 conferências (duas sem referência principal resolvida).
  Gênesis: 388 contextos de obra; Sermão da Montanha: 129 contextos de obra, não versos.
  Catecismo: 1.018 citações de 669 parágrafos publicados; Augsburgo: 142 citações de capítulo
  em dez artigos. Total: 775 contextos patrísticos + 1.160 vínculos confessionais.
- `app.source_context` usa geometria/snapshot/checksum e o parser TS existente exportado por
  `export-source-references.ts`. Não há LLM. Evita listas internas como parágrafos do CIC e
  número de rodapé como ordinal de 1 João. Exclui lema/Análise editorial das conferências.
- `sourceContext` preserva tipo/localizador/caminho/autor/tradição; relações confessionais
  são `cites` + `proof-text`, não comentário universal. Sem destino explícito não há vínculo.
  Perfis calibrados por SHA-256; não aplicar a PDFs diferentes com o mesmo título.
- Jerusalém: não identificado aparato de notas no arquivo de 1.221 páginas; zero comentários
  inventados. Westminster: 33 capítulos reconhecidos, zero destinos explícitos nesse exemplar.
  Demais obras/volumes de Agostinho e Saltério sem crosswalk permanecem pendentes. OCR adiado.
- Schema atual 25: migration 025 normalizou 1.475 unidades deste namespace para `paragraph`,
  sem mudar IDs/texto/spans/revisões; protege unidades revisadas. Dois backups consistentes
  antes de importação/migration. Atualizar runtimes antes de abrir schema 25; sem downgrade vivo.
- Pacote privado final: `data/workspace/patristic-confessional-delivery-v1`, seis fontes.
  Fontes-base: `augustine-john-i-context-publish-v1`, `augustine-john-iii-context-publish-v1`,
  `augustine-genesis-context-publish-v2`, `augustine-sermon-context-publish-v2`,
  `catholic-catechism-context-publish-v1`, `augsburg-confession-context-publish-v1`.
  Auditoria: `patristic-confessional-baseline-20261016.json.verification.json`; idempotência
  real 0 novas/1.935 reutilizadas. Verificação read-only dos seis pacotes anteriores reutilizou
  os 42.484 comentários originais. Baseline, quick_check/FKs, 57 documentos e 232 propostas
  editoriais preservados. Nenhum job em andamento; originais/extração anteriores não alterados.
- Total contextual: 44.535 incluindo 116 editoriais; cobertura de comentários exclui textos-prova:
  20.090 endereços pontuais/30.491 com intervalos, 611 versículos instalados sem cobertura.
- Reader identifica confissão/tradição, conserva links sublinhados e recolhe exposições longas
  sem reescrever o conteúdo. Ordena trechos da mesma fonte por página/offset, não pela importação.
- Gates já executados: 395 testes TS/55 arquivos, 73 Python, build/typecheck/lint/Ruff/mypy.
  QA produção em 127.0.0.1:5173: João 2/Agostinho, João 3/CIC (21 cartões confessionais),
  expansão/toggle, citação p.119 com destaque, viewport 390×844 sem overflow global/console errors.
  Cabeçalho/filtro estreito têm dívida visual anterior. Docker não reconstruído. Documentação:
  `docs/architecture/patristic-confessional-context.md`, `docs/content/contextual-bible-reading.md`.
- Próximo: auditar exceções/alcances patrísticos finos, demais volumes de Agostinho e crosswalk
  do Saltério; obter aparato real de Jerusalém e tratar confissões sem inventar referências.
  Não anunciar leitura humana integral, cobertura individual universal ou todas as obras concluídas.

## Beale, Crisóstomo/Mateus e MacArthur — 2026-10-17

- `app.outlined_sources` e três perfis por checksum reutilizam o importador canônico, sem LLM.
  Incorporados 1.414 vínculos: Beale 391 (120 seções/419 páginas, 11 livros do NT), Crisóstomo
  521 (424 + 97 de recuperação, 85 lemas/895 páginas), MacArthur 502 (contextos de 66 livros).
  Beale mantém 410 marcadores em exceção/27 páginas duplicadas; não anunciar integração integral.
- Recuperação das homilias exclui folios/cabeçalhos de 11pt e desconta os spans existentes antes
  de formar blocos. Não sobrescreveu os 424 iniciais. Introduções/índices não viraram exegese.
- Campo opcional `sourceVisual` exige legenda literal na própria página citada. Três mapas
  MacArthur conferidos nas páginas 36/81/407; não são fotografias arqueológicas. Painel direito
  mostra contexto geral identificado, fonte/página e imagem lazy via endpoint local autenticado.
  `covers/<sha>?page=n` usa cache privado e limites de documento; capa antiga preservada.
- Dados continuam em `data/workspace`, não Git/Docker image. Dois backups consistentes antes
  dos lotes; baseline, quick_check/FK e idempotência 0 novas/1.414 reutilizadas passaram.
  Total contextual 45.949 incluindo 116 editoriais; cobertura com intervalos 30.559 endereços.
- 397 TS/55 arquivos, 81 Python, typecheck/lint/build/Ruff/mypy passaram. Teste concorrente com
  build pegou checksum transitório; repetido após build passou, sem enfraquecer integridade.
  QA produção desktop/móvel: mapa Josué 11, fonte p.81 com mark, filtros Mateus, ausência em
  Êxodo, teclado/lazy; sem erros de aplicação. Cabeçalho móvel estreito é dívida anterior.
  Preview encerrado/lock liberado; Docker e tradução não reconstruídos. Próximo: calibrar
  marcadores Beale restantes, mapear referências internas das homilias e classificar outros
  mapas/imagens do acervo. Guia: `docs/architecture/outlined-source-contexts.md`.

## Pipeline tipado, vetores, busca e léxico — 2026-10-17

- Contrato escalar compartilhado de checkpoint entre API/analisador; testes HTTP de retomada.
  `local_pipeline.py` tem testes diretos com modelos falsos/SQLite temporário: evidência literal,
  offsets UTF-16, candidato/edição, rollback, revisão/dimensão, abstinência, gate e índice ausente.
- Ambiente `.venv` via uv 0.11.26 + `uv.lock`, Python 3.11–3.13, Torch CPU no Windows/Linux.
  `semantic:typecheck` verifica `mypy --strict app` inteiro; `semantic:lint` app/tests/scripts.
  CI configurado Windows/Linux × Python 3.11/3.13, mas execução remota não certificada aqui.
- Somente índice derivado `candidates.sqlite` migra a schema3 BLOB `<f4`; backup SQLite consistente,
  transação/rollback, dimensão/checks/FKs; nunca modifica schema/PDFs/associações do workspace.
  Matriz NumPy, sem Torch no retrieval, cache invalidado ao indexar; revisão/recipe/checksum/edição.
  Benchmark sintético 10k×768: JSON163.938.304B/2.450,95ms leitura, BLOB41.058.304B/62,76ms.
- `/v1/pipeline/search` compartilha FTS5/BM25 + embedding global com o linker, fusão RRF explícita.
  Busca ganhou Por sentido, edição, preparação em lotes/cancelamento e fallback FTS identificado.
  Índice incompleto ou revisão alterada dá409; não exige LLM geradora nem publica inferências.
  Proxy local autenticado/whitelist integra Docker; modo browser-only mantém loopback.
  Resultados preservam edição via `?edition=` e hash de verso. Busca textual permanece padrão.
- Glossário JSON versionado protege Logos/Torá/Septuaginta/LORD; fingerprint no modelRevision
  invalida cache exato sem sobrescrever revisão humana. Se Marian danifica placeholders, fallback
  traduz segmentos circundantes preservando termos. Fluência/modelos reais ainda não validados.
- Estatísticas no inspetor/Ocorrências: SQL por lema/edição, distribuição por livro e janela ±2
  na mesma unidade. Sem duplicar por endereços alternativos; surface hebraica em vez de códigos
  OSHB, sem unificar automaticamente referências compostas em raízes. Corpus linguístico lazy.
- Validação local: 403 TS/57 arquivos, 110 Python, build/typecheck/lint/Ruff/mypy passaram.
  QA produção1440×1000/390×844: preparo/cancelamento, restart do companion, edição solicitada,
  fallback/409 legível e estatísticas gregas/hebraicas; sem pageerrors/overflow global. Header
  móvel tem clipping anterior. Correção final de prefixos OSHB coberta por testes relacionados.
- Integridade real read-only: 57 documentos, 45.949 propostas contextuais, quick_check ok/FKs0;
  não reimportou/acrescentou livros. Previews/companion de QA encerrados, lock liberado.
  Dockerfile usa lock e `/models/semantic-index`; imagem não reconstruída. Índice antigo efêmero
  do container não é migrado automaticamente para esse volume: reindexar, sem afetar a biblioteca.
- Guia operacional: `docs/architecture/semantic-search-vectors-lexical-statistics.md`.

## Estudos e leitura — 2026-10-17

- Árvore incorpora os 95 registros existentes em sete núcleos pedagógicos, sem inferir relações.
  `/knowledge` redireciona seleções para Estudos; o caderno de notas de outro trabalho é preservado.
- Ambientes Branco/Preto/Cinza/Marrom/Sistema; guias por etapas horizontais; comentários inline,
  em painel inferior redimensionável ou ocultos. Mesmos serviços e revisão, sem alterar o acervo.
- Fonte canônica: `docs/architecture/frontend-experience.md`, seção Estudos, ambientes e comentários.
- QA em 1536×1024 e 390×844: temas persistem, entidades/links antigos abrem, etapas navegam,
  comentários mudam de posição, seleção acompanha versículo, teclado redimensiona e sem overflow.
  Preview OPFS isolado; comentários privados não conferidos no acervo de produção.
- Verificado: 425 testes/62 arquivos, typecheck, lint e build Node passaram. Sem nova ingestão.

## Espaços de estudo com dados do acervo — 2026-10-17

- Documento canônico: `docs/architecture/study-topic-workspace.md`. Árvore expande núcleos em
  constelações paginadas; cada guia/entidade usa Percurso, Leituras, Conexões, Caderno e Vídeos.
- `StudyTopicService` reutiliza catálogos, FTS público/privado, unidades e páginas canônicas.
  Roteiros usam correspondências editoriais explícitas; busca textual não vira relação aprovada.
- Notas mantêm tema + grupo + origem, com backlinks. Aba Caderno preserva rascunhos montados;
  associação direta de uma nota não torna todas as notas do grupo pertinentes ao tema.
- Grafo usa somente relações/parentesco registrados, roteiros existentes e conexões pessoais;
  não infere arestas por palavras iguais. Mantém limites e paginação para reduzir a carga visual.
- YouTube Data API opcional: chave restrita somente em memória, header X-Goog-Api-Key,
  consulta explícita, timeout/cache limitados e player sob ação. Sem chave real nesta validação.
- QA isolado confirmou nota simples, nota com unidade original, conexão, rascunho entre abas,
  reload, backlinks e responsividade. Dados de teste não foram criados no acervo original.
- Acervo original consultado read-only: documentos e ocorrências privadas reais presentes.
  Lock Linux e journal de backup anterior preservados; API Docker indisponível. Não recuperar
  lock nem migrar o banco por suposição. Preview Vite 5173 permanece isolado em OPFS.
- Verificado: 437 testes/65 arquivos, typecheck, lint e build; QA desktop/mobile sem pageerrors,
  origem da nota preservada após reload e descarte protegido inclusive para rascunho de vídeo.

## Conteúdo educacional dos temas — 2026-10-18

- Correção explícita do usuário: preservar árvore e Biblioteca celeste; entrar num tema deve oferecer
  explicação para ler/aprender, além dos livros, em vez de somente instruções de investigação.
- Conteúdo é a primeira aba. study-lessons tem introduções específicas para 95 entidades e capítulos
  por correspondência explícita para 16 guias; bibliografia por capítulo, perspectivas identificadas.
  Texto editorial original, sem simular citação dos livros nem alegar revisão acadêmica.
- Leitura do acervo também dentro de Conteúdo; topic-reading-text carrega unidade/página original
  completa, nunca snippet como substituto. Reusa os repositórios e o leitor/caderno existentes.
- Novos temas pessoais sem lição mostram ausência explícita, com as fontes reais disponíveis.
- Nenhuma alteração na árvore, backend, schema, processamento dos PDFs ou identidade visual.

## Próximo escopo aprovado: formação acadêmica e Rastro — 2026-10-18

- Usuário aprovou expressamente a proposta da conversa e pediu que fosse preservada integralmente.
  Antes de implementar, diagnosticar o espaço do disco F. Não alterar outras funcionalidades.
- Preservar árvore e Biblioteca celeste. Trocar a experiência de textos introdutórios/seletor 01/02
  por currículo com recorte, pré-requisitos, objetivos, módulos, aulas, leituras e atividade final.
- Trilha horizontal com progresso persistido: disponível, em andamento, concluído; concluir módulo
  libera o próximo. Progresso de atividades não é comprovação automática de domínio acadêmico.
- Conteúdo, Percurso, Leituras, Conexões, Caderno e Vídeos devem acompanhar o mesmo módulo.
- Cada aula: introdução, conceitos explicados, exemplos analisados, fontes, discussão, conclusão,
  atividade. Curso profundo distribuído em aulas, sem paredões de texto nem excesso de cartões.
- Distinguir visualmente explicação, Escritura, citação, método e atividade por hierarquia tipográfica,
  espaçamento e poucos acentos de cor; conservar a ambientação aprovada.
- Aproveitar os 51 livros mencionados pelo usuário: inventariar autor/obra/edição/perspectiva,
  conferir extração e estrutura, selecionar unidades citáveis por função pedagógica e página exata.
  Busca textual é descoberta, não curadoria. Importado/extraído/estruturado/analisado são distintos.
- Explicação editorial sustentada por referências; combinar acervo privado com fontes externas
  verificáveis. Comparar tradições sem avaliar concordância religiosa como acerto acadêmico.
- Ampliar Rastro para dossiê por palavra/passagem/conceito, mantendo proveniência/histórico atuais:
  léxico, morfologia, ocorrências, contexto textual, história/cultura, interpretações, fontes e revisão.
  Arqueologia/antropologia somente quando pertinentes e apoiadas em evidências identificadas.
- Referências funcionais: Logos Workflows, Guides, Bible Word Study e Factbook; aproveitar o pipeline
  e banco canônicos, com unidades, spans, propostas e notas existentes, sem fonte de verdade paralela.
- Proposta de primeiro percurso completo: Gênesis 1 (orientação, texto, Bereshit/linguagem,
  contexto histórico-cultural, comparação de interpretações, síntese final), validando as seis áreas
  e progressão antes de expandir. Na aprovação ainda era proposta; a implementação do piloto está registrada abaixo.

## Formação acadêmica e dossiê do Rastro — 2026-10-18

- Primeiro currículo desenvolvido em `/study/course/genesis-1`: seis módulos, doze aulas,
  introdução/conceito/exemplo/discussão/conclusão, objetivos, leituras e síntese final. Referências
  e perspectivas explícitas; material editorial original, sem atribuir revisão acadêmica humana.
- Trilha horizontal sequencial; seis áreas acompanham o módulo. Manrope/Biblioteca celeste e
  árvore preservadas. Outros temas permanecem introdutórios, não declarar 95 cursos completos.
- Migration028 aditiva `study_course_progress`, revisão do currículo, confirmação de aulas e
  passagens, atividade e critérios. Versão otimista com guarda transacional; backup v2/v3 opcional
  compatível. Conclusão registra percurso, não domínio acadêmico ou concordância religiosa.
- Leituras bíblicas integrais/edição; acervo por vínculo principal/análise contextual, estado de
  revisão, domínio, esquema e páginas. Sem associação por palavras soltas. Agrupamento por obra,
  quatro trechos visíveis, um original aberto. Leitor/captura existentes preservados.
- Inventário read-only canônico:57 documentos,51 com texto/unidades; primeiro módulo encontrou
  oito obras pertinentes. Consulta não equivale a curadoria humana integral. DB real mantém
  4.018.020.352 bytes e mtimeUTC2026-10-17T21:49:28, sem migração/reprocessamento nesta entrega.
- Caderno compartilhado por curso, vínculos por módulo/passagem; retorno `study-course:` pelo
  index de Estudos ao curso/módulo. Integra editor existente; Notas/pastas/wikilinks preservados.
  Rascunho protegido entre abas e bloqueia remontagem ao salvar progresso. Vídeos reaproveitam
  configuração YouTube existente, API opcional em memória, além de materiais selecionados.
- Rastro tem pesquisa e histórico; palavras/passagens/`palavra @ passagem`, Bereshit reconhece
  sinais/segmentação OSHB. Texto, morfologia, verbetes/concordância reais; contexto/interpretações
  desenvolvidos para Gn1. Demais passagens usam dados disponíveis e ausência explícita. URLs
  antigas filtradas continuam históricas. Não inferir arqueologia por semelhança lexical.
- QA em origem isolada5174: conclusão/desbloqueio/reload OPFS, seis abas, nota vinculada e retorno
  ao módulo, Notes explorer, histórico, Bereshit e viewport390 sem overflow da página. Segunda
  aba pode cair no fallback memory já existente; curso avisa perda ao recarregar nesse estado.
- Especificações: `docs/architecture/academic-study-course.md`, `study-topic-workspace.md`,
  `knowledge-trace.md`. Migração/concorrência/backup e seleção de fontes cobertos por testes.
- Limite operacional: banco canônico v25/lock antigo preservado; migrações testadas em bancos
  descartáveis. Não abrir instalação real para QA nem recriar backups grandes. Limpeza anterior
  já moveu26 arquivos/43,051GiB para `C:/Users/comical/Desktop/apagar`, preservando banco atual,
  PDFs e snapshot válido mais recente. Não repetir limpeza nem apagar automaticamente.
- Há alterações concorrentes de busca acadêmica em `src/components/search`, serviços acadêmicos,
  `routes/search.tsx` e `study-source-service`; manter fora do commit deste escopo.
- Verificação final do snapshot compartilhado: `npm run typecheck`, `npm run lint` e suíte completa
  `npx vitest run --testTimeout=60000`:477 testes/73 arquivos passaram. Falhas transitórias nos
  testes novos da busca paralela foram corrigidas pelo trabalho correspondente, sem editar tais
  arquivos nesta entrega. Build de produção passou; evidências visuais em arquivos temporários.
