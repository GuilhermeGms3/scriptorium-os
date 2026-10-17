# Comentários das Bíblias privadas

O leitor distingue comentário contextual de referência detectada. Uma página sobre Apocalipse
que cita Gênesis não se torna automaticamente uma explicação de Gênesis. As notas editoriais
alimentam o mesmo `ContextualReadingService`, `knowledge_proposals`, `pipeline_decisions`, spans
de evidência e Rastro usados pelo restante do produto, sem banco paralelo.

## Leitura e apresentação

- Sínteses explicam diretamente a passagem, atribuindo a interpretação à fonte.
- Fontes distintas permanecem separadas, inclusive quando discordam.
- Texto e indicação de fonte são sublinhados e abrem o livro na página/unidade da evidência.
- O leitor mostra todas as notas contextuais retornadas pelos filtros de fonte/assunto.
- Notas pontuais precedem intervalos amplos. Intervalos com mais de sete versículos ficam
  recolhidos em um controle de contexto, evitando repetir uma explicação geral integralmente.
- A consulta prioriza notas contextuais antes do limite de 200 relações. Esse limite continua
  existindo: a lista não é um relatório completo de cobertura do banco.
- O toggle de explicações existente permanece responsável pela leitura limpa.
- Conteúdo assistido não recebe aceitação humana automática. Rejeições individuais continuam
  bloqueando a publicação, e reimportações idênticas não alteram revisões.
- Confirmar uma referência não a transforma em exegese: trechos sem análise contextual
  permanecem no painel expansível, não no comentário inline, mesmo quando a ligação foi aceita.

## Lotes reais — 14/10/2026

Foram incorporadas **116 notas**, provenientes de **três fontes privadas**.
Os primeiros dois lotes contêm 51 notas:

| Fonte                                              | Páginas físicas utilizadas | Alcance selecionado |
| -------------------------------------------------- | -------------------------- | ------------------- |
| Bíblia Shedd                                       | 5–6                        | Gênesis 1–3         |
| Bíblia de Estudo Genebra, versão digital importada | 28–36                      | Gênesis 1–2         |

O Manual bíblico MacArthur acrescentou três notas das páginas físicas 37–39, destinadas a
Gênesis 1:26, 3:1–24 e 12:1–3. É um manual introdutório, não comentário contínuo por versículo.

Os lotes são `genesis-shedd-genebra-20261014-01` (48 notas) e
`genesis-macarthur-20261014-01` (3 notas). As evidências literais, planos de leitura,
pacote JSON e backups ficam em `data/workspace/`, **fora do Git e dos corpora públicos**.
Os 37 PDFs anteriores foram preservados. Este lote não equivale à leitura integral das Bíblias,
nem contém todas as notas de todas essas páginas. Intervalos compartilhados não devem ser
contados como comentários individuais escritos para cada versículo.

O terceiro lote, `genesis-shedd-genebra-20261014-02`, acrescentou **65 notas**:
Shedd páginas físicas **7–11**, seleção de Gênesis **3–12**; Genebra páginas **38–41**,
seleção de Gênesis **3–4**. A leitura avançou na ordem das notas, mas recortes incompletos
entre páginas e reconstruções que exigem conferir bibliografia secundária ficaram fora do lote.
Não se deve interpretar o intervalo de capítulos como cobertura de cada versículo.

A versão digital da Genebra apresenta português irregular e referências corrompidas já no PDF.
Essa limitação consta nas análises; o trabalho não certifica a qualidade editorial dessa edição.
O arquivo original e os offsets permanecem intactos. A síntese não corrige silenciosamente a fonte.
Na página de Gênesis 1 inspecionada da Bíblia de Jerusalém importada há texto bíblico, sem notas de
comentário. Não se deve presumir a presença das notas de estudo somente pelo nome de um arquivo.

## Incorporação offline na instalação

O Rastro mantém seu importador JSON. Para operadores locais, também existe:

```powershell
docker compose stop scriptorium
npm run content:import:contextual -- data/workspace/workspace.sqlite3 caminho/privado/lote.json --runtime-stopped
docker compose up -d scriptorium
```

