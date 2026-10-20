# Retomada contextual no desktop — 20/10/2026

## Acervo e destino do conteúdo

O workspace canônico continua em `data/workspace/workspace.sqlite3`, com 57 documentos.
Importação de PDF, extração de páginas, descoberta por FTS e incorporação contextual são estados
diferentes. A presença de milhares de páginas não significa que todas foram interpretadas ou
associadas a versículos. Nenhum PDF novo foi baixado nesta entrega; nenhum APK foi alterado.

| Fonte existente                            | Aproveitamento desta entrega                                     | Limite                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Crisóstomo — homilias sobre Atos e Romanos | 118 ligações de excertos de abertura: 80 em Atos e 38 em Romanos | Não publicar toda a homilia como explicação de seu primeiro verso                        |
| Suma Teológica em português                | 12 leituras temáticas em questões e páginas físicas determinadas | Não equivale à estruturação integral das 4.278 páginas nem a um novo grafo de argumentos |

As ligações das homilias entram no mesmo `ContextualReadingService`, propostas, evidências,
decisões de publicação e Rastro dos comentários anteriores. Os trechos são originais da edição
inglesa, não traduções novas. Continuam `machine-proposed`, com auditoria individual pendente.
O Reader e o inspetor consultam essas relações existentes; não foi criado outro repositório.

## Homilias: calibração e exceções

Perfil: `services/semantic-engine/profiles/chrysostom-acts-romans.json`, preso ao SHA-256 da edição.
Atos: páginas físicas 21–611; Romanos: 621–1000. Prefácios e índices ficam fora.
O parser lê o livro e a referência explícita depois de `Homily ... on`; o ordinal da homilia
nunca vira número de capítulo. Versos separados por vírgula continuam separados.

Foram identificados 85 lemas válidos; 84 aberturas foram efetivamente publicadas, pois uma
não passou na validação dos fragmentos. A extração integral inicial produzia 507 ligações,
mas **esse lote não foi importado**: aplicações e desenvolvimento sobre versos posteriores
não devem herdar indiscriminadamente o destino do lema inicial. O perfil publica somente o
primeiro bloco literal limitado de cada homilia, podendo produzir mais de uma relação quando
o lema enumera versos distintos. O restante permanece na Biblioteca para segmentação posterior.

Cinco ocorrências ficam no relatório privado:

- páginas 202 e 351: geometria desalinhada; texto não publicado;
- página 454: lema com duas referências de capítulos diferentes, ainda não suportado;
- página 950: `Rom. xiv. 25-27`, fora dos limites de Romanos 14; não corrigido por suposição;
- página 856: fragmento sem tamanho/unicidade aceitável; não publicado.

O perfil remove o pequeno fólio lateral por altura mínima de glifo inline. A calibração
anterior de Mateus permanece padrão. Optar por quarentena nunca permite um hash de página
divergente. Conferência visual incluiu a página 21 das homilias e a página 346 da Suma;
não é declaração de leitura humana integral das duas obras.

## Suma: leituras reais nos estudos

`private-study-readings.ts` guarda somente localizadores editoriais e hashes — não o texto
protegido do livro. Cada indicação exige o checksum da edição e o SHA-256 do texto extraído
da página. Edição ausente não gera conteúdo; página divergente gera aviso recuperável.

Temas: doutrina sagrada, existência de Deus, processões e Trindade, causa primeira, criação,
bem e mal, alma, pecado original, graça, encarnação e sacramentos. Correspondências usam IDs
de temas/guias, não a ocorrência casual de uma palavra. Na árvore, abrir um tema e acessar
**Leituras → Leituras selecionadas**. A página original é lida pelo repository; o leitor de
fontes existente permite contexto, Biblioteca e anotação. A busca textual anterior permanece.

A Suma é apresentada como fonte escolástica católica. Não transformar “Parece que...” em
conclusão de Tomás: ler objeções, solução e respostas. O aviso também conserva a limitação
da compilação privada, que informa traduções de procedências diferentes. Os localizadores
nesta entrega são páginas de partida, não artigos inteiros artificialmente recortados.

## Operação reproduzível

Com todos os escritores do workspace parados:

