# QA — traços livres e comentários compactos — 27/10/2026

## Alterações

- Desktop: margem transparente, sem borda/fundo de faixa, símbolos, números ou
  contador visíveis. Traços horizontais de12×2px; atual de26×3px na cor de foco do
  tema. Atual sempre centralizado; espaços não interativos preservam a posição nos
  extremos. Nomes acessíveis, teclado, tooltips e movimento reduzido permanecem.
- Android0.6.9/code21: traços horizontais de11/24dp, sem números, também centralizados.
  Identidade por destino conserva a animação da mudança, com semântica acessível.
- Filtros de comentários abrem em janela por **Filtrar**, no leitor inline, painel
  inferior e aba Fontes do painel lateral. Categoria, fonte e limpar permanecem.
  “Assunto e fonte” e “Fonte: todas” saem da área de leitura; a janela fecha em Concluir.
- Nenhum comentário, fonte, livro, vínculo ou anotação excluído. Sem alteração de
  banco, pacote de acervo ou conteúdo editorial; atualização somente do APK.

## Gate

- `npm run test:quick`:632 testes/103arquivos, sem falhas; inclui centralização no
  primeiro, intermediário, último e único destino.
- `npm run typecheck`, ESLint direcionado, Prettier e `git diff --check`:aprovados.
- `npm --ignore-scripts run build`:aprovado, sem reconstruir os corpora.
- Gradle assembleDebug/assembleDebugAndroidTest/testDebugUnitTest/lintDebug:aprovados;
  75 testes JVM, sem falhas; lint0erros/49avisos preexistentes.

Logs em `%TEMP%/reading069-{tests,typecheck,eslint,web-build,android-build,android-final}.log`.

## Web visual/funcional

Playwright instalado no runtime, pois Browser plugin não está disponível. Banco
pessoal acessado apenas por queries readOnly pelo harness; zero comandos de escrita.
1440/1024/390, claro/escuro, movimento reduzido, todos os modos de Escrituras,
exploração horizontal, fontes primárias, páginas privadas e consulta contextual.

Medidas verificadas por computedStyle/DOM: fundo `rgba(0,0,0,0)`, borda0px,
traço26×3px e diferença0px entre o centro do traço atual e o centro do grupo.
Seleção original/offsets continuam iguais, sem overflow de página nem exceções.
Harness `%TEMP%/scriptorium-reading069-qa.cjs`, log `reading069-browser.log` e
captura inspecionada `reading069-strokes-desktop.png`.

## Android nativo

Exclusivamente no emulador dedicado, com acervo real. O primeiro teste foi interrompido
por “System UI isn't responding” antes de abrir o aplicativo; emulador reiniciado e
reteste realizado após o boot estabilizar. Não se usou `uiQa` no telefone pessoal.

- `compactDockUsesModalFiltersWithoutConsumingCommentSpace`:aprovado16,236s;
  Êxodo18:4, cabeçalhos removidos, janela de filtros, conclusão e sincronização com5.
- `compactReaderCollapsedSourcesFiltersAndLibraryAction`:aprovado29,616s;
  expansão/recolhimento, fonte integral, Biblioteca, escolha de fonte, limpar e painel.

Capturas inspecionadas: `%TEMP%/reading069-compact-dock.png` (vários comentários
visíveis sem as faixas antigas) e `reading069-comment-filters.png` (janela independente).
Logs `reading069-native-retest.log` e `reading069-native-filters.log`.

## Limites

Não é uma auditoria editorial do acervo. Contagens de comentários dependem dos filtros
e da passagem; o conjunto armazenado não foi reduzido. Versículos, notas, progresso e
obras continuam nos repositórios existentes.

## Instalação física

Samsung SM-S906E atualizado por `adb install -r`, sem desinstalação ou limpeza.
Versão0.6.9/code21 confirmada; abertura com Status:ok. O identificador do acervo ativo
permaneceu4c8bad60…aa2f4 antes/depois; nenhuma reimportação de livros. Não se executou
o modo `uiQa` nesse telefone.
