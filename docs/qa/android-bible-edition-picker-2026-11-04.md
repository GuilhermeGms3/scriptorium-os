# Troca de tradução bíblica no Android — 04/11/2026

Android **0.6.15 / code27**. A reclamação foi confirmada: até 0.6.14, ReaderScreen
mostrava o nome da edição e oferecia comparação/interlinear, mas não havia controle
para escolher outra tradução como texto principal.

## Correção

- Botão persistente **Tradução da Bíblia → Trocar ▾**, antes das abas da leitura e
  também na escolha de livros/capítulos. Diálogo acessível com edição atual marcada,
  lista de edições instaladas, carregamento e mensagem de indisponibilidade/erro.
- Troca real da edição consultada pelo repositório. Preserva identidade da obra,
  livro, capítulo, esquema e versículo visível; verifica os versos disponíveis antes
  de mudar a tela. Não usa coincidência numérica entre esquemas diferentes.
- Se faltar a passagem, mantém a edição anterior e explica como escolher outra.
- Preferência local lembrada. O catálogo prioriza a edição escolhida; livros presentes
  somente em outras edições continuam acessíveis, com a edição efetiva identificada
  na escolha de capítulos. Comparação/interlinear e comentários foram preservados.
- Continuar leitura respeita a edição selecionada, verificando a disponibilidade em
  vez de reabrir silenciosamente a edição antiga do histórico.
- Sem dependências novas, migrations, alterações no acervo canônico ou novas traduções.

## Validação

Com JBR do Android Studio e SDK local, em `android`:

```powershell
.\gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug --console=plain
```

**Build aprovado; 93 testes JVM, zero falhas/erros. Lint: zero erros, 48 avisos.**
Quatro testes novos cobrem preservação de passagem, recusa de esquemas/obras diferentes,
versículos ausentes ou intervalos incompletos e preferência no catálogo sem perder
livros exclusivos de outras edições.

Teste instrumentado opt-in, somente no **Pixel 8 emulado / emulator-5554**:

`ReadingUiTest#bibleEditionPickerIsVisibleAndSwitchesTheActualTextWithoutLosingThePassage`

**1/1 passou.** Verificou o botão visível, troca Bíblia Livre → Bíblia Portuguesa
Mundial em Gênesis 1:3, texto efetivamente consultado, mesma referência salva, recusa
de Gênesis no SBL grego, preferência na escolha de livros/capítulos e retomada com
a tradução recém-escolhida. Cinco telas
foram capturadas e inspecionadas em `data/mobile-ui-qa/bible-edition-*-0615.png`.

O acervo antigo do emulador tinha apenas uma Bíblia navegável; o primeiro ensaio
falhou por não haver segunda edição. A preparação foi corrigida: um patch exclusivo
de QA, criado a partir dos corpora BPM e SBL reais do pacote de 02/11, foi instalado
pelo instalador existente, com hashes e referências a arquivos inalterados. Nenhum
texto fictício foi usado. O patch temporário de aproximadamente 69 MB foi removido
do PC e do emulador após a verificação. Não foi duplicado o acervo completo.

O teste modifica somente preferências da instalação QA e as restaura ao terminar.
Não houve instalação nem QA no celular físico nesta entrega. O emulador compartilhado
foi mantido aberto para não interromper outras atividades.

## APK

`Desktop/Scriptorium-Acervo-2026-11-02/Scriptorium.apk` atualizado para 0.6.15;
`delivery.json` e LEIA-ME atualizados. O arquivo do acervo permanece o mesmo.
É necessário atualizar o APK instalado para o novo botão aparecer no celular.
