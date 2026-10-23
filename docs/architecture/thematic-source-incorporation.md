# Incorporação documental por tema e verbete

## Limite semântico

Uma seção não vira comentário de versículo apenas porque contém uma referência.

| Resultado           | Destino real                             | Não significa                                            |
| ------------------- | ---------------------------------------- | -------------------------------------------------------- |
| Seção temática      | Estudos → tema → Leituras                | Conclusão teológica revisada ou comentário bíblico       |
| Verbete delimitado  | Inspetor de palavras → leituras privadas | Alinhamento automático de Strong nem dicionário integral |
| Análise de passagem | Leitor → explicações da passagem         | Concordância universal com o autor                       |

Todos usam o workspace canônico. Não existe banco temático paralelo.

## Fluxo e contrato

1. `services/semantic-engine/app/thematic_sources.py` lê páginas já extraídas, em SQLite somente leitura.
2. Perfis fixados pelo SHA-256 da edição identificam cabeçalhos e papéis documentais.
3. Staging privado: `scriptorium-thematic-readings-v1`, trecho literal, página física, hash da página e offsets UTF-16.
4. `scripts/content/import-thematic-readings.ts` confere hashes, adquire o lock canônico e cria backup consistente.
5. O serviço TypeScript valida todas as evidências do lote antes da transação.
6. Publicação aditiva em `semantic_units`, `semantic_unit_spans` e `knowledge_proposals`, sem migration ou reindexação destrutiva.
7. Estudos consulta assuntos explícitos; o inspetor consulta lema normalizado e valida novamente a unidade.

`studyContext` é opcional e validado no payload existente de `topic-assignment`.
Mantém temas, autor, tradição, caminho, localizador, papel, justificativa e limitações.
Papéis: questão, objeção, em contrário, resposta, resposta à objeção, seção e verbete.
Uma objeção nunca é rotulada como conclusão do autor.

## Integridade e revisão

- Método `documentary-thematic:v1`; estado inicial `machine-proposed`, confiança numérica 0. Não representa verdade teológica ou revisão humana.
- IDs determinísticos derivados da edição, evidência e payload, independentes da posição no array.
- Uma unidade estável pode sustentar associações diferentes. Reimportação preserva decisões anteriores, inclusive rejeições.
- Edição errada, hash ou offsets divergentes recusam o lote inteiro antes da escrita.
- Limites: 100 entradas, 4 MiB por lote, 12 mil caracteres por fragmento.
- Banco deve existir, schema 25–28 e FKs válidas. O importador não aplica migrations.
- Lock não é removido à força; pare os escritores legítimos antes da publicação.
- Páginas com NUL ficam em quarentena: a API nativa pode truncar essas strings.
- PDFs e trechos protegidos permanecem privados, não no Git.

## Operação

Execute na raiz, usando novo diretório de staging e o Python configurado do serviço:

```powershell
cd services/semantic-engine
.\.venv\Scripts\python.exe -m app.thematic_sources ..\..\data\workspace\workspace.sqlite3 ..\..\data\workspace\novo-lote
cd ../..
npm run content:import:thematic -- data/workspace/workspace.sqlite3 data/workspace/novo-lote --dry-run
# Pare Vite/Docker que usam este workspace antes de publicar.
npm run content:import:thematic -- data/workspace/workspace.sqlite3 data/workspace/novo-lote --runtime-stopped
npm run content:import:thematic -- data/workspace/workspace.sqlite3 data/workspace/novo-lote --verify
npx tsx scripts/content/verify-thematic-readings.ts data/workspace/workspace.sqlite3
```

`--dry-run` valida sem gravar; `--verify` recusa qualquer necessidade de escrita.
Recibos em `receipts.ndjson`, com backup informado. Transações são por lote; após interrupção,
retome o mesmo staging. Conserve os backups até conferir a aplicação. A CLI exige recarregar
telas abertas; o serviço no runtime emite o evento habitual de mutation.

## Consumo e limites

O repositório intercala fontes para a Suma não ocupar toda a lista. Consulta 81 resultados
para detectar o limite visual de 80, com aviso para continuar na obra. Não é navegação integral
das 29 mil seções. Verbetes não poluem essa lista. Falhas nas leituras antigas e novas são isoladas.

`prepare-lexical-readings.ts` reaproveita o parser grego existente: entradas locais à página,
com fonte/checksum, sem inventar Strong; a última entrada sem fim seguro pode ser omitida.
Análises selecionadas de Reimer usam o importador contextual existente e `methodological-study`;
referências comparativas não viram automaticamente destinos primários.

Ainda não há reconstrução integral dos argumentos multipágina da Suma, catálogo completo de
tratados de Nag Hammadi ou índice hebraico integral. Cabeçalhos delimitam documentos, não
simulam leitura intelectual integral.

## Testes

`thematic-reading-service.test.ts`: edição/offsets, atomicidade da validação, idempotência,
rejeição preservada, proteção contra reindexação e verbete grego.
`test_thematic_sources.py`: papéis, cabeçalhos versus corpo, UTF-16, bibliografia, listas e NUL.
O verificador real reconstrói amostras, consulta temas/lema e verifica FKs. Auditoria estrutural
não é aprovação teológica.
