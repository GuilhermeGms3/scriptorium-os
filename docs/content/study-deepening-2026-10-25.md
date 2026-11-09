# Aprofundamento de Estudos — 25/10/2026

## Abrangência

O catálogo inteiro recebeu uma camada de aprofundamento: **95 entidades e 16 guias**,
totalizando 111 aulas e 130 capítulos editoriais distintos. A deduplicação resulta
em 97 conjuntos distintos de análise, caso de leitura e síntese orientada, com
13.470 palavras nessa camada. Conceitos equivalentes, como tema e doutrina de
justificação, reutilizam o mesmo conteúdo; competências compartilhadas pelos guias
também são reutilizadas explicitamente, sem preencher assuntos por semelhança de nome.

Além dessa camada:

- **Conhecer para amar:** seis módulos e 30 seções conservados; o corpo explicativo
  passou de 3.001 para 4.424 palavras. Novos desenvolvimentos sobre conhecimento e
  confiança, aliança, pessoa e natureza, modelos de expiação, ressurreição e vida ética.
- **Formação geral:** 18 módulos mantidos, agora com 200 seções, incluindo os casos
  e sínteses dos capítulos e novos desenvolvimentos sobre panoramas bíblicos, ética
  e investigação final. A quantidade de seções não significa 200 aulas independentes.
- **Gênesis 1:** aprofundamento dos seis módulos, preservando as doze aulas e os
  identificadores anteriores. Acrescenta desenvolvimento sobre delimitação, estrutura,
  tradução, comparação cultural, recepção e revisão da hipótese final.

O material continua introdutório e intermediário, com exposição original e exercícios.
Ampliar todos os temas não significa esgotar academicamente suas bibliografias nem
afirmar revisão humana especializada de cada parágrafo.

## Organização e vínculos

Cada capítulo conserva a abertura e oferece **Análise**, **Caso de leitura** e
**Minha síntese**, com somente um contexto visível por vez. A árvore, a trilha e os
temas visuais existentes permanecem. As referências bibliográficas identificam a
perspectiva da fonte; não apresentam os parágrafos editoriais como citações dos livros.

Casos bíblicos selecionados têm vínculos explícitos por livro/capítulo/versículo,
sem procurar relações automaticamente por palavras. A interface web usa o parâmetro
de navegação `v`; Android transmite a referência ao leitor existente. Casos históricos
e filosóficos não recebem passagens artificiais só para preencher o campo.

A biblioteca continua sendo consultada pelos serviços existentes, com recortes,
documentos e localizadores disponíveis. Este trabalho não reprocessa PDFs, não inventa
localizadores e não altera a classificação ou a revisão das associações documentais.
Vídeos e integração YouTube continuam com o comportamento anterior; não houve nova
curadoria audiovisual nesta ampliação textual.

## Fontes e limites editoriais

A bibliografia canônica permanece em `study-lessons/references.ts`. Nesta rodada,
foram consultadas amostras de fontes primárias e institucionais, entre elas:

- [Augsburgo](https://bookofconcord.org/augsburg-confession/) e
  [Westminster na recensão da OPC](https://opc.org/wcf.html).
- [Didaquê](https://www.newadvent.org/fathers/0714.htm),
  [1 Clemente](https://www.newadvent.org/fathers/1010.htm),
  [2 Clemente](https://www.newadvent.org/fathers/1011.htm) e
  [Diogneto](https://www.newadvent.org/fathers/0101.htm).
- Tomás de Aquino: [conhecimento de Deus, I q.12](https://www.newadvent.org/summa/1012.htm)
  e [caridade, II–II q.25](https://www.newadvent.org/summa/3025.htm).
- [Coleção documental dos concílios](https://www.ccel.org/ccel/schaff/npnf214.html),
  [autodescrição ortodoxa sobre os concílios](https://www.oca.org/orthodoxy/the-orthodox-faith/doctrine-scripture/sources-of-christian-doctrine/the-councils)
  e [pesquisa de Goodacre sobre Q](https://markgoodacre.org/Q/).

Consultar amostras não equivale a verificar novamente cada link ou a revisar
integralmente todas as afirmações do catálogo. As fontes em tradução inglesa
continuam identificadas; o corpo editorial foi escrito em português, sem atribuir
traduções literais novas aos autores. Posições confessionais não são tratadas como
consenso de todas as tradições cristãs.

## Entrega e persistência

`scripts/mobile/study-editorial.ts` gera um registro deduplicado de capítulos,
sequências de aula, referências e curso de Gênesis no asset `reading-labels.json`.
Android passa a preferir esse conteúdo editorial ao catálogo antigo do pacote
imutável. Assim, **atualizar o APK é suficiente**, sem reexportar acervo ou PDFs.
Pacotes antigos e temas não presentes no asset mantêm o caminho de leitura anterior.

O mesmo catálogo de temas/guia e o curso de Gênesis são consumidos pela interface web.
Os cursos de formação geral e Conhecer para amar continuam com seus consumidores
Android; esta mudança não cria uma rota web paralela para eles.

Nenhum ID de capítulo, módulo, aula ou leitura obrigatória foi trocado. Não há nova
exigência de conclusão, revisão de currículo, migration ou banco paralelo. Os novos
campos JSON são aditivos e a comparação com a versão 0.6.3 está no fixture público
`scripts/mobile/study-progress-baseline.json`. Conclusões anteriores continuam válidas;
o usuário pode revisar o texto ampliado sem que seu progresso seja apagado.

## Validação

- Typecheck, ESLint e Prettier focados; suíte `test:quick`; build web com os índices
  existentes (`npm --ignore-scripts run build`), sem reconstruir o acervo.
- Gradle assembleDebug/assembleDebugAndroidTest/testDebugUnitTest/lintDebug.
- QA de navegador com Playwright fornecido pelo runtime, pois o plugin Browser não
  está disponível. Origem 5174/perfil temporário, backend privado bloqueado no QA:
  desktop 1440px e mobile 390px, troca dos três contextos, sem overflow ou erro JS.
- QA Android no emulador dedicado, com o acervo real anterior e sem reimportação.
  Resultados finais e intercorrências estão em `docs/qa/android-study-depth-2026-10-25.md`.
