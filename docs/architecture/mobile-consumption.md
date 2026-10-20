# Android: kit completo e leitura nativa

Esta entrega amplia a [fundação Android](mobile-foundation.md). Kotlin/Compose continua
separado do front web; não existe WebView nem pipeline editorial no aparelho. Os mesmos
IDs, páginas físicas, fontes, estados de revisão e direitos acompanham o conteúdo.

## Entrega privada completa

No PC, com Node 22, Python via `uv`, JDK 21 e Android SDK 36:

```powershell
# Modelo/indexação de recuperação, não produção de conhecimento. Resumível.
uv run --python 3.13 --script scripts/mobile/build-semantic-index.py --output data/mobile-semantic

# Pasta nova: todas as edições do registro, PDFs originais e snapshot de consumo.
npm run mobile:export -- --output data/mobile-completo --workspace data/workspace/workspace.sqlite3 --complete --semantic data/mobile-semantic

npm run mobile:bundle -- --package data/mobile-completo --output data/mobile-kit
cd data/mobile-kit
.\instalar.ps1
```

O ZIP **já leva o aplicativo e todo o acervo**, com um instalador automático por USB.
Extraia todos os arquivos e execute `instalar.ps1`, autorizando seu próprio PC no aparelho.
Não é necessário importar cada livro. O instalador confere hashes, atualiza o APK sem
desinstalar, transfere o pacote como bytes para uma entrada privada do aplicativo e espera
o identificador ativo confirmar a instalação. Não habilita ADB remoto nem escolhe outro
aparelho silenciosamente; se houver mais de um, informe `-Serial`.

Compatível com Windows PowerShell 5.1: o envio usa `adb push`, não stdin binário do
PowerShell/`ProcessStartInfo`. Uma pasta temporária Android com modo 0700 recebe o
pacote; o shell autorizado o copia por pipe local para a entrada privada do aplicativo.
A cópia temporária é removida e o SHA-256 no aparelho precisa coincidir com o do kit
antes de renomear `.part` para `.scriptorium`. Falha de transferência não ativa conteúdo.

Na primeira abertura o aplicativo confere SHA-256/tamanhos/SQLite e ativa uma geração
privada atomicamente. Uma transferência `.part` interrompida não é instalada. A cópia de
entrada é removida depois do sucesso; os originais permanecem no PC. Reserve 8 GB livres
para a primeira preparação. Não feche o aplicativo durante a conferência.

Sem ADB: instale o APK e selecione `acervo.scriptorium` **uma única vez** em Mais → Pacotes.
O kit inclui ambos os arquivos; o APK isolado não contém os livros.

### Por que não um APK de 2 GB?

O primeiro teste incluiu todos os PDFs como asset do APK: o Android aceitou instalar,
mas o emulador API37 encerrou o próprio `system_server` durante uma atualização,
com `ApkAssets.finalize()`/`nativeDestroy()` excedendo o watchdog. Também houve demora
de inicialização; SQLite pessoal foi movido para IO. Não tratamos essa instalação enorme
como pronta. A entrega recomendada mantém **todo** o conteúdo junto no kit, mas fora
do gerenciador de recursos do APK. Isso também permite atualizar código sem reenviar PDFs.
O modo experimental de asset embutido foi retirado. `scriptoriumContentPack` agora falha
com orientação para gerar o kit, em vez de produzir silenciosamente um APK vazio ou gigante.

O retrato privado de 18/10/2026 contém 57 PDFs (1.294.452.701 bytes), 47.707 páginas,
45.949 comentários elegíveis e 10 edições. Catálogo adicional: 16 guias, 111 aulas,
um curso de Gênesis e 52 entradas documentais de Nag Hammadi. Isso **não equivale** a
revisão integral ou comentário para todos os versículos. O catálogo de Nag Hammadi é
distinto dos volumes privados e da edição copta realmente instalada.

Não publique o kit privado. Pacotes e builds são ignorados no Git. O APK contém somente
código e configuração do software. `mobile:bundle` recompila com limpeza dos artefatos
Android gerados, para não reter bytes de um antigo APK incremental com livros, e coentrega
o acervo completo no ZIP. A limpeza não toca no workspace nem nos PDFs de origem.
O CI público não gera kits privados e continua produzindo um APK sem livros pessoais.
Debug é adequado ao teste pessoal; assinatura de distribuição/release não está configurada.