```powershell
npx tsx scripts/content/export-commentary-source.ts data/workspace/workspace.sqlite3 11e7f5fd585a01f6b23a76ab7ce2ed9819ace2063d7284798a058bcf63af4195 <snapshot-novo.json> --protect-all-contextual
npx tsx scripts/content/export-commentary-layout.ts <snapshot-novo.json> data/workspace/documents/11e7f5fd585a01f6b23a76ab7ce2ed9819ace2063d7284798a058bcf63af4195.pdf <layout-novo.json>
```

No serviço Python, usar o perfil acima com `python -m app.outlined_sources`, conforme
`docs/architecture/outlined-source-contexts.md`. Usar diretórios novos de staging; não
sobrescrever pacotes anteriores. Revisar o relatório antes da importação.

```powershell
npm run content:import:contextual -- data/workspace/workspace.sqlite3 <staging> --runtime-stopped
npx tsx scripts/content/verify-contextual-reading.ts data/workspace/workspace.sqlite3 <recibo-novo.json> <staging>
npx tsx scripts/content/verify-study-readings.ts data/workspace/workspace.sqlite3
```

O importador aceita versões conhecidas 25–28 sem migrar tabelas alheias ao contexto;
23/24 conservam o caminho anterior de backup e migração. Versão futura, ausente ou inválida
é recusada. A importação desta entrega preservou a versão 25 do banco canônico. Ao religar,
a imagem Docker existente (que contém migrações até 26) executa sua própria atualização
aditiva de notas, precedida de backup consistente. O código novo do desktop contém até 28;
o importador não deve impor essa atualização ao runtime antigo.

## Preservação e evidência da execução

- Container do aplicativo parado com autorização e religado depois; serviço de tradução intacto.
- Lock Linux antigo preservado como `workspace.lock.crash-20261020-preserved` somente após
  confirmar o container parado e concluir backup consistente. Não houve remoção por idade.
- Backup anterior à recuperação e backup automático anterior ao lote preservados localmente.
- Dois lotes: 118 relações novas; reaplicação somente leitura: 0 novas, 118 reutilizadas.
- Baseline preservada: 57 documentos, 89.231 unidades anteriores e 232 propostas editoriais
  anteriores com suas decisões. `quick_check` e chaves estrangeiras aprovados.
- Catálogo da Suma: 12/12 páginas e edições conferidas no banco real, somente leitura.
- QA visual utiliza cópia consistente separada em diretório temporário, nunca outro escritor
  no acervo canônico. A nova interface não foi implantada por rebuild da imagem Docker.

Validação do código: 494 testes TypeScript e 113 Python aprovados; typecheck, build, ESLint
dos arquivos alterados, Ruff e mypy estrito do serviço completo aprovados. Há um aviso de
depreciação Starlette/httpx e avisos informativos do pipeline Vite, sem desativação de regras.
Playwright (plugin Browser não disponível) conferiu o build em `127.0.0.1:5174`, com cópia
temporária do banco, a 1440×1000 e 390×844: leitura selecionada, troca de questão, página
original na janela de fonte, ausência de overflow global e erros de console. No Reader,
selecionar a fonte e expandir a exposição mostrou o excerto novo em Atos 1:1. Não foram
testados tradução remota nem salvamento de novas notas nesta entrega.

## Próximas fontes e trabalho ainda não realizado

1. **A Trindade, de Agostinho**: segmentar livro/capítulo/argumento e ligar aos estudos trinitários.
2. **Institutas, de Calvino**: estrutura própria e perspectiva confessional identificada;
   comparar posições sem transformar citações de prova em comentário direto.
3. **Hermenêutica e exegese**: capítulos de método para os guias, não distribuídos artificialmente
   sob cada versículo citado como exemplo.
4. **DITAT e léxicos português/hebraico/grego**: segmentar verbetes, resolver identificadores
   lexicais e então disponibilizar nos inspetores; não substituir por comentários corridos.
5. **Arqueologia e geografia**: evidência e mapas com localizador e alcance explícitos;
   uma ilustração introdutória do livro não é evidência de todos os capítulos.

Continuam pendentes os PDFs sem camada textual e a correspondência segura da numeração dos
Salmos nas exposições patrísticas. A Bíblia de Jerusalém instalada não deve ganhar notas que
não existem no PDF fornecido. A estruturação integral da Suma, os desenvolvimentos posteriores
das homilias e a revisão intelectual de todas as associações não foram concluídos nesta entrega.
