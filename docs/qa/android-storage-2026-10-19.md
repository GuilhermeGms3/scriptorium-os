# Android — espaço de atualizações, APK0.2.1

Data:19/10/2026. Escopo: armazenamento/instalação, sem mudar notas, acervo editorial do PC,
UI de leitura, calibração semântica ou qualidade de tradução. Aparelho-alvo informado:20GB livres.

## Causa e correção

O instalador0.2.0 criava uma árvore completa por versão. Quando hardlink não era suportado,
copiava arquivos inalterados; não havia coleta das versões obsoletas. O patch privado anterior,
de6.278bytes, demorou268,079s nesse ambiente, com fallback para cópias.

O instalador0.2.1 usa um índice local achatado (`locations.json`) por manifesto. Arquivos
inalterados mantêm exatamente o mesmo caminho físico, sem hardlinks, cópias ou resolução por
cadeia de manifestos. Recebidos/arquivos reutilizados continuam verificados por SHA-256. Arquivos
SQLite novos são validados; apenas bytes imutáveis previamente ativos reutilizam validação SQL.

O ponteiro é ativado por AtomicFile após a conferência; sua gravação é relida antes da coleta.
A coleta mantém todos os caminhos físicos referenciados pelo manifesto ativo e remove apenas
arquivos derivados reconhecidos, sem atravessar symlinks nem alcançar `personal.sqlite3`.
Recupera staging interrompido sob lock. A abertura do novo APK também limpa cópias antigas,
sem reinstalar/copiar o acervo atual. Arquivos ativos ausentes interrompem a coleta.

Manifesto/ZIP exportados continuam v1. O novo layout local exige aplicativo0.2.1+; não fazer
downgrade para0.2.0. Versões obsoletas no aparelho não são backups. Os pacotes originais do PC
continuam disponíveis para restaurar outro conteúdo; dados pessoais têm backup próprio.

O instalador USB detecta o mesmo ID ativo e atualiza apenas o APK, sem reenviar o pacote.
A primeira instalação mantém o acervo completo; os57 PDFs não foram retirados para reduzir uso.

## Medições reais, emulador API37 isolado

Acervo:75 arquivos,57 PDFs,10 edições,3.724.666.303 bytes declarados descompactados.
O pacote de entrada tem1.786.907.212bytes. Isso difere do espaço final instalado.

| Medição                                     | Resultado                                       |
| ------------------------------------------- | ----------------------------------------------- |
| Antes da limpeza, `du -sk files/content`    | 10.912.160KiB (~11,17GB)                        |
| Após abrir o APK0.2.1                       | 3.637.920KiB (~3,73GB)                          |
| Liberação aproximada de alocação no AVD     | 7.274.240KiB (~7,45GB)                          |
| Patch seguinte, somente manifesto           | 6.050bytes                                      |
| Instalação do patch, medida dentro do teste | 17.601ms                                        |
| Arquivos físicos reutilizados               | 75 de75, mesmos caminhos                        |
| Bytes lógicos antes/depois do patch         | 3.724.683.501 →3.724.699.146                    |
| Crescimento lógico                          | 15.645bytes de metadados; sem duplicar o acervo |
| Reinstalação do mesmo patch                 | Idempotente, passou                             |
| Restart posterior, Activity `am start -W`   | COLD, TotalTime2.162ms                          |

O tempo de Activity não mede disponibilidade completa de todos os dados. O tempo de patch acima
não representa primeira instalação nem atualização de um banco grande. Um `content.sqlite3`
alterado (atualmente~1,02GB) ainda precisa ser recebido inteiro: o delta é por arquivo.
Reserva é de arquivos novos descompactados +64MiB, além do arquivo de entrada e atualização do
APK. O arquivo de entrada recebido por USB é removido após sucesso. Download manual em outra
pasta do telefone não é apagado pelo app. Primeira preparação pode continuar demorando minutos.

O banco pessoal teve o mesmo SHA-256 antes da atualização/limpeza e após o patch:
`de81036e117a9d2cf75fda03360e1c7575eaf2df2037ec731ee52cd32a1ad391`.
O teste também comparou o backup pessoal integral, não apenas a existência do arquivo.

## Validação

- JVM:31 testes passaram (26 instalador +5 políticas). Casos novos cobrem referência física,
  múltiplos patches sem acúmulo, ativação confirmada antes da remoção, upgrade de cópias antigas,
  falta de espaço, recuperação após falha, arquivo ativo faltante, paths locais inválidos,
  proteção de arquivos pessoais, pacote completo redundante e leitura em andamento antes da coleta.
- Instrumentation privado: patch real/idempotência/preservação (1) e regressão de consumo,
  migração/seed/backup pessoal (4) passaram. A regressão inclui consulta aos livros/versículos,
  comentários, FTS, léxico, estatísticas, vetores, notas e verificação dos arquivos do acervo.
