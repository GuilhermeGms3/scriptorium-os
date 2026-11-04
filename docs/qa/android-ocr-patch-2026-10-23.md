# Android — patch OCR/contexto de 23/10/2026

## Escopo

Levar ao aplicativo existente o resultado de
[recuperação e integração desktop](../content/ocr-contextual-recovery-2026-10-23.md),
sem reconstruir APK, copiar novamente os PDFs ou gerar outro backup completo.
O APK 0.5.3 consome as mesmas tabelas aditivas; não houve mudança de schema ou código.

## Artefato privado

- Pasta local: `Desktop/Scriptorium-Atualizacao-OCR-20261023`.
- Base: `f2efca3ec91e88c6e634a61ddc2d72ee270a5a3e4c2fb514257cad341b3b7299`.
- Novo ID: `4c8bad603f43da83e4e232109ba78b6fe4212400e9da47d2a7d92b0ffb8aa2f4`.
- Pacote: 272.325.844 bytes, SHA-256
  `68f97b1084265c49c1d753f6b1afc74227d6dfc72e82f27c57fcf1f433315344`.
- Apenas `content.sqlite3` mudou. Outros 75 arquivos reutilizados: 57 PDFs,
  corpora e artefatos semânticos preservados. Não é um kit para instalação inicial.
- Exportação com `--complete --without-personal --semantic <artefatos existentes>
--base <manifesto 0.5.3>`, lendo o workspace canônico sem migração/escrita.
- Instalável em Mais → Pacotes, exigindo a base exata; não desinstalar o aplicativo.

## Validações executadas no PC

- 13 testes passaram nos quatro arquivos `scripts/mobile/*.test.ts`.
- Manifestos interno/externo iguais; caminhos do ZIP correspondem exatamente aos
  arquivos alterados; tamanhos, SHA-256 e leitura integral/CRC das entradas conferidos.
- SQLite `quick_check=ok`, `foreign_key_check` sem erros; seed pessoal `{}`.
- 57 documentos, 47.707 páginas, 47.441 com texto, 11 edições.
- 50.934 comentários elegíveis; Keener contribui com 4.851, destinos em 27 livros do NT.
- 35.065 recortes/verbetes: 29.905 temáticos e 5.160 verbetes gregos.
  Os cinco livros recuperados contribuem com 689 recortes (232/166/12/101/178).
- Consulta SQL equivalente ao consumidor Android encontra Keener em Mateus 1:1.
  Isto verifica seleção dos dados, não execução de Kotlin nem renderização no aparelho.

## Verificação no aparelho

### Segunda etapa — USB conectado

O aparelho autorizado foi reconhecido com APK0.5.3/code11, base exata e15GB livres.
Patch transferido por USB:272.325.844bytes; SHA-256 no telefone igual ao pacote.
Entrada entregue ao aplicativo sem reinstalar o APK principal nem copiar PDFs.
Fingerprints (contagem e hash, sem texto das notas) de nove tabelas pessoais foram
capturados em memória para comparação posterior; não foi criado backup do banco.

Adicionado teste instrumentado opt-in `recoveredOcrPatchFeedsNativeReaderAndStudies`
na classe `DocumentaryContentTest`: requer `documentaryQa=true` e `ocrQa=true`.
Confere totais,27livros do Keener,830páginas com texto e consulta do repositório nativo.
`assembleDebugAndroidTest`, `testDebugUnitTest` e `lintDebug` aprovados:
58testes JVM/0falhas, lint0erros/23avisos existentes. APK de testes instalado por cima.
Após o desbloqueio autorizado, a conferência terminou e o ID4c8bad60…aa2f4 ficou ativo.
`am instrument -w -e documentaryQa true -e ocrQa true -e class
org.scriptorium.app.DocumentaryContentTest
org.scriptorium.app.test/androidx.test.runner.AndroidJUnitRunner`:
**3 testes passaram em16,644s** no aparelho físico. Totais do novo snapshot e consultas
nativas do leitor/estudos/léxico aprovados. Keener:4.851relações/27livros/830páginas com texto.

Comparação antes/depois: nove tabelas pessoais idênticas por contagem/hash dos registros
ordenados (grupos,notas,pastas,associações,links,progresso,marcações,fontes salvas,traduções).
FKs pessoais0. O marcador interno da importação não faz parte dessa comparação.
Não foram salvos textos pessoais nem cópia adicional do banco para realizar a comparação.

Reinício do aplicativo preservou o ID novo; entrada de transferência removida automaticamente.
Tela inicial renderizada após reinício, retomada disponível. Não é QA visual integral de todas
as telas. Recibo privado em `Desktop/Scriptorium-Atualizacao-OCR-20261023/device-qa.json`.

Não foi criado backup novo no PC/celular. O APK principal não foi recompilado/reinstalado;
a segunda etapa recompilou apenas os testes instrumentados. As associações automáticas
continuam propostas, não revisão humana integral. Jerusalém permanece sem aparato de
comentários identificado; o patch não inventa notas ausentes.
