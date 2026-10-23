# Recuperação OCR local e retomável

## Objetivo e limites

Recuperar documentos já instalados sem camada textual, mantendo os PDFs imutáveis e a
identidade física das páginas. OCR não é interpretação, tradução nem revisão acadêmica.
Não há LLM, envio de livros para nuvem, backend remoto ou segundo banco de conhecimento.

O worker usa o [Tesseract recomendado pela documentação do projeto](https://tesseract-ocr.github.io/tessdoc/Installation.html),
com binário Windows distribuído pela UB Mannheim. `setup-ocr-tools.ps1` verifica SHA-256 do
Tesseract e dos utilitários 7-Zip obtidos dos releases oficiais. Os instaladores são **extraídos**,
não executados: nenhum PATH, registro do Windows ou permissão de administrador é alterado.
Os modelos tessdata_fast ficam fixados no commit `87416418657359cb625c412a48b6e1d6d41c29bd`.

## Fluxo

1. Manifesto congela os documentos sem texto, por checksum, idioma e número de páginas.
2. Python abre o workspace somente para leitura e verifica o SHA-256 de cada PDF.
3. Poppler renderiza uma página por vez, em escala de cinza, maior dimensão de 3.500 pixels.
4. O OCR existente é reutilizado diretamente, sem exigir servidor HTTP ou modelos linguísticos.
5. Cada página gera resultado JSON atômico com texto, hash, página e caixas normalizadas.
6. Resultados válidos são reutilizados na retomada; originais/resultados divergentes são recusados.
7. O importador TypeScript adquire o mesmo lock exclusivo de Vite/Docker, cria backup consistente
   e preenche somente páginas vazias e sem âncoras semânticas anteriores.
8. Texto, layout e contagem são transacionais. Os triggers existentes atualizam o FTS.
9. `--structure` aciona classificação e desmontagem determinística canônicas. Não publica
   propostas como comentários revisados nem confirma versificação por simples menção.

A leitura OCR não bloqueia o uso normal do banco. A publicação exige exclusividade: se o app
estiver usando o workspace, o importador recusa o lock e preserva os resultados para depois.
Nenhum lock é roubado por idade. Um crash exige conferir o processo proprietário antes de recuperação.

## Execução Windows

Com Python/venv do serviço e Poppler disponíveis, a partir da raiz:

```powershell
.\scripts\content\setup-ocr-tools.ps1
# Amostra: páginas físicas 5,20,50; usa a última quando a obra tem menos de 50.
.\scripts\content\start-ocr-library.ps1 -Foreground -Sample
# Execução independente do chat, em janela oculta, seguida de importação e estruturação.
.\scripts\content\start-ocr-library.ps1
```

O PC precisa permanecer ligado. Desligamento/suspensão interrompe ou pausa o trabalho;
resultados já salvos ficam preservados. Os logs têm timestamp, em
`data/workspace/ocr-recovery-validated-20261023/`. Não execute outro worker no mesmo staging.

Para publicar resultados prontos ou retomar publicação bloqueada pelo app:

```powershell
# Feche os escritores legítimos deste workspace antes de publicar.
node --import tsx scripts/content/import-ocr-recovery.ts data/workspace/workspace.sqlite3 data/workspace/ocr-recovery-validated-20261023 --runtime-stopped --structure
# Somente leitura: confere publicadas e conta páginas prontas ainda não publicadas.
node --import tsx scripts/content/import-ocr-recovery.ts data/workspace/workspace.sqlite3 data/workspace/ocr-recovery-validated-20261023 --verify
Get-Content data/workspace/ocr-recovery-validated-20261023/progress.json
```

`pending` na verificação conta **resultados já disponíveis no staging**, não todas as páginas
restantes da biblioteca. O progresso do worker é por execução; a contagem final do acervo vem
do SQLite. Recarregue as telas após publicação: a CLI não envia eventos para outros navegadores.

O importador aceita schemas 25–28 e não aplica migrations. Os estados de OCR, perfil e estrutura
usam tabelas existentes. Páginas que retornam vazias são tentativas registradas, não texto extraído
inventado. A etapa pode legitimamente permanecer parcial por páginas em branco ou ilegíveis.

## Correções necessárias descobertas com PDFs reais

- Páginas duplas giradas exigiram segmentação com orientação (`--psm 1`, modelo OSD).
- O TSV do Tesseract contém aspas literais, não aspas escapadas segundo CSV. `csv.DictReader`
  padrão consumia registros seguintes como parte de uma palavra, inserindo dados técnicos no livro.
  Agora usa `quoting=csv.QUOTE_NONE`, com regressão que preserva a aspa e a palavra seguinte.
- A receita fica registrada como `;psm=1;tsv-literal-v1`; o importador rejeita receitas antigas.
- A serialização de caixas precisa usar JSON normalizado: tuplas Python tornam-se listas para
  que a retomada não rejeite falsamente o próprio resultado inalterado.
- O diretório de modelos deve conservar `configs/tsv`, não conter apenas arquivos traineddata.

O serviço Python descobre a instalação portátil em LOCALAPPDATA quando não há executável no PATH;
`SCRIPTORIUM_TESSERACT` continua tendo prioridade. Reinicie um serviço já aberto para carregar o código novo.

## Execução iniciada em 23/10/2026

| Obra                               | Páginas físicas previstas | Amostra já publicada |
| ---------------------------------- | ------------------------: | -------------------: |
| A Doutrina Cristã                  |                       142 |                    3 |
| Keener — contexto cultural NT      |                       834 |                    3 |
| Wegner — metodologia exegética NT  |                       129 |                    3 |
| von Rad — arquivo/trecho instalado |                        21 |                    3 |
| Ladd — teologia NT                 |                       207 |                    3 |
| Lossky — teologia mística          |                       207 |                    3 |
| **Total**                          |                 **1.540** |               **18** |

Em andamento, não declarar as 1.540 concluídas com base neste documento. Consulte progresso,
recibo e banco. Após a amostra, a verificação real retornou zero novas e 18 reutilizadas,
sem divergências. FKs após a publicação: zero violações. O backup pré-OCR foi preservado.
Não houve sobrescrita de páginas com texto, âncoras antigas ou revisões humanas.

Uma publicação incremental posterior elevou o snapshot para **104 páginas com texto**:
89 de Agostinho e três de cada uma das outras cinco obras. A desmontagem canônica produziu
218 unidades e propostas para revisão, **não comentários aprovados**. A busca FTS encontrou
`verdade` em 45 dessas páginas, e o FK check permaneceu sem violações. OCR, estruturação e
análise ficam parciais enquanto faltar texto; percorrer páginas vazias não significa concluir a obra.

Snapshot seguinte: **168 páginas com texto e359 unidades** já no banco. Agostinho completou
142/142 páginas e315 unidades; Keener chegou a13/834, e as outras quatro obras mantinham as
três páginas de amostra. As142 páginas físicas de Agostinho possuem texto OCR, mas a obra não
foi inteiramente interpretada/vinculada aos versículos. As outras cinco continuam na fila.

Validação do código:616 testes TS/93 arquivos e124 Python aprovados; typecheck, mypy estrito
em17 arquivos, Ruff, ESLint focado, Prettier e build aprovados. O teste novo de retomada encontrou
e preveniu a falsa divergência de tuplas/listas; nenhuma regra foi desativada. Os scripts PowerShell
passaram pelo parser e foram executados realmente; não foi instalada uma suíte Pester.

Stagings `ocr-recovery-20261023` e `ocr-recovery-oriented-20261023` são tentativas anteriores
à correção do TSV; não foram publicadas e não devem ser reaplicadas. O importador rejeita
suas revisões. O staging válido é o **validated**. PDFs, imagens, staging, logs e backups são privados.

## Jerusalém e demais impedimentos

O PDF Jerusalém da pasta original tem o mesmo SHA-256 da edição instalada. Nova inspeção visual
da página física 600 confirmou texto de Salmos sem aparato naquela página, coerente com as
amostras anteriores; não é certificação de todas as 1.221 páginas. Não há outra cópia identificada
com notas para extrair. OCR não cria o aparato que não foi encontrado no exemplar.

As 45 páginas com NUL das Institutas não são páginas vazias: continuam em quarentena.
Este backfill não as sobrescreve, pois isso poderia invalidar evidências existentes.
OCR também não resolve por si só o crosswalk dos Salmos ou as exceções de Beale/Crisóstomo.
