# Incorporação contextual — 24/10/2026

## Resultado no workspace canônico

O inventário real contém **57 documentos**, 47.707 páginas físicas e 47.441 com texto.
Foi utilizado `data/workspace/workspace.sqlite3`, sem banco paralelo, novo PDF ou novo
backup completo. O snapshot pré-OCR existente foi reutilizado explicitamente.

| Fonte | Novos itens | Destino e limite |
| --- | ---: | --- |
| Confissões / apêndice De Magistro | 435 | Leituras temáticas; o apêndice tem identificação própria |
| Enciclopédia de Teologia, v.1 | 710 | Estudos e temas; não comentário automático de versículos |
| Oxford Handbook of Biblical Studies | 793 | Exegese e hermenêutica, páginas físicas 26–868; bibliografias interrompem a herança do capítulo |
| Nag Hammadi II | 246 | Gnosticismo e fontes antigas, páginas 11–278; identificação de tratados, incluindo títulos com letras espaçadas |
| Agostinho — tratados sobre João e 1 João, edição CCEL | 144 | Trechos iniciais de exposições com passagem explícita, fonte e página; texto em inglês |

Total: **2.184 recortes temáticos e 144 trechos contextuais**. Não são 2.328 versículos
novos, nem leitura intelectual integral de todas essas obras. O processamento é documental
determinístico, com calibração e amostras; a revisão acadêmica integral permanece pendente.

Agostinho: 123 seções resolvidas, 11 exceções retidas. Há destinos em João 1–8 e 10–21
e 1 João 1–5: **25 capítulos com algum trecho**, sem prometer cobertura de todos os versos.
Os títulos inválidos, continuados ou divergentes do cabeçalho real não foram corrigidos
por adivinhação. O fim de uma exposição não foi despejado inteiro sob seu primeiro verso.

## Fila persistente

`scripts/content/contextual-library-queue.ts` coordena os extratores Python e os importadores
canônicos existentes. Seu JSON é controle operacional, não outro repositório de conhecimento.

```powershell
npm run library:contextualize -- plan data/workspace/workspace.sqlite3
npm run library:contextualize -- status data/workspace/workspace.sqlite3
```

Para executar os perfis calibrados em processo independente do chat:

```powershell
.\scripts\content\start-contextual-library.ps1 -Publish -ReuseBackup data/workspace/workspace.sqlite3.before-ocr-1792729467437
```

O caminho do snapshot acima é desta instalação; em outra instalação, indicar um snapshot
válido existente. Sem `-Publish`, só há staging. O publicador adquire o lock canônico;
runtime que já detenha esse lock impede a escrita concorrente. Não remover o lock de outro
processo. `-RetryFailed` retoma falhas. Lotes já publicados são preservados, e os importadores
verificam hashes, spans e idempotência antes da incorporação.

Primeiro lote concluído: **5 publicados, 33 com contexto anterior, 19 bloqueados**.
“Contexto anterior” não significa obra totalmente contextualizada. A fila não inventa perfis
para os 19 restantes e não continua trabalhando quando não há tarefas executáveis.

Bloqueios classificados:

- 6 volumes/exposições dos Salmos: crosswalk documental do Saltério antes de ligar números.
- 5 dicionários/léxicos: segmentação por verbete e identificação lexical específicas.
- 7 outras edições: calibração documental, incluindo Manuscritos do Mar Morto,
  apócrifos/pseudepígrafos, Padres Apostólicos, outro Nag Hammadi I, interlinear,
  trecho de Sistemática e o arquivo identificado como 556.
- Bíblia de Jerusalém: texto extraído, aparato de comentários ainda não identificado.

## OCR: tentativas não equivalem a recuperação

Os seis documentos da recuperação de 23/10 já possuem texto: Agostinho, Keener, Wegner,
von Rad, Ladd e Lossky. Não foram reprocessados integralmente neste lote.

Em A Cidade de Deus v.1, foram tentadas as **117 páginas ainda vazias**. Houve 87 resultados
vazios e 30 textos curtos/ruidosos. Os 30 chegaram a ser importados antes da conferência
de qualidade e foram corrigidos por quarentena de recibo, sem apagar PDFs ou resultados OCR.
Não havia âncoras semânticas nessas páginas. O livro voltou a **705/822 páginas com texto**;
nenhum comentário foi gerado desses ruídos. As 30 páginas exigem revisão visual.

O importador agora retém novos resultados curtos ou com poucos caracteres alfabéticos
para revisão. É um filtro conservador: não afirma que todo texto curto é inválido.
A quarentena explícita recusa páginas editadas, recibos divergentes e evidência ancorada;
seu UPDATE também verifica esses limites na transação.

Limite restante: o importador anterior invalidou a análise genérica do documento ao registrar
essas tentativas. A fila especializada não reconstitui automaticamente esse índice genérico;
o estado requer reconstrução controlada, preservando revisões. Os contextos documentais
anteriores e o texto original não foram removidos.

Jerusalém possui **1.219/1.221 páginas com texto**. A auditoria de fontes/tamanhos e as
amostras visuais, incluindo página 400 nesta execução, não identificaram o aparato esperado.
Não é falha geral de OCR e não autoriza apresentar texto bíblico como comentário.

## Validação

- Python: 140 testes passaram; mypy strict em 18 arquivos e Ruff aprovados.
- TypeScript: 572 testes passaram em 90 arquivos (`test:quick`); cinco arquivos pesados
  de corpus são excluídos por esse comando e não foram executados nesta rodada.
- Typecheck, ESLint dos arquivos TS alterados e build web aprovados.
- Reimportação somente leitura: 0 novos / 2.184 temáticos reutilizados e 0 novos /
  144 comentários reutilizados; portanto os lotes não exigem escrita adicional.
- 138 amostras de evidência temática reconstruídas com SHA-256 correspondente;
  `PRAGMA foreign_key_check`: zero violações.
- Repositório efetivamente usado pelo leitor devolveu a nova fonte em João 1:1,
  João 2:1 e 1 João 1:1, com publicação automática identificada como tal.
- Leituras temáticas consultadas pela API real dos estudos, incluindo as três novas
  fontes em hermenêutica e Nag Hammadi II em gnosticismo/fontes.
- Tabelas pessoais verificadas (`notes`, `studies`, `note_links`): hashes iguais ao início.
- Build conserva os avisos das ferramentas/Node SQLite; não foi feita QA visual de navegador.

Os dados foram publicados na instalação desktop. Git versiona o código e os relatórios,
não transporta este banco privado. Nenhum APK, kit móvel ou novo backup pesado foi gerado.
