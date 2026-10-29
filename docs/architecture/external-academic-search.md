# Busca local, pesquisa acadêmica e caminhos externos

## Experiência

A página `/search` mantém os modos **Texto e referências** e **Por sentido**, os filtros
de resultados, a escolha de edição e a preparação/cancelamento do índice semântico existentes.
O Ctrl+K e o motor de busca local não foram substituídos.

Três ramos organizam a página:

- **Meu acervo:** consulta local/semântica existente. Não consulta provedores acadêmicos.
- **Pesquisa acadêmica:** busca real no OpenAlex, somente após **Pesquisar fontes** ou Enter.
  Há filtros por idioma, ano de publicação e acesso aberto informado; dez registros por página,
  no máximo dez páginas. Alterar tema/filtros cancela a resposta anterior, sem consultar outra
  automaticamente. Os filtros são de publicação, não datas históricas do assunto.
- **Na web:** prepara links para Google, Google Acadêmico, SciELO, BDTD e pesquisas nos domínios
  de USP, UnB, Harvard DASH, Frankfurt e Internet Archive. Atalhos via Google são identificados.
  A aplicação não raspa resultados do Google/Scholar nem apresenta esses atalhos como resultados
  integrados. Cada site abre em uma nova aba por ação explícita.

A ambientação reaproveita a gravura Biblioteca celeste, bronze e conectores da árvore, com CSS
restrito à página. Não altera a árvore de estudos. `HebrewSearchMark` monta **דַּעַת** letra a letra;
o feedback textual indica a operação real e não mostra percentuais fabricados. A animação não
atrasa resultados e é desativada por `prefers-reduced-motion`. O shell mantém a Busca montada ao
cruzar o breakpoint móvel para não perder consulta, filtros ou resultados.

## Contrato externo

`AcademicSearchService` consulta diretamente `GET https://api.openalex.org/works`, com CORS do
provedor. Não foi criado proxy genérico, novo endpoint público, dependência ou serviço remoto obrigatório.
O modo local continua independente de internet e do OpenAlex.

Parâmetros construídos pelo serviço: `search`, `page`, `per_page=10`, `select` limitado e `filter`
validado. O tema tem entre 2 e 240 caracteres. A resposta é validada com Zod; registros incompletos
são omitidos e identificados. Metadados retornados incluem título, autoria disponível, instituições,
ano/idioma/tipo, DOI, ficha no OpenAlex, landing page e acesso aberto quando informado.

O acesso básico sem chave foi conferido nesta entrega. As cotas/políticas pertencem ao provedor
e podem mudar: 403/429 mostram indisponibilidade/cota e oferecem os caminhos externos, sem fallback
fictício. Não há criação automática de conta ou chave. Consulte as
[regras de autenticação do OpenAlex](https://help.openalex.org/api/authentication/) e a
[documentação de busca](https://help.openalex.org/api/searching/).

- Timeout de 15 s, cancelamento por AbortController e proteção contra respostas antigas.
- Cache em memória por 5 min, até 20 consultas; nenhuma pesquisa externa é gravada em localStorage.
- Sem cookies, credenciais ou referrer enviados. Somente o tema digitado e filtros são enviados.
  Não há anexação de notas, livros, páginas privadas, histórico de leitura ou extração de contexto.
- Resposta limitada a 2 milhões de caracteres; sem retries silenciosos ou paginação que percorra todo o catálogo.
- URLs de metadados são filtradas por protocolo/host/credenciais antes de oferecer navegação;
  nunca são buscadas automaticamente. Links usam `noopener noreferrer` e `no-referrer`.
- Texto externo é renderizado por React, sem executar HTML nem scripts recebidos.

## Guardar e anotar

`AcademicReferenceService` converte a seleção para CSL-JSON e reutiliza `SourceImportService`:
autores, obra, edição, identificadores, direitos, checksum, proveniência e FTS permanecem no
Source Engine canônico. A repetição é deduplicada por DOI/URL e resolve o registro já existente.
Mutations invalidam consultas do workspace, inclusive a busca local.

Guardar referência **não instala o texto integral**, não transfere direitos sobre conteúdo,
não transforma o registro em claim revisada e não baixa o PDF apontado pelo catálogo. A marca
de acesso aberto é informação do provedor, não certificação de licença ou revisão acadêmica.

**Anotar sobre esta fonte** usa o leitor contextual e o caderno existentes. Referências que
não pertencem ao catálogo público são resolvidas também na `LibraryRepository`, sem tentar
obter o texto externo. A origem da nota continua sendo o ID da fonte. O botão da Biblioteca
abre esse registro; a importação do documento, quando permitida, continua sendo uma ação separada.

Nenhuma migração de banco é necessária. O acervo privado não foi reimportado nem reprocessado.

## Validação

Testes focados cobrem contrato, filtros/encoding, URLs inseguras, respostas incompletas/duplicadas,
cotas, falha de rede, payload inválido/grande, cancelamento, cache, atalhos externos, importação
idempotente/FTS/FKs e leitura de metadados guardados. Fixtures são exclusivamente de teste,
identificadas como DEMO; o produto só mostra resultados recebidos do provedor.

QA usa workspace temporário separado do acervo, com consulta real ao OpenAlex e verificação de
que digitar/pesquisar localmente não inicia chamadas externas. Respostas controladas no navegador
servem somente para testar falhas/atrasos e não substituem a consulta real.

Verificação em 18/10/2026: 17 testes focados passaram; a suíte completa do workspace passou
com 477 testes em 73 arquivos. `npm run typecheck`, `npm run lint` e `npm run build` passaram.
QA no Chromium em 1536×1024 e 390×844 confirmou consulta real, referência idempotente,
leitura contextual, manutenção dos resultados ao redimensionar, ausência de overflow horizontal,
tratamento de cota e movimento reduzido. O controle da busca semântica foi preservado;
não foi executada inferência real de embeddings nesta validação. Nenhum Docker foi reconstruído.
