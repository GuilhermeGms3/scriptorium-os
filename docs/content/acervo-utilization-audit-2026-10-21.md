# Acervo: auditoria e aproveitamento contextual — 21/10/2026

## Entrega e limites

Implementação desktop no acervo canônico, sem outro banco de produção ou LLM. Alterações Android
do colega foram preservadas na integração, sem nova implementação Android neste escopo.
Os 57 PDFs permanecem privados em `data/workspace/documents`. Código e localizadores editoriais
não redistribuem os textos dos livros. Esta entrega não equivale à leitura integral dos livros.

| Frente         | Implementado                                                                                                                         | Limite explícito                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Comentários    | Amostra exploratória de 24 ligações, seis livros em ordem canônica por fonte; conferência estrutural e leitura contextual seletiva   | Não estima precisão/recall nem aprova todas as notas                                           |
| Leitor         | Notas de capítulo/livro permanecem no panorama também em modo completo e no painel                                                   | Não são replicadas sob cada versículo                                                          |
| Jerusalém      | Revalidação da edição instalada, texto e imagem                                                                                      | Não identificado aparato de comentários; não publicar narrativa bíblica como nota              |
| Léxicos        | Consulta FTS limitada, delimitação grega por cabeçalhos, três localizadores hebraicos por hash, fonte/página/seleção                 | Não é indexação integral revisada dos quatro dicionários                                       |
| Estudos        | Separação de questão/artigo/objeções/em contrário/solução/respostas; estrutura das Institutas e confissões; 22 leituras selecionadas | Estrutura local à página, não reconstrução completa dos argumentos através de todas as páginas |
| Arqueologia    | Piloto de Randall Price com página da inscrição, lugar, período e limites da evidência                                               | Não certifica as inferências apologéticas do autor nem cataloga todas as imagens               |
| Aproveitamento | Relatório real no Rastro, por documento e recorte bíblico                                                                            | Contagens de ligações não significam versículos únicos ou comentários revisados                |

## Auditoria dos comentários

Fontes: Genebra, Shedd, Novo Comentário Bíblico AT e Wesley. O comando usa SQLite somente leitura:

```powershell
npx tsx scripts/content/audit-commentary-sample.ts data/workspace/workspace.sqlite3 data/workspace/auditoria-nova
```

A saída privada contém IDs, endereços, páginas, offsets conferidos e evidência original.
Há seis estratos por fonte, do início ao fim da ordem canônica; a primeira ligação de cada livro
selecionado é inspecionada. É amostragem exploratória, não aleatória nem certificação estatística.
Os 24 registros tinham offsets válidos; os 22 registros em modo literal coincidiam com a fonte.
Nas sínteses antigas, o teste literal não é aplicável e não certifica o resumo editorial.

Resultados relevantes:

- 930 contextos de capítulo de Wesley e 34 da Shedd podiam desaparecer da apresentação:
  não pertenciam a versículos individuais e o panorama não os acolhia. O critério de apresentação
  passou a respeitar o alcance, inclusive nos modos completo e painel.
- A nota da Shedd atribuída a 2Ts 1:1 agregava o marcador `1 3` da página física 873 e sua
  continuação na 874. Conferência visual e textual permitiu duas notas distintas, 1:1 e 1:3.
  A proposta antiga foi retida, nunca apagada; justificativa e sucessora ficam no Rastro.
- Há prosa e referências secundárias degradadas na própria edição Genebra; não foram
  silenciosamente corrigidas como se fossem palavras originais do autor.
- O Novo Comentário apresenta fragmentação de texto/colunas em amostras. Correspondência literal
  não prova extração integral ou boa legibilidade; essas ocorrências continuam exigindo revisão.
- Amostras de Daniel e Apocalipse distinguem comentário principal de referências secundárias;
  divergências cronológicas entre autores permanecem atribuídas à respectiva fonte.

Não houve promoção em massa para `accepted` ou `audit_status=confirmed`. Leitura assistida não
é revisão humana. O relatório pode legitimamente mostrar zero confirmações de auditoria.

## Jerusalém: impedimento documental

Checksum da edição examinada:
`2deaec3e7684cf9fe399fa11d7372c01c47ce74f2d33d7594f871d12a66e01bd`.
São 1.221 páginas físicas, 1.219 com texto. A avaliação anterior do layout está documentada em
[extração de comentários](../architecture/original-commentary-extraction.md).
Nesta entrega foram revalidados texto de Gênesis, Salmos, Atos e Apocalipse (p.2/600/1100/1220),
além da imagem de Gênesis. Não foi identificado o aparato de notas necessário ao pedido.
O relatório informa essa condição apenas para esse checksum, não para toda Bíblia de Jerusalém.
Para expandir seus comentários é necessário o PDF efetivamente anotado, não outro algoritmo que
converta seus versículos em comentários.

