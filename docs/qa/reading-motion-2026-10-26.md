# QA — Leitura e movimento — 26/10/2026

## Escopo

Android 0.6.7/code19: emblemas vetoriais no catálogo de Escrituras; construção e
movimento direcional nos percursos, guias, aulas e contextos de aprofundamento;
indicadores verticais reservados à margem esquerda dos leitores. Estudos web
recebe transições de módulos, aulas, abas e contextos. Sem redesenho da árvore,
novo conteúdo, dependência, migração, corpus ou reimportação de PDF.

## Texto ajustado

`libraryReadingSections` recompõe linhas com o helper já existente, preserva
parágrafos separados e listas e divide blocos grandes depois de frases completas.
Uma frase longa sem pontuação não é cortada arbitrariamente. A numeração § é
apenas visual, reiniciada por página; isso é explicado nas opções do leitor.
Texto extraído, offsets, citações, tradução e áudio continuam usando a fonte original.
Não corrige OCR incorreto nem reconstrói com certeza os parágrafos do autor.

`ReadingSectionIndicators` ocupa 30dp reservados, com traço ativo de 3dp,
até 9 alvos por janela e capacidade reduzida conforme a altura disponível. Alvos
são 44dp de altura, com nome e estado acessíveis. Navega pelo capítulo atual, pela
página do PDF, pelas unidades carregadas da fonte primária ou pelos parágrafos da
página ajustada. Não carrega o livro inteiro para calcular posições.

## Verificação automatizada

- `npm run test:quick`: 587 testes / 94 arquivos, sem falhas.
- `tsc --noEmit`: aprovado.
- ESLint e Prettier nos arquivos TS/TSX alterados: aprovados.
- `npm --ignore-scripts run build`: aprovado, sem executar o prebuild do corpus.
- Android assembleDebug/assembleDebugAndroidTest/testDebugUnitTest:aprovados;
 75 testes JVM, sem falhas. Testes novos verificam preservação das palavras/listas,
 limites de frases e janela de indicadores em livros longos.
- Android lintDebug:aprovado,0 erros e 49 avisos preexistentes.
- `git diff --check`: aprovado.

## Navegador

Browser plugin indisponível: Playwright já instalado no runtime, sem dependência nova.
Porta 5174, perfil OPFS temporário, `/api/workspace/**` bloqueada. Fluxo:
Estudos → Percursos → Queda, graça e providência → Conteúdo/Leituras → módulos/aulas.

Aprovados em 1440×1000 e 390×844:animação real em execução ao trocar aba, cinco vias,
14 módulos, fonte real na Biblioteca, contraponto sobre Sheol e módulos avançados;
sem overflow horizontal ou erros de aplicação. Módulos avançados usam conclusões
válidas inseridas somente no perfil descartável, não alegação de estudo humano.
Movimento reduzido cancela as animações próprias, inclusive ao mudar a preferência
com a tela aberta. A checagem aguarda o evento de preferência da plataforma.

Capturas temporárias:study067-content-desktop.png,study067-fiveways-mobile.png,
study067-library-desktop.png,study067-open-source-desktop.png e study067-sheol-mobile.png.

## Android nativo

Testes opt-in exclusivamente no emulador dedicado Scriptorium Feedback QA
(porta 5562), usando seu acervo instalado; nunca no telefone pessoal.
O primeiro boot exibiu ANR do System UI; emulador reiniciado antes dos retestes.
As verificações iniciais também revelaram nomes acessíveis ambíguos entre
comentários e indicadores e o estado ativo não exposto no nó acessível de botão.
O indicador passou a declarar nome/estado/ação em um único nó com
clearAndSetSemantics, preservando o toque e a navegação assistiva. O teste usa
nome exclusivo e aguarda o estado atualizado. A seleção da página de QA também
foi corrigida para usar texto realmente extraído, em vez de uma obra sem texto.

Resultado final: **3 testes aprovados em 49,079s**:

- Escrituras: Gênesis 12, salto para versículo 2, indicador ativo e painel sincronizados;
 catálogo com emblemas; novo percurso com entrada/avanço/retorno e conteúdo preservado.
- Biblioteca: página 9 de A Cidade de Deus Vol.01, parágrafos numerados, salto ao §3,
 texto original conferido sem alteração.
- Estante/capa/cache, PDF/zoom, salto de página, texto ajustado, fonte e retomada.

Capturas study067-native-icons.png,study067-native-study.png,
study067-native-long.png e study067-native-reflow.png foram extraídas para a pasta
TEMP e inspecionadas. Não foi feita afirmação de desempenho no aparelho pessoal.

## Limites de entrega

APK gerado em android/app/build/outputs/apk/debug/app-debug.apk. Atualização do
software não requer reinstalar livros. Telefone físico ausente durante esta QA;
não afirmar instalação no aparelho. Fontes primárias continuam com suas unidades
originais; o PDF continua com páginas físicas. Não foram verificados manualmente
todos os livros instalados, apenas os fluxos reais descritos e as regras comuns.