## Atualizações e persistência

Use `--base <manifesto-anterior.json>` com a mesma seleção completa e `--semantic` para
patches por arquivo. Instale em Mais → Pacotes. O patch exige a base exata; notas e progresso
ficam em `personal.sqlite3`, que nunca é substituído pelo pacote. Um lock de arquivo impede
instaladores concorrentes; cópias de staging interrompidas são recuperadas sob esse lock.

O acervo recebido fica em SQLite privado, não em OPFS ou em um perfil de navegador.
Reiniciar o aplicativo **não reinstala a base por cima de um patch mais recente**.
Uma nova entrega instala o novo retrato. No APK0.2.1, arquivos imutáveis com mesmo caminho,
tamanho e SHA são compartilhados por referência, sem hardlink nem cópia de arquivos inalterados.
Cada geração tem um `locations.json` privado e achatado: caminhos lógicos do manifesto apontam
para arquivos físicos dentro de `files/content/<id>/`. O ZIP nunca fornece esse índice local.
Gerações antigas podem continuar como pastas físicas de arquivos ainda usados; seus manifestos
obsoletos e arquivos não referenciados são coletados. Uma pasta antiga presente não significa
outra cópia completa nem cadeia de resolução de manifestos.

O SHA é conferido de novo durante instalação; a validação SQL anterior só é reaproveitada para
bytes imutáveis já ativos. Entradas recebidas também têm checksum verificado quando redundantes.
Até confirmar o novo ponteiro, todos os arquivos da versão ativa são preservados. Depois,
a coleta marca os caminhos físicos ainda referenciados e remove apenas arquivos derivados
allowlisted, sem atravessar links simbólicos ou tocar no banco pessoal. A coleta roda sob o
lock de instalação, também antes de expor leitores na abertura. Leituras SQL/semânticas em
andamento no processo usam a mesma exclusão do instalador; a UI fecha leitores ao instalar.
Arquivo ativo faltante/interrompido bloqueia coleta. Falha de remoção é informada e tentada de
novo. Rollback automático de conteúdo antigo não é oferecido; o PC conserva os pacotes originais.

Instalações anteriores são lidas em seu lugar original, sem conversão/cópia. Atualizações de
metadados reservam só64MiB de margem; mudanças de dados reservam arquivos novos +margem.
A cópia de entrada ainda ocupa espaço até o sucesso, e um banco alterado é recebido inteiro.
O kit USB confere o ID existente e pula transferência quando só o APK precisa ser atualizado.
Não há sincronização bidirecional. Esse layout exige APK0.2.1+, sem downgrade para0.2.0.
Veja [QA de armazenamento](../qa/android-storage-2026-10-19.md).

O snapshot pessoal do PC é importado uma vez, por IDs, com `INSERT OR IGNORE`. Edições
posteriores no telefone prevalecem. Isso não é sincronização do workspace do PC: investigações
complexas e revisões editoriais continuam canônicas nele. Backup Android explícito inclui
notas, pastas, grupos, ligações, progresso, marcações e referências, em JSON privado.
Restore é transacional e idempotente, não sobrescreve IDs existentes.

## Busca e modelos

FTS5 continua sendo o índice textual. Referências completas em português/ID do livro são
resolvidas sem inferir equivalência de esquemas. A busca por sentido usa ONNX Runtime
Android, WordPiece cased e vetores float32 little-endian em SQLite. Nenhum texto bíblico
é varrido em JavaScript e nenhuma LLM é necessária.

