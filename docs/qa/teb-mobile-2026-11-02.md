# TEB integral e entrega mobile — 02/11/2026

## O que foi executado

A edição TEB SHA-256 `304675c0a56353c8c566f8d356b235de23882455f5680a4ea1c00202c7b35235`
foi varrida nas **2.492 páginas**, substituindo a operação restrita à página 50.
O lote anterior de nove notas foi preservado.

- **19.100 recortes de aparato** estruturados como leituras documentais, com página,
  texto literal, checksum e offsets UTF-16. Não são uma contagem de notas únicas
  reconstruídas entre páginas: o perfil atual delimita recortes locais.
- **11.095 relações TEB visíveis** no workspace após calibração: 11.036 contextos
  de capítulo, 58 associações de versículo e uma perícope, incluindo o lote anterior.
- **828 pares livro/capítulo** possuem relações TEB. Isso não significa cobertura
  de todos os versículos desses capítulos.
- O relatório final identifica **8.001 recortes sem destino contextual suficientemente
  determinado**. Eles estão como leituras documentais; não foram forçados a versículos.
- 25 propostas automáticas foram substituídas pelo contrato canônico `supersedes`;
  outras 37 que não foram confirmadas na recalibração tiveram publicação retirada.
  Texto, evidências e histórico permanecem no Rastro. Revisões humanas não foram alteradas.

## Como o perfil funciona

`app.teb_source` usa geometria e fontes do PDF.js para separar margens/remissões,
corpo bíblico e notas em cada coluna. Cabeçalhos e sumário desta edição delimitam os
livros; o deslocamento entre página impressa e física muda dentro do PDF e não é
tratado como constante. Cabeçalhos de introdução bloqueiam a associação automática.

A identificação de capítulo compara tetragramas do **corpo bíblico**, dentro do livro,
com a Bíblia Livre. Exige tamanho mínimo, escore e margem para a segunda alternativa.
Referências dentro da nota não escolhem o destino principal. Alguns marcadores
anexados ao corpo permitem propor versículo com correspondência local única;
a amostragem corrigiu, por exemplo, uma nota sobre “grande” de Lucas 1:31 para 1:32.
Gênesis 47 foi mantido com alcance mais amplo em vez de reduzir uma explicação
de parágrafo a um versículo.

Essas associações continuam **inferidas e pendentes de auditoria**, sem selo de revisão
humana. Correspondência textual não é crosswalk certificado. A página pode atravessar
capítulos, o OCR pode perder marcadores e a nota pode continuar na página seguinte.
O perfil não comprova que todas as notas da edição foram recuperadas integralmente.

Staging privado final usado nesta execução:

- `data/workspace/teb-entire-20261102-calibrated/coverage.json`: cobertura por página;
- `.../thematic/`: 19.100 recortes publicados;
- `data/workspace/teb-entire-20261102-final/contextual/`: primeira publicação integral;
- `data/workspace/teb-entire-20261102-delta-v2/`: 61 inclusões/substituições posteriores;
- `.../teb-entire-20261102-calibrated/reconciliation.json`: 37 retiradas automáticas.

O operador `reconcile-teb-publication.ts` exige a edição correta, varredura de 2.492
páginas, hashes dos lotes, lock, snapshot existente e propostas ainda automáticas.
Um snapshot anterior ao OCR foi reutilizado; não se criou novo backup completo.
Diretórios intermediários desta calibração permanecem privados e não entram no Git.

## Entrega mobile real

Pasta: `C:/Users/comical/Desktop/Scriptorium-Acervo-2026-11-02`.

| Artefato                        | Resultado                                                             |
| ------------------------------- | --------------------------------------------------------------------- |
| APK                             | Android 0.6.12/code24, 198.430.696 bytes; mesmo software, acervo novo |
| `acervo.scriptorium`            | 2.389.199.361 bytes; pacote integral, não patch dependente de base    |
| Documentos/PDFs                 | 65                                                                    |
| Páginas/itens                   | 70.434; inclui os itens XHTML do derivado Anchor                      |
| Edições                         | 24, incluindo oito traduções privadas parciais                        |
| Registros contextuais elegíveis | 75.967; não são todos comentários diretos                             |
| Arquivos internos               | 97, todos conferidos por tamanho e SHA-256                            |

