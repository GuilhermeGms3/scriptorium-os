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