## Dicionários: o que é resolvido e o que é apenas encontrado

O inspetor aproveita lemas do índice linguístico e do dicionário público, não apenas códigos
OSHB/Strong. Não transforma `H7225`, `G3056` ou transliteração latina em identidade lexical.

- Grego–Português: páginas candidatas por FTS e comparação do lema normalizado; delimitação
  conservadora por cabeçalhos, inclusive pontos e verbos. A última entrada da página é omitida
  quando não há limite seguinte conhecido. A qualificação indica extração automática.
- Hebraico/Aramaico: localizador de `ראשית`, p.497, delimitado na edição e validado por hash.
- DITAT: início de `ארץ`, p.150, identificado como fragmento com continuação; número 167 da obra
  não é Strong.
- NDITAT IV: fragmento lexical de `שאר`, p.44, com qualificação de continuidade e OCR; o número
  do verbete não é convertido em Strong. Volume II também participa da busca de candidatos.
- Os três localizadores recusam páginas cuja extração mudou. Demais acertos FTS são apresentados
  como ocorrências, nunca como definições identificadas.

Os fragmentos abrem fonte, página e seleção exata. O texto protegido é carregado apenas do acervo
instalado; nada disso é uma definição inventada ou tradução automática do inglês.
Restam verbetes multipágina, demais entradas, OCR e alinhamento lexical mais extensos.

## Estudos e leituras

O catálogo passou de 19 para 22 leituras selecionadas: duas de Ware (Niceia/primeiros concílios e
Florença/recepção da união), uma do prólogo do Catecismo, além das leituras existentes de Suma,
Institutas, Agostinho, hermenêutica e Augsburgo. Cada indicação depende do checksum da edição e
do hash do texto da página; arquivo errado não recebe o localizador.

A estrutura da Suma distingue explicitamente objeções da solução e das respostas às objeções,
incluindo o marcador `DONDE A RESPOSTA`. Cada seção abre o leitor de fonte com seleção própria,
para anotar sem perder a página. Textos anteriores/posteriores ao limite da página não são inferidos.
Ware recebe localizadores temáticos, não uma falsa decomposição escolástica.

Não foram gerados cursos completos de todos os temas, concílios ou artigos da Suma.

## Publicação e preservação

Lote privado `data/workspace/audit-delivery-20261021` reúne:

- oito ligações de A Trindade, preparadas na entrega anterior mas ainda ausentes do banco original;
- duas notas delimitadas da Shedd, substituindo a ligação automática misturada;
- dois destinos para o recorte de Pilatos em Price: Lc 3:1 e contexto do capítulo Jo 18.

São 12 ligações novas e uma ligação antiga retida: incremento líquido de 11 ligações visíveis.
Os dois destinos de Price compartilham evidência; não são dois achados distintos.
Caption e imagem correspondem à p.252 da própria obra. Lugar e período são separados da
qualificação epistemológica: a inscrição não comprova automaticamente os diálogos, autoria
ou datação dos Evangelhos.

O contrato opcional `supersedes` exige proposta automática pendente da mesma edição e checksum
do payload original. A transação preserva payload/evidência antigos, registra razão e sucessora,
e não altera decisões humanas. Reimportação idempotente não cria outras notas ou correções.
Condições de estado e payload são conferidas também no UPDATE, protegendo revisões concorrentes.
Nenhuma migration ou tabela paralela foi necessária; os campos JSON opcionais são validados.

Antes de escrever: Docker indisponível, nenhuma distribuição WSL ou servidor do acervo ativo,
lock Linux antigo inalterado, backup SQLite consistente e `quick_check=ok`. O lock foi preservado
com sufixo de recuperação; não há mecanismo automático de roubo por idade.
O importador criou outro backup consistente e usou o lock canônico.

Verificação posterior somente leitura: zero importadas/12 reutilizadas; chaves estrangeiras limpas;
57 documentos preservados; baseline das 232 propostas anteriores e das unidades protegidas
preservado. O original permanece schema26. Somente o snapshot descartável de QA recebe migrations
de startup para a versão atual; ele não é outro banco de produção.

## Relatório no Rastro

`/trace?view=utilization` consulta o SQLite atual, não estatísticas fixas:

- páginas extraídas/totais;
- unidades estruturais (não aprovação de sua semântica);
- ligações registradas;
- ligações contextuais elegíveis ao leitor;
- referências confessionais explicitamente classificadas como texto-prova;
- confirmações individuais/de auditoria registradas.