ID do pacote: `7328f5e76b5d3466689b93d651b3c9a0e0c55277365787809526703e02585c64`.

SHA-256 do pacote: `f98365f0ac4ed3fe47106f71fedda67b01d33b0dd0d9c77b672b7cf4038f944d`.

SHA-256 do APK: `8c7ad2d21df0caeabbdfe39de4011e4f0931631fcf7202fffce29bd41a578d1c`.

O exportador agora projeta `private_scripture_units` no contrato SQLite que o
Android já consulta: `corpus_editions`, `works`, `text_units`, `text_addresses` e FTS5.
Mantém IDs, fonte, evidência, mapping e posição editorial. Consulta ao leitor e FTS
foi executada nas oito projeções reais. Nenhum arquivo do workspace é modificado
por essa projeção.

O modelo e índice semântico existentes foram preservados a partir da entrega
anterior, com hashes verificados. **Não foram recalculados embeddings dos novos
textos**; sua busca textual está disponível. O pacote não inclui notas pessoais do
desktop e não substitui notas/progresso já existentes no telefone.

Não foi gerado outro ZIP pesado. A pasta de exportação também recebeu APK,
`instalar.ps1`, `delivery.json`, instruções e recibo de verificação. Instalação manual:
APK sobre o existente, depois Menu → Pacotes → selecionar `acervo.scriptorium`.
Nenhum aparelho apareceu em `adb devices -l`; instalação física não foi realizada.

## Validação

- `npm test -- --maxWorkers=2`: **698 testes / 111 arquivos passaram**.
- Python `pytest`: **150 passaram**, um aviso de depreciação Starlette/httpx.
- Typecheck e ESLint dos arquivos TS alterados/criados: aprovados.
- `mypy --strict app`: 23 módulos sem erros; Ruff app/tests aprovado.
- Build web/SSR aprovado. Nenhuma alteração de target de produção.
- Android `assembleDebug`, `testDebugUnitTest`, `lintDebug`: aprovados;
  **80 testes JVM**, zero erros lint e 49 avisos existentes.
- Pacote: 97 hashes/tamanhos conferidos, banco projetado sem violações de FK.
  Após a verificação, as nove projeções SQLite temporárias foram removidas da pasta
  de entrega; seus dados permanecem dentro do pacote. Não se duplicou o acervo em ZIP.
- Banco canônico: `PRAGMA foreign_key_check` sem violações.
- QA Chromium real: Êxodo 3 com NVI privada e TEB; panorama mostrou 26 notas do
  capítulo, sem erro JavaScript de página. Sem testes instrumentados em celular.

Testes novos cobrem a separação entre colunas, capítulos ambíguos, preservação de
revisões humanas, correção com hash do payload, reuso de identidade quando só muda
o escore e a projeção de edições privadas no contrato Android/FTS.

## Reprodução

Com o escritor legítimo parado, staging novo e Python do serviço:

```powershell
cd services/semantic-engine
.venv/Scripts/python.exe -m app.teb_source ../../data/workspace/workspace.sqlite3 ../../public/corpus-packages/biblia-livre-n4-2025.1.0.sqlite3 ../../data/workspace/teb-novo-lote
cd ../..
npm run content:import:contextual -- data/workspace/workspace.sqlite3 data/workspace/teb-novo-lote/contextual --runtime-stopped --reuse-backup <snapshot-existente>
npm run content:import:thematic -- data/workspace/workspace.sqlite3 data/workspace/teb-novo-lote/thematic --runtime-stopped --reuse-backup <snapshot-existente>
npx tsx scripts/content/reconcile-teb-publication.ts data/workspace/workspace.sqlite3 data/workspace/teb-novo-lote --runtime-stopped --reuse-backup <snapshot-existente>
npm run mobile:export -- --output <pasta-nova> --workspace data/workspace/workspace.sqlite3 --complete --without-personal --semantic <artefatos-semanticos-existentes>
```
