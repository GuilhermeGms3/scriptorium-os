# Fundação Android local-first

## Escopo aprovado

Android nativo Kotlin/Compose para consumir todo o conteúdo preparado no PC, com evolução
até paridade funcional. OCR, desmontagem e produção de conhecimento permanecem no PC.
Esta entrega começa a migração por uma vertical executável; a matriz de paridade está no
[README Android](../../android/README.md). Não declara concluídos os módulos ainda não portados.

## Contrato de entrega v1

`npm run mobile:export` gera ZIP `.scriptorium`, com `manifest.json` como primeira entrada:
`format=scriptorium-mobile-v1`, `schemaVersion=1`, ID SHA-256, base opcional, timestamp,
`privateUseOnly=true`, labels de livros em português, edições e catálogo completo de arquivos
com path/tamanho/SHA-256. O ID é derivado do catálogo, edições, labels e base; não de slugs visíveis.
O parser Android valida separadamente esse contrato e o instalador valida todos os arquivos.

Arquivos permitidos: `content.sqlite3`, `knowledge.sqlite3`, `corpus/<edition>.sqlite3`,
`documents/<sha256>.pdf`. Nenhum SQL arbitrário ou arquivo pessoal é distribuído pelo patch.
Exportação e importação preservam o manifesto original para rastreabilidade.

- Corpora: bancos canônicos existentes, sem converter o domínio para `verse -> translations`.
- Conhecimento público: snapshot existente preservado, embora ainda não haja UI para todas as tabelas.
- Conteúdo privado: projeção materializada exclusivamente para consumo. Documentos/páginas,
  comentários com análise contextual, destinos N:M, spans e eventos preservam os IDs de origem.
  A leitura da fonte é transacional e read-only; não inicia jobs nem muda decisões.
- Elegibilidade: comentários aceitos ou machine-visible, nunca rejected/revoked/withheld/exception.
  Uma análise assistida continua rotulada como tal. Menções sem análise contextual não viram exegese.
  Não é a exportação completa de todas as propostas/claims privadas do pipeline nesta primeira versão.
- Notas/progresso desktop não são implicitamente substituídos nem sincronizados. Uma migração pessoal
  explícita continua pendente; pacotes de conteúdo jamais recebem autoridade sobre notas locais.

## Instalação e patches

Preparação → validação de manifesto/base → extração limitada → cópia dos arquivos inalterados
da base → SHA-256 de todos os arquivos → quick_check/FKs/contrato SQLite → geração imutável →
ativação por AtomicFile. Erro antes da ativação preserva a geração anterior.

ZIP usa DEFLATE e data descriptors. O primeiro QA detectou que STORED com data descriptor,
embora aceito pelo leitor JS, não era consumido corretamente pelo ZipInputStream Android.
O exportador e o teste de regressão foram corrigidos; o pacote real passou depois da correção.

O primeiro QA também encontrou a seleção indevida do esquema original da Bíblia Livre por ordenação
lexical. O adapter agora prefere o endereço `scriptorium-bcv-1` **quando esse endereço já existe
explicitamente para a unidade**, como no runtime desktop. Não ignora nem rebatiza versificação.

Patches são diferenciais por arquivo, vinculados à base exata. Não há download automático,
assinatura, delta SQL nem coleta de gerações antigas. Hash não prova autenticidade.
O APK nesta etapa não tem permissão de internet e não expõe o servidor local do PC.

## Verificação registrada

- JVM: 10 testes do instalador — instalação/reabertura, patch, notas, repetição, corrupção,
  base errada, traversal, tamanho/ausência, validação SQLite e falha de ativação.
- Node/Vitest: 2 testes de projeção/contrato — política editorial, IDs/esquema/spans/direitos,
  FTS, FKs, Rastro, fonte não alterada, ZIP compatível e omissão de arquivos inalterados.
- Android real em emulador Pixel 8/API 37: capacidades FTS5/STRICT; importação de pacote real,
  Gênesis/versículos/comentários, evidência, Rastro, pesquisa, ontologia e notas persistidas após
  reimportação. A validação em Android físico e API 28 ainda não foi executada.
- Exportação real de 18/10/2026: **57 documentos, 47.707 páginas e 45.949 comentários elegíveis**.
  Uma edição bíblica e ontologia: 952.870.132 bytes no ZIP inicial sem compressão; o formato
  compatível/comprimido ficou em **212.452.898 bytes**. Sem PDFs originais nesse QA.
  Quantidade de ligações não significa cobertura integral dos versículos nem revisão humana total.

- Patch real de labels PT gerado a partir da mesma fonte: **1.336 bytes**, sem reenvio dos
  três bancos. Aplicação no Android conferiu base, nomes em português e preservação de nota.
  O primeiro ensaio foi recusado corretamente por falta de espaço; removidas apenas duas cópias
  temporárias do ZIP incompatível de QA, a instalação passou. O banco original do PC não foi tocado.
- `npm run typecheck`, `npm run lint`, `npm run build`: passaram. Suíte completa: **479 testes
  em 74 arquivos**, todos passaram. O lint web ignora os relatórios JS gerados por Gradle,
  sem desabilitar verificações de código-fonte.
- `:app:assembleDebug`, `:app:assembleDebugAndroidTest`, `:app:testDebugUnitTest` e
  `:app:lintDebug`: passaram. Lint Android: **zero erros e 12 avisos** sobre versões mais
  novas/SDK e recomendações de implementação; não foram escondidos com baseline/suppressions.
- APK debug: **34.295.593 bytes**. QA visual no emulador confirmou navegação livro/capítulo,
  comentário real e modal de evidência; reinício do processo preservou o pacote instalado.
  CI foi configurado, mas a execução remota do workflow ainda não foi conferida.
- Para primeira instalação foi consolidado e validado novamente um pacote completo com labels PT,
  sem exigir aplicar o patch separadamente: `data/mobile-qa-patch-20261018/acervo-completo.scriptorium`,
  **212.453.624 bytes**, com manifesto em `manifest-completo.json` para a próxima exportação incremental.
  Inclui os 57 livros em texto extraído, comentários elegíveis, Bíblia Livre e ontologia; não inclui
  originais PDF nem outras edições nesse pacote de QA. Os arquivos permanecem privados/ignorados.
