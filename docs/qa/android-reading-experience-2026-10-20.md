# Android 0.3.0 — leitura e uso diário

Data: 20/10/2026. Escopo: feedback de uso do mobile, preservando acervo, notas e identidade
escura/bronze. Desktop, pipeline, SQL canônico, modelos semânticos e livros não foram reprocessados.

## Entregue

| Pedido                            | Comportamento                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Achar a passagem durante um culto | Leitura → Ir para…; nomes, abreviações e referências compactas; seleção livro/capítulo/versículo; salto para a unidade solicitada sem percorrer comentários         |
| Busca de referência               | Referência exata não é misturada à pesquisa FTS; tanto ela quanto hits textuais preservam o versículo de destino                                                    |
| Comentários individuais           | Prévia de três linhas; expandir/recolher por comentário; controles e abertura da fonte no topo, mesmo após expandir texto longo                                     |
| Fonte completa                    | Modal com texto, justificativa, páginas/seção disponível, original e Rastro; método interno em detalhes técnicos recolhidos                                         |
| Diferenciar texto e comentário    | Escritura serifa 23sp/36sp; comentário sans-serif 15sp/24sp em superfície separada; número branco em selo bronze; destaque da referência solicitada                 |
| Filtros de comentários            | Classe declarada no payload + documento de origem; texto-prova confessional continua distinto de exegese; classes ausentes não são inventadas                       |
| Livros organizados                | Duas colunas, símbolo por família e os mesmos grupos editoriais do desktop, incluindo deuterocanônicos/outros conforme disponibilidade                              |
| Não canônicos                     | Acesso aos textos antigos e volumes privados presentes no pacote; filtros Não canônico/Apócrifo/Esotérico/Fontes antigas. Catálogo não vira texto integral fictício |
| Aulas temáticas                   | Nomes editoriais em português, inclusive em pacotes antigos; exportador corrigido para os próximos. IDs preservados internamente                                    |
| Home                              | Botão Home e título clicável; retomar último versículo visível; passagem e trilha do dia calculadas a partir dos dados instalados                                   |
| Cores das notas e grupos          | Paleta nomeada com seleção visual, sem exigir hexadecimal; cores antigas mantidas                                                                                   |
| Voltar                            | Histórico por módulo e na leitura, retorno entre subpáginas e confirmação de descarte das notas                                                                     |
| Ambiente                          | Transições de módulos e expansão; sons curtos opcionais, desligados inicialmente, respeitando silencioso/volume de mídia                                            |
| Tradução                          | Mantida local por escolha do usuário; preparo de idiomas nos ajustes; estados de download/tradução/erro, timeout, tentativa e reutilização offline dos modelos      |

Home usa a data local, a contagem real de capítulos/versículos e o catálogo real de guias.
Não são mensagens sorteadas fictícias, calendário litúrgico nem revelação personalizada. O
histórico de navegação e as preferências pertencem ao aparelho; o backup de notas mantém o
formato e as tabelas existentes. Não houve migration SQL nem alteração de sincronização.

Os filtros de textos antigos identificam a coleção copta instalada e volumes privados por
seus títulos editoriais. Não se atribui um cânon universal, nem se promete tradução portuguesa
dos 52 itens do catálogo Nag Hammadi. O filtro esotérico não reclassifica automaticamente todo
texto não canônico como esoterismo.

## Verificação executada

- Gradle: `:app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug`.
  Build e lint passaram. 38 testes JVM: 26 instalador, 6 políticas e 6 navegação.
- Node: `npx vitest run scripts/mobile --testTimeout=60000`: 8 testes / 2 arquivos passaram.
  Inclui regressão do título e primeiro capítulo da aula Trindade, antes expostos como ID.
- `npm run typecheck` e `npm run lint` passaram. Não houve alteração de interface web nem
  necessidade de reconstruir índices grandes via prebuild do desktop.
- Instrumentation no AVD isolado `Scriptorium_Feedback_QA`, API37, porta5560, criado emC,
  sem alterar Pixel_8 nem usar celular físico. Pacote privado original de 57 PDFs/10 edições.
- Referências reais/ranges/versículo inexistente, títulos das aulas, Tomé copta e volumes
  Nag Hammadi passaram. Consulta medida: primeira referência188ms; referência com catálogo
  em cache120ms. São consultas do repositório, não tempo total de interação ou garantia no telefone.
- `ReadingUiTest`: passou em23,467s com a árvore de acessibilidade nativa: salto a Sl119:105,
  presença do versículo, salto a Gn1:1, expandir/recolher, abrir/fechar fonte, Voltar à passagem
  anterior, Home/retomada, paleta Vinho e descarte seguro da nota sem salvar.
- Durante o QA, o controle de recolher ao fim de um texto longo ficou fora da área visível;
  movido para o topo. Tentativas iniciais da automação também encontraram cache de nós e
  eventos Back sem timestamps adequados no API37. O driver foi corrigido para refresh de nós
  e `input keyevent KEYCODE_BACK`; o cenário completo passou sem remover suas verificações.
- Tradução real: preparo/download e inglês→português passaram em14,302s; resultado
  “O livro está na mesa.”. Nova execução com modo avião, Wi-Fi/dados desligados e banco de cache
  temporário novo passou em1,060s. Rede restaurada após o teste. Não é avaliação de qualidade acadêmica.
- Regressão final: `PersonalDataTest` (3 casos: migração v1, backup/links e seed sem overwrite)
  - referências reais (1): quatro testes passaram em2,490s.
- Atualização instalada por cima de0.2.1, a partir do APK entregue na Área de Trabalho.
  SHA256 de `personal.sqlite3` permaneceu idêntico antes/depois dos testes e atualização:
  `723c408ebd30203ea22c965b2de663b0120226af95d39ee4ecc1a5d5febb2734`.
  ID do acervo continuou `b289f600860241228bc119395f56b985bdd8c724a4d8d411c8df7e172e8b701b`;
  armazenamento de conteúdo3.637.896KiB, sem reenviar nem duplicar livros na atualização do APK.

ML Kit segue o [controle oficial dos modelos](https://developers.google.com/ml-kit/language/translation/android).
Não foi habilitado Google Cloud nem serviço remoto. Inglês arcaico e terminologia teológica
continuam sujeitos a erros: o original permanece separado. Hebraico, grego e copta não são
traduzidos por este provedor. Relevância semântica, assinatura de produção e paridade integral
com desktop continuam com os limites anteriores; não foram declarados corrigidos.

## Entrega e limites

APK0.3.0/versionCode4 na pasta privada `C:/Users/comical/Desktop/Scriptorium-Android-0.3.0/`.
Somente aplicativo atualizado, instruções e SHA256; não criamos outro ZIP de1,9GB com o mesmo
acervo. APK contém apenas assets de rótulos/glossário, sem PDFs, SQLite nem modelos privados.
Instalar por cima, **sem desinstalar**. Para primeira instalação, importar o acervo do kit anterior.

Não testado em aparelho físico/API28; áudio audível não avaliado no emulador sem saída de som.
Som fica opcional e desligado inicialmente. Não foi feita avaliação humana de todos os textos,
tradições, traduções ou combinações de filtros, nem sincronização bidirecional de notas.

APK final: 183085379 bytes; SHA256 `2efd6189b9f116d18f3bfeb6e7e81b494ad44748297c72b9ae4f5c8e0367b7cf`.
Inspeção visual adicional: grade de livros com duas colunas/símbolos, filtro Não canônico
com Tomé e volumes privados Nag Hammadi e Home com Sl119:105/Sl56:12/trilha Pneumatologia.
