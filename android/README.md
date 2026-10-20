# Scriptorium Android — leitura nativa e kit completo

Aplicativo **Kotlin + Jetpack Compose**, sem WebView, para consumir offline o acervo preparado
no PC. Há entrega privada com aplicativo e todos os PDFs no mesmo kit; **não é ainda paridade integral com o desktop**.
O desktop, o pipeline Python e o workspace original não são substituídos.

**Entrega completa com os livros:** siga [kit completo e consumo nativo](../docs/architecture/mobile-consumption.md).
O pacote privado atual reúne 57 PDFs, 47.707 páginas e 10 edições. `npm run mobile:bundle`
gera um ZIP com APK, acervo e instalador USB automático, sem importação livro por livro.
Não use o APK sozinho se deseja levar o acervo. Um APK de ~2 GB causou falha no sistema
de recursos do emulador; por isso os livros vão juntos no kit, não dentro do APK.

## Uso no celular — 0.3.0

- **Leitura → Ir para…** abre referências como `Jo3:16`, `Gn 1:1-3`, `1Co 13:4-7`
  e `Sl 119:105`. Valida os endereços na edição instalada e posiciona a lista no versículo,
  independentemente da quantidade de comentários anteriores. Também há seleção livro → capítulo → versículo.
- Livros em duas colunas, separados por Pentateuco, históricos, poesia, profetas, evangelhos,
  cartas e deuterocanônicos/outros, com os mesmos grupos editoriais do desktop.
- Filtros **Não canônico**, **Apócrifo**, **Esotérico** e **Fontes antigas** dão acesso aos textos
  realmente instalados e aos volumes privados identificados pelo título. Nag Hammadi não vira
  52 traduções fictícias: texto crítico copta, catálogo e volumes privados são distintos.
- Escritura em serifa, maior e clara; comentários menores em sans-serif, em superfícies
  separadas. Número branco em selo bronze. Cada comentário começa como prévia e pode ser
  expandido/recolhido separadamente; a fonte completa abre à parte com página/seção disponível.
- Filtros de comentários combinam assunto declarado e livro de origem. Texto-prova
  confessional não é rotulado automaticamente como exegese. Ausência de classe não é inventada.
- **Home** e o título Scriptorium levam ao início. Há retomada do último versículo visível,
  passagem diária calculada sobre capítulos/textos reais e trilha diária entre guias instalados.
  A seleção por data não é calendário litúrgico nem revelação personalizada.
- Botão Voltar do Android retorna nos módulos e subpáginas; apenas no início sem histórico
  fica com o comportamento normal de saída. A confirmação de descarte das notas é preservada.
- Cores de notas/grupos por paleta nomeada, sem digitar hexadecimal. Cores anteriores preservadas.
- Transições suaves de módulo e expansão de comentários. Som breve opcional em **Ajustes e
  backup → Ambiente de estudo**, inicialmente desligado e respeitando silencioso/volume de mídia.
- Tradução segue local por decisão do usuário, sem Google Cloud/chaves/serviço remoto. Os
  modelos podem ser preparados em **Ajustes e backup → Tradução local**. Modelos instalados
  são usados sem consultar atualizações; download, tradução, timeout e erro têm estados próprios.
  Inglês/espanhol → português; não traduz copta/hebraico/grego por esse provedor.

Os rótulos leves do APK são gerados por `npm run mobile:labels` a partir do catálogo editorial
versionado do desktop. Não trazem livros nem dados pessoais. Esta atualização não exige
reexportar o acervo: instale o APK novo **por cima**, sem desinstalar o anterior.

## Compilar

Abra esta pasta no Android Studio. Requer JDK 21, SDK Android 36 e Build Tools 36.0.0.
O wrapper fixa Gradle 9.4.1 com SHA-256; AGP 9.2.1 usa Kotlin embutido 2.2.10 e plugin
Compose da mesma versão. Compose BOM 2025.10.00 / Activity 1.11.0 / Lifecycle 2.9.4
foram fixados para compilar com API 36. Não há dependências dinâmicas. Mínimo: Android 9/API 28.

