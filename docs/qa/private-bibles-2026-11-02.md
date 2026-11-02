# Incorporação de Bíblias e Anchor — 1–2 de novembro de 2026

Este é o retrato da primeira entrega. A TEB foi ampliada posteriormente e o acervo
foi entregue para Android: [relatório atualizado](teb-mobile-2026-11-02.md).

## Resultado no workspace canônico

65 documentos; 70.434 páginas/itens armazenados, 70.111 com texto. O total inclui
9.909 itens XHTML do derivado Anchor: não são 9.909 páginas impressas.
Foram acrescentados sete PDFs e um derivado de EPUB aos 57 documentos anteriores.
Nenhum novo snapshot pesado foi criado; reutilizado o snapshot anterior ao OCR.

| Edição privada                     | Textos de versículos | Capítulos aceitos |
| ---------------------------------- | -------------------: | ----------------: |
| ARA                                |               29.372 |             1.127 |
| NAA                                |               29.206 |             1.129 |
| BKJ português                      |               29.134 |             1.121 |
| Almeida Revisada Imprensa Bíblica  |               28.704 |             1.118 |
| Nova Bíblia Viva da compilação PDF |               13.527 |               503 |
| NVI, PDFs AT e NT                  |               28.773 |             1.117 |
| ACF                                |               26.494 |             1.047 |
| LTT                                |               13.951 |               585 |
| **Total entre edições**            |          **199.161** |         **7.747** |

São ocorrências em diferentes traduções, não 199 mil versículos distintos.
Cobertura parcial: sequências ambíguas/incompletas foram retidas. A NBV pública
licenciada já existia; a nova edição PDF tem identidade/proveniência próprias.

| Fonte     | Conteúdo disponibilizado                                                |
| --------- | ----------------------------------------------------------------------- |
| TEB       | 9 notas calibradas em Gênesis 1, incluindo alcance de perícope em 2:1–4 |
| LTT       | 1.511 notas; 273 exceções                                               |
| Ave-Maria | 2.870 notas; 1.045 exceções; 175 recortes temáticos/introdutórios       |
| Anchor    | 3.050 recortes de verbetes; 9.413 menções bíblicas explícitas           |

Todas as associações deste lote são automáticas, com fonte/página/evidência e revisão
pendente. Não foram individualmente auditadas por um humano. Os apêndices Ave-Maria
têm agrupamento temático amplo: alguns itens de índices/calendário/medidas compartilham
rótulo litúrgico; não há classificação fina de cada seção desse aparato ainda.

## Proveniência das novas fontes

| Fonte                   | SHA-256                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| TEB                     | `304675c0a56353c8c566f8d356b235de23882455f5680a4ea1c00202c7b35235` |
| Compilação multiversões | `fcd9cc31bfde4b560ed23b0ff781a0ac23aa765bef3e3760c95aef970c637d4f` |
| LTT                     | `aa9f58a60004b40217c036edce246c8b6ff4c174eba9104af04d66e61a1c6f58` |
| Ave-Maria               | `37cf074ee7a26a73a302fd3e274f057acb5da7ba45e4a1f065d1393e91297cc1` |
| ACF                     | `761b4abdb4c7fd544b290315f33b5f4851d05ebb87846cd658f3e9822a523f07` |
| NVI AT                  | `57fb5954825baaea789c2e31417d050114fe73c9c88832166f29823a81ebe990` |
| NVI NT                  | `5542cfaf98265dfa536806152c7fdbf0d59012fc6f1259ab24984e3cb71d519b` |
| Anchor EPUB original    | `ea4f4516b18ca1c90a7e26203cdd38820ca59ac03bc740efe567b10b5c61a4a0` |
| Anchor derivado         | `9239ab27daa75cca9292718edfd12e4a02bb95c91d46ef6fda7651d6d99d88d2` |

## Validação executada

