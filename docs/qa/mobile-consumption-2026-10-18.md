# Android — QA da expansão de consumo

Data de desenvolvimento: 18/10/2026 (algumas execuções já em 19/10 UTC).
Branch: `melhoria/front-organizado`. Implementação nativa Kotlin/Compose, sem WebView.
Esta entrega não deve ser descrita como paridade integral com o desktop.

## Acervo e entrega

- Snapshot privado: 57 PDFs, 47.707 páginas extraídas, 45.949 comentários elegíveis,
  10 edições, 16 guias e 111 aulas; catálogo de 52 entradas de Nag Hammadi.
- Contagens de disponibilidade não significam cobertura de todos os versículos nem
  interpretação revisada. O catálogo não é uma tradução integral instalada.
- Kit: `data/mobile-delivery-ready-20261018/Scriptorium-completo.zip`, 1.968.288.826 bytes.
  SHA-256: `4704cffd0fd05f60f3c8d9e5ad2c0b4afdbfa8273afe007a9ce3fa4e48c88716`.
- APK: 181.193.301 bytes, SHA-256
  `2f24b68408cc164570aad6f835cea18d30582bbb8c77f7bc0f67813fd70454ff`.
- Pacote completo: 1.786.907.212 bytes, SHA-256
  `47f5751b8a0123e664bad56fd11b9c178000afd6c7fe29f510f379e57195194f`.
- ID do acervo: `b289f600860241228bc119395f56b985bdd8c724a4d8d411c8df7e172e8b701b`.
- O ZIP contém APK, pacote inteiro, instalador, manifesto, checksums e instruções.
  Inspeção do APK encontrou somente o glossário nos assets, não PDFs/modelos privados.
  Kit, exportações e build são ignorados; nenhum livro acompanha o commit público.

## Validações executadas

| Verificação                                                             | Resultado                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| Vitest completo, `--maxWorkers=2 --testTimeout=60000`                   | 482 testes / 75 arquivos passaram                       |
| TypeScript, `npm run typecheck`                                         | Passou                                                  |
| ESLint, `npm run lint`                                                  | Passou                                                  |
| Prettier dos scripts e documentos alterados                             | Passou                                                  |
| Ruff check/format do indexador Python                                   | Passou                                                  |
| Android `assembleDebug`, `assembleDebugAndroidTest`                     | Passaram                                                |
| Android `testDebugUnitTest`                                             | 19 testes passaram: 14 instalador + 5 políticas         |
| Android `lintDebug`                                                     | Zero erros, 18 avisos; não houve upgrade fora do escopo |
| Instalador PowerShell real, transferência binária e ativação automática | Passou no emulador isolado                              |

Instrumentation privado: seis testes executados em 73,65 s, cinco passaram e um falhou
(relevância semântica, detalhada abaixo). Passaram as três verificações de migração,
seed e backup/restore pessoais, a capacidade SQLite/FTS e a consulta completa do acervo.
O código de saída do comando ADB não basta para classificar esse resultado: o runner
declarou `Tests run: 6, Failures: 1`.

O build web foi repetido com `npx vite build` e passou, incluindo cliente/SSR/Nitro.
Nenhum arquivo de configuração de produção foi alterado. Avisos de resolução de paths
e tempo de plugins já existentes não foram tratados por uma migração fora do escopo.

O teste privado de patch executou mais um caso, aprovado: aplicou um patch de manifesto
de 6.278 bytes sobre o acervo completo, reinstalou o mesmo patch e comparou o backup
pessoal integral antes/depois. Foram 268,079 s no emulador. Houve fallback para cópia
dos arquivos, não hardlinks, observado por inodes diferentes; não prometer economia de
espaço ou instalação instantânea nesse ambiente. Resultado agregado privado: sete casos,
seis passaram e um falhou (relevância).

