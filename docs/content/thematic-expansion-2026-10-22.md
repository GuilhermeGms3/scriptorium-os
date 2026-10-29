# Expansão temática do acervo — 22/10/2026

## Publicação real

Workspace canônico: `data/workspace/workspace.sqlite3`, preservado no schema 26.
São os mesmos 57 documentos; nenhum PDF novo foi baixado. O acervo possui 47.707 páginas,
45.905 com texto extraído.

| Fonte                         | Recortes temáticos novos |
| ----------------------------- | -----------------------: |
| Suma Teológica                |                   21.514 |
| Institutas, edição inglesa    |                    1.188 |
| Institutas, volume português  |                      322 |
| Catecismo                     |                    3.049 |
| Westminster                   |                       47 |
| Augsburgo                     |                       55 |
| Kallistos Ware                |                        7 |
| Reimer — exegese/hermenêutica |                      231 |
| Agostinho — A Trindade        |                      604 |
| Agostinho — A Cidade de Deus  |                      817 |
| Josefo                        |                    1.246 |
| Nag Hammadi I, AA.VV.         |                       87 |
| Nag Hammadi III, AA.VV.       |                       49 |
| **Total**                     |               **29.216** |

São recortes de página/papel delimitados por cabeçalhos, não 29.216 versículos comentados
nem interpretações aprovadas. Estudos → tema → Leituras consulta relações persistidas.
A Suma preserva questão/artigo/papel quando reconhecidos, mas não reconstrói todos os
argumentos multipágina. Partes sequenciais não são identificação crítica das partes.

Também publicados **5.160 verbetes gregos em português** de Gingrich/Danker, em 65 lotes.
O inspetor consulta lema normalizado, com fonte/página. `λόγος` conferido na página física 126.
O índice local à página não representa cobertura integral de entradas com continuação.

## Contexto bíblico adicional

Cinco análises de Reimer selecionadas do texto real, com evidência literal:

| Página física | Passagem                | Assunto                                    |
| ------------- | ----------------------- | ------------------------------------------ |
| 45            | Atos 16:13              | proseuché e local de reunião               |
| 46            | Atos 16:13–15           | Mulheres e reunião religiosa em Filipos    |
| 47            | Atos 16:14              | Lídia e a expressão temente a Deus         |
| 60            | Êxodo 20:4–6; Dt 5:8–10 | Imagens e aniconismo                       |
| 61            | Êxodo 20:8–11; Dt 5:12  | Lembrar/guardar e justificativa criacional |

Hipóteses pertencem aos autores. Comparações não são afirmações universais do sistema.
Não houve fabricação de comentários para completar a Bíblia de Jerusalém.

## Preservação e retomada

- 372 lotes temáticos e 65 lexicais publicados com lock exclusivo e backups consistentes.
- Recibos privados: `thematic-expansion-20261022-v3/receipts.ndjson`,
  `greek-lexical-index-20261022/receipts.ndjson` e staging contextual
  `methodological-exegesis-20261022-v2`, dentro de `data/workspace/`.
- Stagings anteriores não são a publicação final; continham limites em correção. Não reaplicar.
- Reimportação real: **0 novas / 29.216 reutilizadas**, **0 / 5.160** e **0 / 5**.
- Auditoria estrutural: **84 amostras** reconstruídas com checksum correspondente, 14 fontes,
  **0 violações de FK**. Não equivale a 84 aprovações teológicas.
- Antes/depois da publicação temática, hashes completos dos documentos e das unidades,
  propostas, notas e estudos preexistentes permaneceram iguais. Os cinco contextos são
  acréscimos posteriores identificados por método próprio.

## Medidas locais

Segunda consulta nativa avulsa, sem p95: teologia 780 ms; pneumatologia 337 ms; escatologia 351 ms;
hermenêutica 339 ms. Até 81 leituras para detectar limite visual de 80, intercalando fontes.
Não extrapolar para navegador/OPFS.

## Pedido completo: pendências reais