Filtros de fonte, livro, capítulo, versículo e esquema usam parâmetros SQL. Alvos adicionais são
considerados; esquemas distintos não são unidos por coincidência numérica. Total de ligações
nunca é apresentado como número de versículos exclusivos cobertos.
O relatório e os verbetes usam invalidação existente após mutações de conhecimento.

No snapshot, consultas aos quatro exemplos lexicais levaram aproximadamente 1–5ms e o relatório
de 57 documentos cerca de 1,0s em execução local única. Não é benchmark de produção nem p95.

## Continuação necessária

1. Ampliar auditoria contextual e corrigir exceções de layout, sem aprovação em massa.
2. Obter a edição de Jerusalém com notas para processamento real.
3. Estruturar o restante dos dicionários e verbetes multipágina; os pilotos não são cobertura total.
4. Expandir roteiros e decomposição multipágina da Suma/Institutas e demais confissões.
5. Catalogar os outros mapas/achados de Price e das Bíblias com imagens e qualificações específicas.
6. Reconstruir Docker quando o daemon estiver disponível. Esta publicação do acervo não atualiza
   automaticamente a imagem antiga nem o pacote Android.

## Validação desta entrega

### Integração colaborativa

O commit local `daa7f1e` foi preparado separadamente. Antes do envio, o remoto recebeu seis
commits até `bad2498`, com navegação/referências unificadas, KJV, CI e posicionamento das notas.
A integração preserva esses commits e usa `noteTargets`/`knowledgeItemIsChapterContext` como regra
canônica compartilhada. O helper visual apenas acrescenta a opção de resumir notas extensas;
não mantém outro algoritmo concorrente de alcance. O painel mantém o panorama acrescentado aqui.
O aviso de ausência de análises editoriais também foi esclarecido: não significa ausência de
comentários privados. Os índices públicos foram reconstruídos antes da verificação integrada.
`npm test` passou após essa integração: **552 testes/86 arquivos, zero falhas**; typecheck, lint
dos arquivos afetados e build também passaram. A rodada final de produção repetiu panorama,
nota com reload/destaque, léxicos grego/hebraico, imagem arqueológica e relatório em1440/390 sem
erros de aplicação. A KJV integrada abriu o texto real de Jo1:1. Android foi preservado no merge,
mas não recompilado nem validado nesta entrega.

- `npm test`: primeira execução identificou uma asserção antiga fixada em 19 localizadores.
  O teste passou a verificar unicidade contra o tamanho real do catálogo, preservando as demais
  validações; não foi desativado. Após a expansão e os testes novos, a suíte completa
  `npx vitest run --testTimeout=60000` passou: **513 testes/84 arquivos, zero falhas**.
- `npm run typecheck`, ESLint nos TS/TSX alterados e `npm run build`: passaram. Persistem avisos
  de ferramenta sobre `vite-tsconfig-paths`, SQLite experimental e assets grandes de PDF/WASM.
- Não houve alteração Python nem execução da suíte Python nesta entrega.
- Playwright local porque o Browser plugin não estava disponível. QA em
  `http://127.0.0.1:5174`, snapshot isolado, viewport1440×1000 e390×844, sem alterar notas originais.
  Identidade, conteúdo, ausência de overlay, filtros e overflow global foram conferidos.
- Relatório mostrou57 documentos; filtro Malaquias manteve a aba e mudou as contagens reais.
  Daniel1 mostrou8 notas no panorama em resumido/completo e8 contextos no painel.
- Suma mostrou os sete blocos, incluindo continuação e respostas às objeções. Abrir seção marcou
  a seleção; nota com grupo/título/conteúdo foi salva somente no QA.
- Clicar λόγος abriu o verbete português e a página126 com seleção exata. O piloto Price exibiu
  lugar/período/qualificação, imagem657×1000 da página252 e janela de fonte sem sair da passagem.
- Clicar a primeira palavra hebraica de Gn1:1 também resolveu o verbete português da página497.
  A nota da seção foi reaberta após reload e conservou a seleção marcada.
- Na rodada de desenvolvimento houve um aviso React durante recargas HMR enquanto arquivos eram
  editados. A rodada repetida com o build de produção completou os fluxos sem erros de console.
- Uma tentativa adicional misturou preview antigo com assets reconstruídos e recebeu ENOENT/500;
  o processo foi encerrado e reiniciado com o build correspondente. A rodada final passou.
- Evidências visuais privadas em AppData/Local/Temp/scriptorium-audit-20261021. Não entram no Git.