Pare também qualquer Vite que use esse banco. A flag é uma declaração do operador, não uma
detecção automática de todos os processos. Nunca escreva simultaneamente por Windows e pelo
container Linux no mesmo bind mount.

O comando exige banco existente e schema compatível, verifica foreign keys, faz backup SQLite
consistente antes de importar e reutiliza a validação/transação do serviço canônico. Não recria
unidades existentes, não apaga propostas e não instala LLM. A reimportação do lote real retornou
`imported: 0, reused: 48`; o segundo lote também foi reimportado com `imported: 0, reused: 3`.
O terceiro retornou `imported: 65, reused: 0` e, na repetição, `imported: 0, reused: 65`.
As duas execuções do terceiro lote produziram snapshots SQLite completos antes da operação,
respectivamente com 51 e 116 notas.
O segundo lote, estritamente aditivo, utilizou o snapshot completo anterior com as 48 notas
verificadas por ID e os dois pacotes privados idempotentes como recuperação. Duas tentativas
adicionais de cópia foram interrompidas antes de importar e ficaram identificadas como `.partial`;
não são backups restauráveis. Backups são privados e não são removidos automaticamente.

## Continuidade e limites

### Expansão por comentários originais — 16/10/2026

O extrator Python especializado percorreu as 935 páginas da Shedd e 1.740 da Genebra, com
cabeçalhos identificados dos 66 livros em ambas. Foram incorporados **24.057 comentários
originais adicionais**: **11.876 da Shedd** e **12.181 da Genebra**. Não são 24.057 sínteses
novas nem uma leitura intelectual integral feita pelo assistente.

São 21.297 notas pontuais, 2.514 intervalos, 212 perícopes entre capítulos e 34 notas de capítulo.
Os intervalos/perícopes alcançam endereços adicionais, mas não equivalem a comentários individuais
para cada verso. As notas pontuais explicam **16.276 endereços distintos**. Incluindo intervalos
e perícopes, a contagem de endereços distintos abrangidos é **28.142**.

As 116 notas editoriais anteriores, suas 232 propostas associadas, 49.345 unidades antigas e
metadados dos 37 documentos foram preservados por comparação de hashes. `quick_check` e
`foreign_key_check` passaram. A reimportação completa da Shedd retornou `imported: 0, reused: 11876`.
Na Genebra, uma colisão de evidência interrompeu o segundo lote e o reverteu integralmente; após
migration 024, a retomada reutilizou as 100 notas do primeiro lote e importou outras 12.081.

As notas novas permanecem machine-proposed/machine-visible por política documental, com auditoria
pendente, nunca como revisão humana individual. A amostragem de calibração identificou referências
quebradas de linha e remissões sem explicação; o motor recebeu filtros e testes para esses casos.
Não há estimativa estatística de precisão/recall. Referências corrompidas e casos ambíguos foram
registrados como exceções, não corrigidos silenciosamente nem publicados como exegese.

Pacotes, recibos, relatório de cobertura e backups consistentes ficam privados em `data/workspace/`.
O relatório canônico desta execução é `commentary-baseline-20261016.json.verification.json`, junto
aos relatórios de `shedd-commentary-publish-v1` e `genebra-commentary-publish-v1`. O SQLite é schema
24; atualizar todos os runtimes antes de abrir a pasta compartilhada. Detalhes de operação e
rollback: [extração de comentários originais](../architecture/original-commentary-extraction.md).

Essa execução não processou novamente os outros livros do acervo, não adicionou traduções bíblicas
e não garante todas as notas dos dois PDFs ou todos os versículos. Próximas prioridades: exceções
e avaliação da extração, outros comentários/layouts, depois monografias, dicionários e fontes antigas.

Continuar pela avaliação das exceções e dos outros layouts, mantendo a ordem bíblica nas fontes.
Cada lote precisa registrar o que
foi realmente lido, suas evidências e os destinos; não basta promover citações automáticas.
Nag Hammadi, léxicos e tradução mantêm as integrações da entrega anterior e não receberam
novos textos neste lote. Tradução local continua inglês→português; espanhol não deve ser
enviado implicitamente ao modelo inglês. Não há validação automática da verdade de uma doutrina.