- Restart reteve `c256f804acc13ca9e14588a224ff4b09ab6c36db9e01bb8fd0220cb2ac44069f`.
- Android:assembleDebug,assembleDebugAndroidTest,lintDebug passaram; zero erros de lint,
  mantendo avisos existentes fora do escopo.
- Node:483 testes/75 arquivos passaram;typecheck/lint passaram. O teste Windows do instalador
  usa um ADB simulado e verifica que não existe transferência quando o ID já está ativo.
- Acervo completo do PC e emulador Pixel_8 não foram alterados. QA usa somente Scriptorium_QA,
  porta5560, em `data/mobile-qa-avd`, sem wipe.

O gate semântico e os problemas de tradução do [QA anterior](mobile-consumption-2026-10-18.md)
continuam pendentes; não foram mascarados nem declarados corrigidos. Aparelho físico/API28 e
assinatura de distribuição continuam sem validação nesta entrega.

## Entrega

Kit atualizado na Área de Trabalho: `C:/Users/comical/Desktop/Scriptorium-Android-0.2.1/`.
O ZIP privado leva aplicativo0.2.1, acervo original inteiro e instalador atualizado. Não publicar.
O kit anterior não foi sobrescrito. A pasta de entrega fica emC para não duplicar vários GB
dentro do projeto no discoF. Hashes e instruções acompanham o artefato gerado.

APK final:181.264.775bytes, SHA-256
`8b9317e0f5b79d1d33aa615fcf0ed8b97e360fa3e6d06e73a8dd72fe2116cb31`.
ZIP antes da correção PowerShell5.1:1.968.361.159bytes, SHA-256
`0a48a337932945c42597522213d29bb1ff86c5fb8bbf982b513ef3db474a67b7`.
Conteúdo permanece com SHA-256 `47f5751b8a0123e664bad56fd11b9c178000afd6c7fe29f510f379e57195194f`.
A atualização do APK final preservou novamente o ID ativo e o banco pessoal.

A remoção de cópias de preparação no PC foi bloqueada pela revisão automática, sem motivo
específico informado. Foram preservadas, sem contornar a rejeição: o candidato anterior foi
movido para `C:/Users/comical/AppData/Local/Temp/scriptorium-android-0.2.1-candidato-20261019`.
O kit final ocupa a pasta de entrega indicada acima. A limpeza dentro do Android foi executada
normalmente no emulador e está coberta pelos testes; o bloqueio afetou somente os artefatos do PC.

## Correção do instalador no Windows PowerShell 5.1

O usuário encontrou `StandardInputEncoding` inexistente no `ProcessStartInfo` do .NET
Framework. O teste anterior de PS5.1 exercitava somente a atualização sem reenviar livros,
portanto não detectava a falha da primeira transferência. Não era problema de depuração USB.

Na validação física no Samsung, o envio por stdin também apresentou truncamento com
`exec-in` e encerramento prematuro do pipe com `shell -T`. Essa abordagem foi retirada,
em vez de exigir que o usuário instalasse outro PowerShell. O instalador agora:

- usa `adb push` para uma pasta Android temporária criada por `mktemp`, validada por regex
  e protegida com modo 0700;
- copia por pipe local Android para a entrada privada do aplicativo, sem binário atravessar
  stdin do Windows;
- remove somente o arquivo temporário gerado e sua pasta vazia em `finally`;
- exige SHA-256 remoto igual ao do kit antes de renomear `.part` para `.scriptorium`.

O teste regressivo executa Windows PowerShell5.1 com ADB falso compilado, incluindo cópia
com bytes idênticos e cópia adulterada que deve falhar sem `mv`/abertura do aplicativo.
Kit/exportador:8 testes passaram. Typecheck e ESLint dos arquivos alterados passaram.
Não houve alteração no APK, nos schemas ou na biblioteca editorial; builds nativos não
precisaram ser refeitos para esta correção de script.

No telefone real, `adb push` entregou1.786.907.212 bytes em47,137s; a cópia local por pipe
entregou o mesmo tamanho em12,013s e o SHA-256 remoto conferiu antes de abrir o aplicativo.
Isso confirma transporte/integridade; a ativação do acervo é uma etapa posterior distinta.

A etapa posterior também foi confirmada no Samsung: o instalador terminou com sucesso,
o ponteiro ativo correspondeu ao ID b289f600... e a UI informou “Acervo instalado. Suas
notas foram preservadas”, com Hoje em Salmos55. A entrada de transferência ficou vazia
após a ativação. Não houve desinstalação nem exclusão de dados pessoais.

O script extraído e o ZIP na Área de Trabalho foram atualizados. ZIP corrigido:
1.968.361.310bytes, SHA-256
`6b424766dfe26d9aab0e4b5129cce2be7f77e72fbe18ac3e8ef2193726125d9c`.
`instalar.ps1`: SHA-256
`48a4e65973415cc2ce0795a21a2edb162a770859718651a5162ccfc4b52e8637`.
Hashes do APK e do pacote de conteúdo permanecem iguais; nenhum PDF foi retirado.