| Frente                                         | Estado e limite                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| Suma/Institutas/Catecismo/confissões           | Publicação temática feita; reconstrução integral de argumentos e revisão contextual não |
| Ware                                           | Sete recortes iniciais, não livro inteiro contextualizado                               |
| Exegese/hermenêutica                           | 231 seções e cinco análises novas; não cobre todas as passagens                         |
| Léxico grego                                   | 5.160 verbetes; continuações inseguras omitidas                                         |
| Hebraico/aramaico, DITAT, NDITAT               | Pilotos preservados; estruturação integral por verbete pendente                         |
| Agostinho sobre Salmos                         | Depende de crosswalk documental do Saltério, sem alinhar números cegamente              |
| Beale/Crisóstomo                               | Expansão especializada e recuperação de exceções pendentes                              |
| Price/mapas                                    | Pilotos preservados; nenhuma nova arqueologia nesta etapa                               |
| Nag Hammadi                                    | Dois volumes com recortes; não é catálogo integral códice/tratado                       |
| Mar Morto e dois outros volumes de Nag Hammadi | Nenhum cabeçalho validado pelo perfil; não forçados                                     |
| OCR                                            | Seis documentos sem texto; Tesseract não localizado nem configurado nesta máquina       |

Bloqueados: A Doutrina Cristã, Keener, Wegner, von Rad, Ladd e Lossky. Von Rad tem 21 páginas,
possivelmente um trecho. Nenhum OCR foi declarado executado. Quarentena adicional: 45 páginas
das Institutas inglesas com NUL, sem alterar os originais.

Beale possui 410 marcadores não resolvidos no relatório anterior, incluindo cabeçalhos,
autores e referências corrompidas: **não são 410 comentários perdidos**. Exigem conferência
documental, não apenas remoção de caracteres.

## Validações e entrega

Validação fechada na madrugada de 23/10, após integrar por fast-forward os seis commits
remotos até `4073f2b`, sem conflitos ou reescrita de histórico:

- TypeScript: **611 testes aprovados em 92 arquivos**, zero falhas; execução completa
  `node node_modules/vitest/vitest.mjs run --testTimeout=60000 --maxWorkers=2`.
- Python: **120 testes aprovados**, um aviso preexistente de depreciação Starlette/httpx.
- `mypy --strict app`: 16 arquivos aprovados; `ruff check app tests scripts`: aprovado.
- `tsc --noEmit`, ESLint dos arquivos TS/TSX alterados, Prettier desses arquivos e destes
  documentos e `git diff --check`: aprovados.
- `npm run build`: aprovado, com reconstrução dos corpora e preset local node-server.
  Nenhum arquivo de configuração de deploy foi alterado nesta entrega. Permanecem avisos
  não bloqueantes de plugins experimentais/desempenho do builder.

QA em `http://127.0.0.1:5174`, build de produção, Playwright porque o Browser plugin não
está disponível. Workspace **esparso separado**, com páginas reais da Suma e de Reimer,
não cópia integral nem substituto do acervo canônico. Nenhuma migration na base original.

| Checagem | Resultado |
| --- | --- |
| Identidade, conteúdo e ausência de overlay | Aprovado; Teologia/Estudos e Rastro corretos |
| Tema → nova resposta da Suma → janela de fonte | Aprovado; página física 117 e trecho literal |
| Nota com fonte → novo grupo → salvar | Aprovado no workspace de QA |
| Rastro → colunas temáticas/lexicais | Aprovado, números vindos do subconjunto real |
| Atos 16 → análises de Reimer | Aprovado; textos de At16:13 e de Lídia presentes no leitor |
| Desktop 1440×1000 / largura móvel 390×844 | Aprovado no fluxo temático; documento móvel com 390 px, sem overflow horizontal |
| Console / exceções de página | Zero erros nos fluxos testados |

O primeiro teste Vite expirou durante a reconstrução de corpora; o teste final usou o build
concluído. O roteiro foi ajustado aos controles reais e à seleção de uma **nova** leitura,
não de um localizador antigo já existente. Nenhum teste de produto foi desativado.

As capturas ficam fora do Git, em `%TEMP%/scriptorium-thematic-qa-20261022`.
PDF completo não foi renderizado no QA esparso; a janela consultou texto extraído real.
Tradução, novo OCR, dispositivo físico, APK e Docker não foram validados/atualizados nesta
etapa. O daemon Docker estava indisponível, portanto não houve reconstrução de imagem.

Contrato/comandos: [incorporação documental](../architecture/thematic-source-incorporation.md).