No PowerShell, dentro de `android/`:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA/Android/Sdk"
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
.\gradlew.bat :app:installDebug
```

Linux/macOS: `./gradlew` com as mesmas tarefas. APK de desenvolvimento:
`app/build/outputs/apk/debug/app-debug.apk`. O APK sozinho não contém livros; o kit os coentrega.
A assinatura de produção e publicação na Play Store ainda não estão configuradas.

## Levar o acervo do PC

Na raiz do repositório, após os índices existentes estarem gerados:

```powershell
npm run mobile:export -- --output data/mobile-inicial --workspace data/workspace/workspace.sqlite3 --editions biblia-livre-n4-2025.1.0,sblgnt-1.2,wlc-oshb-2.2
```

A pasta de saída precisa ser **nova**. O comando não sobrescreve exportações nem grava no banco
de origem. Com `--workspace`, usa uma transação de leitura consistente para projetar documentos,
páginas, comentários elegíveis, evidências e eventos existentes. Sem essa opção, o pacote leva
somente as edições públicas selecionadas e a ontologia pública. Não se conecta à API SQL do servidor.

Para incluir também os **PDFs originais**, acrescente `--include-pdfs`: serão conferidos por SHA-256.
Sem a opção, todos os textos extraídos das páginas são incluídos, mas não as imagens do PDF.
O exportador para se um original solicitado estiver ausente ou divergente; não inventa substitutos.

Transfira `data/mobile-inicial/acervo.scriptorium` por USB ou outro canal privado.
No aplicativo: **Mais → Pacotes → Importar/Instalar pacote**. O seletor de arquivos do Android
dispensa acesso amplo ao armazenamento e não requer um servidor acessível pela rede.

### Atualizar sem apagar notas

```powershell
npm run mobile:export -- --output data/mobile-atualizacao --workspace data/workspace/workspace.sqlite3 --editions biblia-livre-n4-2025.1.0,sblgnt-1.2,wlc-oshb-2.2 --base data/mobile-inicial/manifest.json
```

Use a mesma seleção de edições/PDFs que deseja manter. O novo manifesto descreve o catálogo
completo desejado; o arquivo ZIP contém apenas arquivos alterados, além do manifesto.
Sem `--include-pdfs` numa atualização, os PDFs anteriores deixam de fazer parte do catálogo novo.
O patch exige o ID exato da base. Para pular versões, gere e importe um pacote completo.

O diferencial é **por arquivo**, não por linha SQL/página de banco. Se `content.sqlite3` mudar,
esse banco será reenviado inteiro, comprimido. A partir do APK0.2.1, o instalador guarda somente
arquivos alterados e um manifesto local que referencia os arquivos imutáveis já instalados.
Não depende de hardlink e não copia PDFs/corpora inalterados para cada atualização. Confere
tamanhos, SHA-256, SQLite/FTS e FKs antes de ativar o ponteiro atomicamente; só após confirmar
sua gravação coleta arquivos obsoletos. Notas e progresso ficam fora dessa coleta.
Instalar novamente o mesmo ID é idempotente. Na abertura, remove também cópias obsoletas
criadas pelo instalador antigo, sem copiar o acervo atual. O instalador USB não reenvia o
pacote quando seu ID já está ativo: atualiza apenas o APK.

Reserve espaço para arquivos novos descompactados +64 MiB, além do pacote de entrada e da
instalação do APK. Um patch apenas de manifesto não reserva outra cópia dos3,72GB do acervo.
O espaço básico continua necessário; a atualização por arquivo não é um delta de linhas SQL.
O layout local com `locations.json` exige APK0.2.1 ou posterior; não faça downgrade para0.2.0.
A recuperação de um conteúdo antigo usa um pacote completo; versões obsoletas não são backup.
Resultados: [QA de armazenamento](../docs/qa/android-storage-2026-10-19.md).

## Implementado e restante

| Área           | Nesta entrega                                                                                         | Ainda falta para paridade                                               |
| -------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Leitura        | Edições, livros/capítulos, comentários/ranges, toggle, comparação, original e interlinear por unidade | Refinar seleção/filtros e alinhamentos não fornecidos pelas fontes      |
| Texto original | Léxico, tradução, morfologia, ocorrências e estatísticas por livro/vizinhos                           | Todos os painéis especializados do inspetor desktop                     |
| Biblioteca     | PDFs originais, capas reais, páginas, índice extraído e fontes antigas paginadas                      | Leitor com todas as ferramentas editoriais do desktop                   |
| Rastro         | Histórico paginado/filtrável, fonte, rationale e evidência                                            | Auditoria visual de todos os payloads históricos                        |
| Busca          | FTS, referência completa, sentido offline, OpenAlex e atalhos externos                                | Ranking híbrido idêntico ao PC, abreviaturas completas e filtro por ano |
| Estudos        | Árvore, guias/aulas, curso com atividades/progresso; mapa ontológico/argumentos separado              | Editor completo de investigações e recursos vinculados                  |
| Notas          | Pastas, grupos, cores, links, grafo, seed pessoal e backup/restore                                    | Abas múltiplas, Markdown completo e sync bidirecional                   |
| Tradução       | ML Kit local inglês/espanhol→português, glossário e cache, preservando original                       | Mesma implementação Marian do PC e pesos de tradução incluídos          |
| Pacotes        | Exportação privada, integridade, instalação completa e patch por arquivo                              | Assinaturas/autenticidade, download e delta por registros               |

Não há OCR, desmontagem, análise editorial por LLM nem geração de conhecimento no Android.
O modelo ONNX é usado somente para recuperação por sentido. O aplicativo desta
etapa pede permissão INTERNET para pesquisa acadêmica e download explícito do modelo de tradução.
Não execute inferência remota ou exponha a API local do PC para "completar" botões.

## Arquitetura e segurança

- `content/`: manifesto versionado e instalador JVM testável. ZIP DEFLATE compatível com
  `ZipInputStream`; limites por entrada e cumulativos, paths allowlisted e staging privado.
- `data/`: SQLite embarcado AndroidX **2.6.2**, com FTS5/STRICT mesmo em aparelhos cujo SQLite
  de sistema não suporta os bancos existentes. Corpora são abertos read-only e mantêm IDs,
  edições, esquemas, crosswalks, direitos e proveniência. Endereços de navegação explícitos
  existentes são preferidos; não se igualam números entre esquemas incompatíveis.
- `AppModel`: IO/coroutines fora da composição; pacote instalado por ação explícita e feedback
  real de etapa. `AtomicFile` ativa a geração. Consultas parametrizadas; UI não escreve SQL.
- `ui/`: Compose nativo, tema escuro/bronze, serifas na leitura, fonte em modal, divulgação
  progressiva de contexto de livro/capítulo e múltiplos comentários.
- `personal.sqlite3`: notas do aparelho, sem ser anexado pelo instalador de conteúdo.
  Banco e esquema pessoais versionados. O conteúdo do PC é derivado read-only, não uma segunda
  autoridade editorial. O seed pessoal é incorporado uma vez sem sobrescrever edições locais; não é sync.
- Diretórios de exportação `data/mobile*/`, builds e `local.properties` são ignorados.
  Livros privados não vão para Git, imagem Docker nem artefato de CI. Backups automáticos do
  Android estão desativados; backup manual das notas está em Mais → Ajustes e backup.

Hashes detectam corrupção, **não autenticam o autor do pacote**. Nesta fase importe somente
arquivos preparados por você. Há limite de 12 GiB descomprimidos, 4 GiB por arquivo e 2.000 arquivos;
é necessário espaço para os arquivos alterados sem apagar os ativos antes da confirmação.
Arquivos inalterados são compartilhados por referência e obsoletos são coletados após ativação.

## Testes e QA

```powershell
# Na raiz: contrato e projeção com SQLite temporário, sem livros privados
npx vitest run scripts/mobile/export-content.test.ts --maxWorkers=1

# No Android: instalador, corrupção, idempotência, rollback e preservação de notas
.\gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug

# Com emulador/aparelho: teste SQLite/FTS real; QA privado é opcional sem packagePath
.\gradlew.bat :app:connectedDebugAndroidTest
```

`InstalledAcervoTest` permite QA privado adicional, com um pacote real já copiado para `filesDir`
do APK debug, usando argumentos `packagePath` e, opcionalmente, `patchPath` do instrumentation
runner. Sem `packagePath`, **esse caso privado é marcado como skipped**, não considerado validado.
O teste de capacidades SQLite/FTS roda sem acervo privado. CI executa build/lint/testes JVM e
publica somente o APK debug vazio; nunca os pacotes de livros.

Verificação inicial: [fundação mobile](../docs/architecture/mobile-foundation.md).
Resultados da expansão: [QA de consumo nativo](../docs/qa/mobile-consumption-2026-10-18.md).
