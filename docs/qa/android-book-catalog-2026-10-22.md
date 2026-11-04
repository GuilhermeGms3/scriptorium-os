# Android 0.5.1 — catálogo de leitura

O catálogo usava somente a edição da última passagem. Ao restaurar um NT grego,
Todos/Todas as seções continuavam limitados aos livros dessa edição.

`readingBooks` combina os catálogos das edições instaladas, sem duplicar livros,
priorizando Bíblia Livre em português quando disponível. Cada entrada conserva
edição, obra e esquema reais. A leitura restaurada não muda de edição; somente
a seleção de um novo livro usa a entrada do catálogo. Os filtros existentes e
textos antigos foram mantidos. Sem migração, mudança de corpus ou reimportação.

## Verificação

- `./android/gradlew.bat -p android :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug`:
  build aprovado, 52 testes JVM aprovados, lint com zero erros e 22 avisos existentes.
- Emulador isolado com acervo real: três cenários de interface aprovados em 55,753s.
  Incluem restaurar NT, voltar aos livros, Todos/Todas as seções, abrir Gênesis1 na
  Bíblia Livre; busca por passagem/restauração/mesmo capítulo; comentários/filtros/Biblioteca.
- `git diff --check`: aprovado. Sem dependências ou alterações em código web.
- Instalado no Samsung SM-S906E com `adb install -r`; sucesso, versão0.5.1/code9
  confirmada por `dumpsys package`; abertura com `am start -W` retornou `Status: ok`.
  Não foram executados testes que escrevem dados de QA no aparelho pessoal.
- APK de atualização na Área de Trabalho, pasta `Scriptorium-Android-0.5.1`.
  SHA256: `191cf2c406f715850622fbdb03dcb7191e98cf523c42543d81d47b30b27ab6c8`.
