# Android0.5.3 — atualização do acervo

## Entrega conferida

- APK0.5.3/code11, Android9+, assinatura debug v2 verificada com `apksigner`.
- Kit completo (não delta):2.001.373.184bytes; APK184.155.335bytes;
  pacote1.817.025.169bytes.57PDFs originais e11edições,76arquivos de conteúdo.
-47.707páginas físicas/46.265com texto.46.083comentários elegíveis: mesmo total
  da consulta canônica no desktop no momento da exportação.
-29.216recortes temáticos e5.160verbetes, iguais aos34.376registros documentais
  elegíveis do desktop. Não são34mil novos comentários bíblicos revisados.
- FKs0/quick_checkok. Todos os arquivos do pacote conferidos por SHA-256/tamanho;
  ZIP externo conferido por CRC. Manifesto interno/externo iguais; sem baseId.
- Seed pessoal vazio (`--without-personal`), para não repassar notas/grupos/progresso.
  Não foram incluídos `.env`, banco pessoal ou chave privada de assinatura.

## Verificação executada

- `vitest run scripts/mobile/*.test.ts` (quatro arquivos explicitados):13testes passaram.
- `npm run typecheck`, ESLint dos quatro arquivos TS alterados e Prettier:aprovados.
- Gradle assembleDebug/testDebugUnitTest/lintDebug:58testes JVM,0falhas;
  lint0erros/23avisos. assembleDebugAndroidTest também aprovado.
- Instalador PowerShell:parser0erros. O fluxo real transferiu1.817.025.169bytes
  ao aparelho autorizado, com SHA validado, e instalou APK por `adb install -r`.
- Backup privado do banco pessoal anterior criado fora do kit antes da instalação.

## Pendente na primeira conferência

O aparelho estava bloqueado após a transferência. Não declarar o novo acervo ativo
até seu ID coincidir com o manifesto. `DocumentaryContentTest`, opt-in
`documentaryQa=true`, verifica consultas reais de estudos e léxico após a ativação;
não foi executado enquanto a geração anterior permanecia ativa. QA visual também
depende de desbloqueio. Nenhum teste privado foi substituído por resultado simulado.

OCR ainda parcial e busca semântica/tradução mantêm as limitações documentadas.
Não houve mudança de schema no workspace do PC, wipe do aparelho ou publicação dos PDFs.
