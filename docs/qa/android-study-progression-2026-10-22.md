# Android 0.5.0 — formação e percurso por pontos

## Escopo

A árvore de conhecimento foi preservada. Dentro dos estudos, as etapas passaram a ser
estações conectadas horizontalmente, com ponto atual em bronze, conclusão em verde e
cadeado nos pontos futuros. A interface usa Canvas nativo e as cores já existentes;
não acrescenta imagens pesadas, modelos ou serviços externos.

O novo percurso **Formação em Teologia** organiza 18 pontos: orientação acadêmica;
Bíblia, texto e contexto; Antigo e Novo Testamento; hermenêutica; exegese; cristianismo
antigo; história e tradições; Deus e criação; Trindade; cristologia; humanidade e pecado;
salvação; Espírito; Igreja e sacramentos; esperança; ética; investigação final.

São 58 aulas, 199 parágrafos editoriais e 48 leituras de capítulos bíblicos.
O conteúdo reutiliza os capítulos editoriais existentes e acrescenta panoramas de
Antigo Testamento, Novo Testamento e ética. É uma formação geral introdutória, não um
curso universitário integral. Textos editoriais não são apresentados como citações
dos livros. As fontes internas são consultadas no acervo instalado, com abertura
da obra/página na Biblioteca; os resultados de pesquisa continuam identificados.

## Avanço e persistência

- Nos percursos acadêmicos, concluir A libera B. A regra existente exige confirmação
  das aulas e passagens, resposta de pelo menos 80 caracteres e critérios de revisão.
  Não há avaliação automática da qualidade da resposta nem certificação de domínio.
- A tela inicial mostra o mapa e o resumo do ponto. Dentro dele, uma etapa aparece
  por vez. Anterior/Próxima etapa ficam fora da área de conteúdo rolável.
- Guias e aulas temáticas também usam estações; concluir/marcar um ponto libera o
  seguinte. Os guias retomam no primeiro ponto não concluído.
- Os registros usam a tabela pessoal existente de progresso. Não há migração,
  exclusão de notas, alteração dos PDFs ou necessidade de importar o acervo novamente.
- O curso geral é distribuído no catálogo editorial do APK, com revisão e IDs estáveis.

## Comentários e limitações

Esta versão mantém as correções 0.4.1: a janela do comentário usa serifa, tamanho
limitado e recomposição visual das quebras de PDF. Texto original e localizadores
permanecem preservados. As classificações Exegese/Hermenêutica dependem das associações
já exportadas e não representam uma classificação integral de todos os livros.

Não foram acrescentados vídeos fictícios. O curso geral não cria uma integração
nova com YouTube. A implementação é Android; o desktop e a árvore não foram redesenhados.

## Validação

- `./android/gradlew.bat -p android :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug`:
  build aprovado; 50 testes JVM aprovados; lint com zero erros e 22 avisos existentes.
- `npm run typecheck`: aprovado.
- `npx --no-install eslint scripts/mobile/theology-formation.ts scripts/mobile/formation-content.ts scripts/mobile/theology-formation.test.ts scripts/mobile/build-reading-labels.ts`:
  aprovado. Prettier nos mesmos quatro fontes também aprovado. O JSON gerado conserva
  a serialização de `JSON.stringify` usada pelo gerador, sem formatação manual.
- `npx --no-install vitest run scripts/mobile --testTimeout=60000`: 11 testes em três arquivos aprovados.
- Dados reais, via `am instrument -w -e fullQa true`: quatro cenários aprovados em 25,918s;
  os 48 capítulos foram encontrados e todos os 18 módulos obtiveram leituras internas reais.
- O cenário nativo específico de formação confirmou recusa do trabalho incompleto,
  conclusão de A, liberação de B e retomada em B após reiniciar (36,087s).
- Rodada completa no APK final: `am instrument -w -e uiQa true -e class org.scriptorium.app.ReadingUiTest`:
  oito cenários aprovados em 148,202s, incluindo busca exata/mesmo capítulo, voltar,
  Home/Menu, fontes recolhidas/filtros/Biblioteca, aulas, guias, formação, aparência,
  painel e toque prolongado. A seleção de checkboxes do teste foi corrigida para
  atualizar o nó de acessibilidade antes de consultar o estado; a interface foi
  conferida visualmente, sem dispensar critérios de conclusão.
- Inspeção visual nativa do mapa, guia e ponto B liberado no emulador isolado API37.
  O aparelho físico não estava conectado; não houve instalação nele nesta rodada.
- Instalação inicial sobre 0.4.1 preservou o hash do banco pessoal. Os testes seguintes
  escrevem progresso apenas no emulador isolado. Nenhuma base pessoal do PC foi alterada.
- APK0.5.0/code8: 184.063.843 bytes, sem entradas PDF/SQLite/DB privadas.
  SHA256: `1d137fe6ac7597c1b1d0db61f59b798d8be4cddb1f924067a0a18fc473ca9de7`.
- Entrega: `C:/Users/comical/Desktop/Scriptorium-Android-0.5.0/Scriptorium.apk`,
  acompanhado de instruções e `SHA256SUMS.txt`.