Modelo fixado: `Xenova/distiluse-base-multilingual-cased-v2`, revisão
`cad454171d918d9873a2701ba245054b6c1760dd`, ONNX quantizado por SHA-256. Receita explícita
`distiluse-onnx-dense-tanh-l2-96-v2`: média dos tokens válidos, projeção Dense 768→512,
Tanh e L2, até 96 tokens. A projeção usa os pesos safetensors oficiais da revisão
`bfe45d0732ca50787611c0fe107ba278c7f3f889`, também fixados por SHA-256, exportados para
float32 little-endian. Não se executa pickle. A receita anterior sem essa projeção foi
rejeitada pelo QA de relevância; os índices não são misturados entre receitas.
O exportador inclui probes PT/grego/hebraico para conferir tokenização e vetores no Android.
Este índice cobre 69.130 unidades das duas edições portuguesas; outras edições informam
ausência de índice, sem fingir busca semântica. Similaridade não é verdade teológica.
A busca por sentido é **experimental**: o caso “perdoar os inimigos” ainda recupera contextos
inadequados e mantém um teste privado de relevância como gate pendente. A correção estrutural
Dense não significa relevância resolvida. FTS permanece a opção padrão, sem depender desse modelo.

OpenAlex é consultado somente após ação explícita, com limites/timeouts e filtros de idioma
e acesso aberto. Google/Scholar/bibliotecas são atalhos claramente identificados. Não há
envio automático de livros/notas nem download de PDFs externos.

Tradução no Android usa **ML Kit**, não o Marian do PC: inglês/espanhol → português,
download explícito do modelo, execução local e cache por texto/provedor/glossário.
O glossário versionado é o mesmo JSON do serviço Python. Termos protegidos não atravessam
o tradutor. O original nunca é substituído; a tradução continua automática e falível.
Modelo de tradução ainda não é incluído no APK e requer conexão na primeira utilização.

## Interfaces nativas

- Hoje: capítulo do dia calculado sobre as edições reais; não fixo em João 1.
- Escrituras: seleção, comentários, fontes em modal, imagens, comparação pelo esquema,
  texto original, interlinear por unidade, léxico, morfologia, ocorrências e estatísticas.
- Biblioteca: capas derivadas dos PDFs reais, páginas, original ampliável, índice extraído,
  fontes antigas paginadas, tradução e referências guardadas.
- Estudos: árvore, guias, aulas e curso com atividades e critérios explícitos de progresso.
- Notas: editor de página, pastas aninhadas, grupos/cores, links `[[id|rótulo]]`, referências
  recebidas e grafo. Leitura Markdown parcial; não é implementação completa do Obsidian.
- Mapa: entidades ontológicas distintas, relações, proposições, premissas e argumentos
  realmente presentes no banco público. Ausência de dados não vira conteúdo inventado.
- Rastro: histórico paginado/filtrável e abertura da fonte/rationale/evidência.

## Limitações que não podem ser confundidas com paridade

Ainda não há editor nativo completo de investigações/perguntas do desktop, sincronização
PC↔Android, abas múltiplas de notas, renderizador Markdown completo, autocomplete de todas
as abreviaturas bíblicas, exposição completa de todo payload acadêmico, filtro acadêmico por
ano, nem a mesma implementação Marian/embeddings do PC. Não há word alignment português↔
hebraico/grego quando a edição não o oferece. Não há OCR ou produção de conhecimento,
por decisão de escopo. Publicação Play Store, assinatura de pacotes e teste em aparelho
físico/API 28 permanecem pendentes. O instalador USB usa o APK debug e sua chave de assinatura
de desenvolvimento; assinatura diferente é erro, nunca motivo para desinstalar automaticamente.
Não declarar paridade integral enquanto isso existir.

## Verificação

```powershell
npm run typecheck
npm run lint
npm test
npm run build
cd android
.\gradlew.bat :app:testDebugUnitTest :app:lintDebug
# O build contém somente software; o kit privado fica separado em data/mobile*/.
.\gradlew.bat :app:assembleDebug
```

`PersonalDataTest` testa migração v1→v2, backup/restore, pastas, links e seed idempotente
em SQLite temporário no Android. `BundledLibraryTest` é QA privado opt-in: instale o kit,
aguarde a ativação do acervo e execute instrumentation com `-e fullQa true`. Ele verifica
contagens, arquivos, consultas reais, léxico, tokenização e vetores PC→Android. Nunca leve
esses livros ao CI público. `InstalledAcervoTest` continua exercitando pacote/patch explícito.

`PatchPersistenceTest` recebe um `-e patchPath` explícito para conferir atualização real,
idempotência e preservação do backup pessoal. Sem esse argumento, o teste é skipped.
Resultados e limitações desta expansão: [QA de consumo nativo](../qa/mobile-consumption-2026-10-18.md).
