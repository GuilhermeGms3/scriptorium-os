# Biblioteca mobile e atualização física — 02/11/2026

## Interface

Android **0.6.13 / code25**:

- Grade de duas colunas no celular, até quatro em telas maiores.
- Capa acima e título curto abaixo; retiradas as linhas de páginas e idioma da estante.
- Mesmo componente em Meus livros, Fontes primárias e volumes instalados de Nag Hammadi.
- Catálogo informativo de tratados em diálogo próprio; registros bibliográficos
  continuam identificados como registros, sem simular livros integrais.
- Capitalização de apresentação padronizada, nomes próprios preservados e aliases
  para títulos excessivamente técnicos. Volumes continuam distinguíveis.
- Busca encontra o título curto e o título original; ordenação com colação pt-BR.
- Capas locais de 480 px sob demanda, cache próprio e imagem decorativa no leitor
  de tela; nome do livro e ação de abrir permanecem acessíveis.

Metadados originais, IDs, fontes, citações, acervo e banco pessoal não foram
reescritos pelo formatador. Nenhuma alteração no desktop ou em schema.

## Validação de código

Com JBR do Android Studio e SDK local:

```powershell
cd android
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:lintDebug --console=plain
```

Build aprovado; **84 testes JVM passaram**. Lint: **zero erros, 49 avisos**.
Os quatro testes novos verificam capitalização, volumes/siglas, remoção de ruído de
arquivo e ausência de inferência indevida de autor/edição incompleta em novos títulos.
Diff revisado e `git diff --check` aprovado.

## Instalação no Samsung SM-S906E

Atualização com `adb install -r`, sem desinstalação, wipe ou testes instrumentados
que alterem o workspace pessoal. Aplicativo atualizado para 0.6.13/code25.

O instalador transferiu o pacote completo, verificou seu SHA-256 no aparelho e o
aplicativo ativou o conteúdo:

`7328f5e76b5d3466689b93d651b3c9a0e0c55277365787809526703e02585c64`

Acervo: **65 PDFs/documentos, 24 edições e 75.967 registros contextuais elegíveis**.
O pacote de transferência foi removido pelo aplicativo após a ativação; a pasta
`files/incoming` ficou vazia. Não foi criado backup no telefone.

O SHA-256 de `files/personal.sqlite3` foi igual antes da atualização, após instalar
o APK e após ativar o acervo:

`2dbb3c35abfc9106cb1d37ada96f3616785c3f602e2a3d957a0bfdcf02455f74`

Espaço livre observado: aproximadamente 16 GiB antes e 14 GiB após a ampliação.
Não foram removidos dados pessoais para liberar espaço.

## QA no aparelho real

ADB e árvore nativa de acessibilidade, sem alterar notas:

- Primeira linha da estante: dois livros, com títulos abaixo das capas.
- “A cidade de Deus” abriu na **página 11/822**, recuperando a posição existente.
- Busca **NDITAT** encontrou volumes **2 e 4** lado a lado; os títulos tiveram
  bounds `[45,1559][512,1616]` e `[568,1559][1035,1616]`.
- Fontes primárias carregaram na mesma grade.
- Nag Hammadi apresentou volumes instalados em duas colunas; “Ver catálogo de
  tratados” abriu e fechou o diálogo, preservando o acesso ao catálogo.
- Retorno à estante e navegação entre coleções preservados.

Capturas ficaram apenas na pasta temporária local; imagens de páginas privadas não
foram incluídas no Git. As capas vêm da primeira página real do PDF: um arquivo
sem capa editorial ou com folha rotacionada mantém essa característica.

O kit na Área de Trabalho foi atualizado com o APK 0.6.13 e seu checksum em
`delivery.json`, reutilizando o mesmo `acervo.scriptorium` já verificado.