### Wesley, Novo Comentário AT e recuperação — 16/10/2026

A fila autônoma terminou: 14 PDFs concluíram importação e desmembramento determinístico;
seis tiveram seus originais incorporados, mas permanecem sem texto aguardando OCR; um EPUB
permanece bloqueado por ausência de importador. O workspace contém 57 documentos, 47.707
páginas físicas e 45.905 páginas com texto. Todos os 57 PDFs originais estão presentes.

Esta entrega incorporou realmente mais **18.427 entradas contextuais**:

| Fonte                      | Entradas adicionais | Tratamento                                                            |
| -------------------------- | ------------------: | --------------------------------------------------------------------- |
| Wesley                     |               6.232 | 5.302 notas pontuais do NT; 930 trechos de contexto de capítulo do AT |
| Novo Comentário Bíblico AT |              11.248 | Comentários originais dos 39 livros do AT                             |
| Shedd                      |                 497 | Recuperação de marcadores consecutivos separados por vírgula          |
| Genebra                    |                 450 | Recuperação de marcadores consecutivos separados por vírgula          |

Os 930 trechos de Wesley não são 930 capítulos distintos nem comentários individuais de verso.
O original de Wesley continua em inglês. A extração usa outline e geometria do PDF; listas
numeradas internas não são convertidas em versículos. No Novo AT, boxes laterais são separados
do corpo principal. Marcadores danificados interrompem a nota anterior e seguem para exceções,
sem anexar silenciosamente seu conteúdo ao versículo errado. Referências não contíguas não
viram intervalos. Os spans contextuais anteriores foram protegidos na recuperação.

Agora há **42.484 comentários originais** nas quatro fontes, mais **116 notas editoriais**:
42.600 entradas contextuais no total. Nos 66 livros, incluindo as notas editoriais, são 20.089
endereços distintos com notas pontuais e 30.477 abrangidos quando incluídos intervalos/perícopes.
Dos 31.101 versículos efetivamente instalados da Bíblia Livre, 625 não têm essa cobertura.
Contextos gerais de capítulo não entram nessa contagem. Todos os 1.189 capítulos têm algum
contexto; 87 possuem notas pontuais para todos os versos e 1.028 cobertura completa quando
incluídos intervalos. Isso não certifica precisão acadêmica nem revisão humana de cada ligação.

`quick_check`, foreign keys e comparação com o baseline passaram: preservados os metadados
dos 57 documentos, 89.231 unidades genéricas anteriores e as 232 propostas editoriais.
A verificação pelo serviço canônico, sem escrita, reutilizou integralmente os quatro pacotes:
6.232, 11.248, 497 e 450 entradas; nenhuma nova importação na repetição.

Pacotes finais privados: `wesley-commentary-publish-v1`, `novo-at-commentary-publish-v3`,
`shedd-adjacent-recovery-v1` e `genebra-adjacent-recovery-v1`. Auditoria privada:
`data/workspace/commentary-baseline-second-sources-20261016.json.verification.json`.
Diretórios de calibração não são pacotes publicados. Backups consistentes foram preservados.

Validação: 391 testes TypeScript (54 arquivos), 64 Python, typecheck, lint, build Node,
Ruff e mypy strict passaram. QA no preview de produção confirmou João 3/Wesley (29 cartões
filtrados), Gênesis 1/Novo AT (29), toggle, fonte sublinhada, página 48 com dois destaques e
viewport 390×844 sem overflow global ou erros de console. Permanecem problemas visuais
preexistentes no cabeçalho e seletor de fonte móvel. Docker e tradução não foram validados.

Próximas fontes: notas de Jerusalém, Agostinho e Catecismo/confissões, depois léxicos e obras
temáticas, cada qual com estrutura própria. Os seis PDFs sem texto continuam exigindo OCR;
não foram convertidos em comentários. Todas as novas ligações permanecem machine-proposed,
visíveis por política documental e com auditoria pendente, sem participação de LLM.