- `npm test -- --maxWorkers=2`: **697 testes / 110 arquivos passaram**.
- `npm run typecheck`: aprovado.
- ESLint dos arquivos TypeScript alterados/criados: aprovado.
- `npm run build`: aprovado, incluindo SSR/Nitro `node-server` já configurado.
- Python `pytest`: **145 passaram**; `mypy --strict app`: 22 arquivos sem erros;
  Ruff de app/tests e conversor: aprovado.
- Oito testes novos TS: importação/idempotência, offsets, preservação de texto,
  endereço divergente, SSR sem inicialização, privacidade do backup estrutural e
  reconhecimento de evidência especializada sem declarar analisador genérico concluído.
- Cinco testes Python: colunas, UTF-16, capítulo incompleto, aliases/cabeçalhos e
  XHTML malformado sem execução de código.
- Verificação read-only do staging: 172.667 + 26.494 textos reutilizados, zero novos;
  notas TEB/LTT/Ave e menções Anchor também reutilizadas sem duplicação.
- `verify-thematic-readings.ts`: 150 amostras distribuídas pelos documentos, zero violações.
  `PRAGMA foreign_key_check`: zero violações.

Falhas encontradas e corrigidas antes da conclusão: export JSON mudava a ordem
de chaves esperada pelo checksum; metadados novos foram movidos ao fim do contrato.
Uma tentativa de build simultâneo ao pretest colidiu na reconstrução dos pacotes
públicos: ambos passaram quando executados sequencialmente.

## QA no navegador

Playwright Chromium local, porque o plugin Browser não estava disponível. Acesso
ao workspace real da instalação, sem reset ou criação de acervo alternativo.

- NAA privada abriu Gênesis 1 com texto e fontes de comentários reais.
- Seletor aceitou NVI, ACF e LTT; texto visível mudou para a edição escolhida.
- Fontes TEB, Ave-Maria e LTT apareceram nos versículos do lote.
- Biblioteca encontrou o Anchor, abriu o derivado e carregou o texto do item.
  O item inicial é navegação sem texto recuperável; isso é informado no próprio derivado.
- Corrigida a indicação de livro não desmontado: unidades de importadores especializados
  contam como conteúdo parcial, sem falsear o estado do analisador genérico. As ligações
  existentes não ficam mais escondidas por ausência de resumo desse analisador.
- Anchor item 120: acesso por unidade carregou o verbete Aaron, dois realces e
  ligações bíblicas; indicador parcial correto, sem erro de página JavaScript.
  A menção lexical recebe rótulo de referência, em vez de comentário direto.
- Um aviso React de atualização antes de montagem foi observado no primeiro
  carregamento; sua causa não foi isolada nesta entrega. Não foi tratado como erro
  de importação nem ocultado. Não há alegação de QA sem avisos.

## Limites e continuidade

- TEB precisa ampliar a calibração para outras páginas/livros e marcadores.
- Traduções ainda têm lacunas e artefatos de espaçamento/capitalização da extração;
  nenhuma normalização silenciosa foi aplicada sobre o texto-fonte.
- A associação estrutural de capítulos não certifica crosswalk semântico.
- Ave/Anchor retêm referências ambíguas de Salmos, Joel, Malaquias, Daniel e Ester;
  deuterocanônicos sem limites cadastrados também exigem trabalho específico.
- TEB 2:4a é representado como 2:4, pois o destino atual não discrimina subverso.
- Anchor permanece em inglês; tradução usa o mecanismo existente, sem tradução
  integral nova. Verbetes locais não são uma reconstrução de todas as entradas.
- Não houve atualização mobile, APK, imagem Docker ou reinício de container.
- O Git leva código/documentação. O acervo continua no diretório canônico da
  instalação; não se torna público por estar conectado ao Reader.
- A revisão automática bloqueou a exclusão de intermediários gerados; cerca de
  440 MiB de staging antigo foram mantidos. Nenhum original ou backup foi apagado.

Arquitetura e operação: [edições privadas](../architecture/private-bible-editions.md).