Após force-stop e abertura a frio, o ponteiro permaneceu na versão do patch
`e6c451cb877129163f1001e9cf2f98bb72fc3052af93d76f516e1f2575aeecad`.
`am start -W` mediu `LaunchState: COLD`, `TotalTime: 1757 ms`. A UI mostrou novamente
as notas com links, grupos e as capas reais da biblioteca. A Didaquê abriu com original
inglês e a tradução previamente preparada no PC. O botão ML Kit, consentimento, download
e exibição de nova tradução local também foram confirmados pela UI.

A qualidade da tradução ML Kit **não foi aprovada para uso acadêmico**. Na Didaquê,
o inglês arcaico produziu, entre outros problemas, “rápido” para `fast` no contexto de
jejum e construções portuguesas ruins. É tradução de apoio automática, não equivalência
qualitativa com o Marian do PC nem interpretação revisada. O original e a tradução
previamente preparada continuam separados. Não se corrigiu isso com substituições globais
de termos ambíguos, que poderiam alterar outros contextos.

O teste completo do acervo confirmou tamanhos/arquivos, contagens, endereços explícitos,
Gênesis 1, comentários, comparação, FTS, léxico, estatísticas, ontologia, Rastro,
tokenização PT/grego/hebraico e vetores PC→Android. Confirmou também a preservação da
nota com link criada anteriormente pelo editor nativo após atualização de APK e conteúdo.

Busca semântica aquecida medida em 960 ms no emulador, para 31.101 vetores da Bíblia
Livre; índice de ambas as edições portuguesas: 69.130 vetores. Geração do índice no PC:
aproximadamente 759 s, quatro threads. Não são benchmarks de aparelho físico.

## Falha de qualidade mantida visível

A busca “perdoar os inimigos” retorna principalmente hostilidade a inimigos e não
recupera os contextos esperados do Sermão da Montanha/Planície no top 30. O teste privado
`semanticRelevanceMustRecoverEnemyForgivenessContext` falhou e permanece como gate.
Os vetores são tecnicamente consistentes entre PC/Android; isso não comprova relevância.
FTS é padrão e não depende dessa busca, que está explicitamente marcada experimental.
Não se removeu o teste nem se inseriram resultados bíblicos hardcoded para fazê-lo passar.

## Problemas encontrados e corrigidos

- SQLite pessoal inicialmente abria na thread principal: inicialização movida para IO.
- APK de aproximadamente 2 GB: atualização derrubou `system_server` no emulador API37
  (`ApkAssets.finalize()`/watchdog). Esse modo foi retirado; todos os livros agora vão
  no mesmo kit, fora dos assets do APK, com instalação automática.
- APK incremental retinha bytes antigos mesmo sem entradas privadas visíveis: o
  gerador limpa somente os artefatos Android e rejeita APK maior que 512 MiB.
- Projeção Dense faltante na receita inicial de embeddings: corrigida com pesos oficiais
  fixados por revisão/SHA; não misturar índices de receitas diferentes.
- Proposições em português eram presumidas inglesas: idioma desconhecido exige escolha
  explícita antes da tradução. Não há tradução silenciosa dos textos originais.
- Teste privado e seleção de busca presumiam que a primeira edição era uma Bíblia:
  usam agora a seleção bíblica explícita, sem transformar fonte antiga em capítulo zero.

## Limites de validação e paridade

Emulador API37 isolado, dados em `data/mobile-qa-avd`; o perfil Pixel_8 e o workspace
canônico não foram apagados. Banco do PC aberto somente read-only pelo exportador.
Não foi alterado o Docker nem o target de produção.

Pendentes: aparelho físico/API28, release/assinatura de distribuição, autenticidade de
pacotes, coleta de gerações antigas, calibração semântica, melhoria/avaliação de qualidade
da tradução, teste de rede real do OpenAlex, editor completo de investigações, sync bidirecional, múltiplas abas e
Markdown completo nas notas, painéis especializados do desktop. ML Kit não é o Marian
do PC e requer download inicial explícito do modelo de idioma. OCR e produção editorial
ficam no PC por decisão de escopo, não são recursos prometidos para o Android.
