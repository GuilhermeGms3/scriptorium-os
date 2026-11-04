# QA — Conhecer para amar — 25/10/2026

## Entrega

Android 0.6.3 / versionCode 15. Árvore visual preservada, conceitos com pré-requisitos,
próxima descoberta em destaque e outros percursos recolhidos. Currículo novo com seis
módulos, 30 seções e 3.001 palavras no corpo das aulas. Dez leituras bíblicas vinculadas;
consulta às fontes reais e caderno existentes. Escopo e fontes em
`docs/architecture/knowing-god-discovery.md`.

## Validação de código

- `npm run mobile:labels`: gerou o asset editorial sem abrir banco privado.
- `npx vitest run src/lib/content/study-courses/knowing-god.test.ts scripts/mobile/theology-formation.test.ts`:
  cinco testes aprovados; currículo, IDs reais, referências, ordem e conclusão/desbloqueio.
- `npm run typecheck`: aprovado.
- ESLint e Prettier nos três arquivos TypeScript envolvidos: aprovados.
- Gradle `:app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug`:
  build aprovado; 70 testes JVM, zero falhas; lint sem erros, 49 avisos.
- `git diff --check`: aprovado.

Os novos testes JVM cobrem pré-requisitos dos conceitos, revisão de conclusões
importadas, ramos independentes, entradas inválidas/ciclos e o currículo no asset.
Não houve mudança de schema ou necessidade de migração. Não se executou build web:
o novo consumidor é Android; a fonte TypeScript foi checada e exercitada pelo gerador.

## Dispositivo de QA

Emulador dedicado `Scriptorium_Feedback_QA`, porta 5562, com o acervo real já instalado.
Somente o APK foi atualizado. Testes opt-in `ReadingUiTest` alteram progresso de QA;
nunca executar estes cenários no telefone pessoal do usuário. Rede desligada apenas
no emulador durante a execução, restaurada ao finalizar.

Os primeiros ensaios identificaram ajustes no teste: Back após preencher o campo
programaticamente voltava uma etapa, pois não havia teclado aberto; a asserção de
destino precisava aguardar o leitor; e o leitor existente salva a retomada somente
no versículo atual, descartando o final do intervalo nas preferências. O contrato
editorial continua transmitindo início/fim. Esses resultados não foram contados
como aprovação. O resultado da rodada final é registrado abaixo.

## Resultado da rodada final nativa

Quatro cenários aprovados em 116,429s, zero falhas:

1. Novo percurso: conceito inicialmente bloqueado com explicação; conteúdo e
   pré-requisitos; tentativa incompleta recusada; confirmação das leituras;
   abertura real de João 1 no versículo 35; consulta de fontes existentes;
   resposta e revisão pela interface; conclusão de A libera B; retomada após
   reiniciar. A etapa final do teste semeia somente os outros cinco módulos para
   conferir que o ramo se torna disponível; não afirma que essas cinco aulas
   foram estudadas pela interface.
2. Guia anterior: etapas futuras bloqueadas, conclusão de um ponto e retomada.
3. Formação geral anterior: trabalho incompleto recusado, atividade e critérios,
   conclusão de A libera B e persiste após reiniciar.
4. Aula temática anterior: abre livro real na Biblioteca, retorna à aula e grava avanço.

Log local: `LOCALAPPDATA/Temp/scriptorium-063-ui-gate.log`.
Screenshots inspecionados em `scriptorium-063-home.png` e
`scriptorium-063-unlocked.png`, no mesmo diretório temporário. Nenhum cenário
escreveu no banco canônico desktop ou no telefone pessoal.

Após o gate nativo, apenas o rótulo singular “1 aula” foi ajustado; assembleDebug
e lintDebug foram repetidos. Nenhuma regra ou fluxo mudou nesse ajuste.

## Limites

- Concluir registra estudo pessoal, sem avaliação automática da resposta ou da fé.
- Nenhum usuário humano revisou academicamente todo o conteúdo editorial.
- Resultados do acervo mantêm distinção entre associação documental, busca e apoio
  à área; não se afirma curadoria humana de cada resultado.
- Novo currículo ainda sem consumidor web e sem vídeos selecionados novos.
- Sem instalação física confirmada: o telefone não está na lista USB desta rodada.
- Nenhum PDF/acervo reimportado, backup completo criado ou dado pessoal apagado.
