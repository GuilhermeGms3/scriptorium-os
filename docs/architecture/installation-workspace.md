# Acervo da instalação

`SCRIPTORIUM_WORKSPACE_DIR` habilita SQLite nativo e arquivos privados dentro da pasta local do
projeto. Docker monta `./data/workspace:/app/workspace`; os PDFs, o banco e as prévias não são
embutidos na imagem, publicados pelo site nem versionados no Git. Um clone novo não inclui livros
privados: transfira essa pasta por um canal privado, com backup e o runtime parado.

Sem essa configuração, o modo navegador/Cloudflare continua OPFS. Falha da instalação não muda
silenciosamente para outro banco vazio. SSR não inicializa SQLite WASM ou OPFS.

## Contrato e segurança

Modo **local single-user**, não servidor pronto para internet/LAN. Compose publica somente em
loopback. Host local, origem equivalente e header de intenção são obrigatórios. Sessões usam
cookies aleatórios HttpOnly/SameSite=Strict; não há CORS nem credenciais no bundle/localStorage.

- `POST /api/workspace/session`: abre a sessão local.
- `POST /api/workspace/command`: query/execute/transaction do adapter existente, com bindings.
  Bloqueia filesystem SQL, ATTACH, extensões, DDL, pragmas e múltiplos statements. Migrations
  canônicas 001–022 são internas. Limites: 16 MiB e 2.000 statements por transação.
- `GET/PUT /api/workspace/documents/<sha256>`: PDF até 256 MiB, verificado por assinatura e hash.
- `GET /api/workspace/covers/<sha256>`: primeira página real via Poppler, cacheada por checksum.
  `?page=<n>` solicita uma prévia de página instalada, com sessão e limites validados;
  cache separado em `page-previews/`. Utilizado pelos mapas/contextos da passagem.
- `POST /api/workspace/migration?offset=...`: snapshot em blocos de 4 MiB; `finish=1` valida e ativa.
- `/api/workspace/translation/v1/info` e `/translate`: proxy para o companion configurado no servidor.

Reset compartilhado e exclusão física dos originais são recusados. Não há endpoint de manutenção
destrutiva. Backups JSON acima dos limites precisam de restore offline ou estratégia atômica de
lotes; não são divididos silenciosamente. A pasta privada deve ter backup e permissões do usuário
da instalação. Compartilhamento remoto exige autenticação, autorização e TLS adicionais.

## Migração integral

No navegador que possui o acervo: Importar e processar → Transferir acervo deste navegador para a
instalação. Pause processamentos e não edite em outra aba. O destino precisa estar vazio.

1. Abre o OPFS explicitamente como fonte e copia PDFs com verificação SHA-256.
2. Exporta o SQLite completo, incluindo páginas, FTS, ligações, revisões, traduções e Rastro.
3. Valida a versão atual (22), quick_check, foreign keys, contagens e presença dos PDFs.
4. Preserva o banco inicial em `.before-migration-*` e ativa o snapshot validado.

O original OPFS permanece intacto. Não há OCR, desmontagem, inferência ou aprovação novamente.
Snapshots têm limite de 2 GiB e exigem memória para exportação completa no WASM. Staging é privado
e associado à sessão; retomada após troca de sessão ainda não existe. Falhas antes da ativação
preservam o destino e o staging, sem publicar um banco parcialmente transferido.

Migração real de 2026-10-13: 37 PDFs (671.893.492 bytes), 26.243 páginas, 49.229 unidades,
388.961 propostas, 137.375 decisões e 137.375 eventos de Rastro; zero violações de FK. Snapshot:
1.470.939.136 bytes. As propostas estavam todas machine-proposed: volume não significa revisão
humana nem leitura editorial integral.

## Biblioteca e leitor

A estante mostra documentos reais e primeiras páginas dos PDFs, não capas editoriais inventadas.
Agrupamento por título é uma sugestão; o perfil confirmado permanece no livro. Estrutura e assuntos
vêm do motor documental. Dicionários buscam ocorrências reais em páginas dos livros de referência.
Nag Hammadi localiza títulos nos volumes privados; não inventa limites de tratados ou alinhamento
de códices. O texto copta instalado continua diretamente legível.

O leitor distingue trechos literais, análise contextual assistida e contexto editorial recolhido.
Citação detectada não é exegese. Links privados levam página e unidade e realçam seus offsets.
A leitura contextual integral das Bíblias comentadas continua uma operação separada.

O tradutor atual é Marian inglês→português, sem LLM. Docker usa PyTorch CPU, SentencePiece e
Sacremoses, com cache persistente `/models` pertencente ao usuário 1001. Espanhol, grego e hebraico
não são enviados ao modelo inglês. O proxy evita depender de uma URL de container no navegador.
O QA real da seção 1 da Didaquê confirmou execução/cache, mas encontrou omissões e repetição no
inglês arcaico. Portanto o tradutor não está validado como tradução acadêmica fiel; mantenha o
original e revisão humana. Funcionamento HTTP não comprova preservação semântica.

As seções detectadas ainda dependem da qualidade do analisador existente: não equivalem a um
sumário editorial validado. Dicionários oferecem ocorrências citáveis, não verbetes normalizados.
Notificações de mutations atualizam o cliente atual; mudanças realizadas em outro navegador
exigem Atualizar/reload, sem sincronização push entre clientes nesta entrega.
Na Bíblia, a prévia direta prioriza análise contextual existente ou ligação confirmada. Referências
automáticas continuam consultáveis, com fonte e página, mas não são apresentadas como exegese.
Não se cria uma interpretação nova simplesmente por uma nota de outro livro citar o versículo.

## Limites operacionais

As referências de aquisição OPFS já registradas em `source_assets` são preservadas como parte da
proveniência. A leitura efetiva dos originais na instalação resolve o checksum na pasta documents.
O servidor ainda lê um PDF inteiro por requisição, sem suporte a Range; capas são pequenas,
geradas sob demanda e cacheadas. A listagem de fontes primárias ainda abre seus shards para obter
metadados, mesmo quando a aba privada é a inicial. Essas otimizações não requerem reprocessar PDFs.

O snapshot é validado com quick_check/FK/versão e os uploads verificam SHA-256 por PDF.
`workspace.sqlite3.before-index22` preserva um backup SQLite consistente anterior ao índice 022,
incluindo o WAL, criado pelo mecanismo nativo de backup. Não copie o arquivo ativo isoladamente.
O recibo local `data/workspace/migration-receipt.json` registra contagens e o SHA-256 desse backup
(`12bf4b6ff8ae59eda9b5c9283e84f378cf9587f468c259b020bacd416eee0dfe`). O recibo e os
arquivos privados não são versionados no Git.

### Falhas que se resolvem sozinhas (outubro de 2026)

- **Sessões:** recarregar a página reaproveita a sessão que o navegador já tem. Com 256 sessões
  abertas, a mais antiga é esquecida; antes, o servidor recusava novas sessões (429) até ser
  reiniciado.
- **PDF original:** o envio grava num arquivo temporário de nome único, força a gravação no disco e
  só então renomeia; um envio interrompido não deixa mais um `.tmp` que bloqueava aquele livro
  para sempre.
- **Capas:** o `pdftoppm` escreve num nome temporário; um tempo esgotado não deixa uma imagem pela
  metade que seria servida dali em diante.
- **Migração do navegador:** se o Windows (antivírus, OneDrive) segurar um arquivo durante a troca,
  o banco original volta ao lugar e é reaberto com os mesmos PRAGMAs; nunca se cria um banco vazio
  no lugar dele. Dois pedaços enviados para o mesmo offset não são mais anexados os dois.
- **Mensagens de erro:** falhas de arquivo ou de processo ficam no log do servidor; a página recebe
  uma frase simples, sem caminhos do computador.
- **Servidor de desenvolvimento:** o Vite entregava qualquer arquivo do projeto a qualquer página
  em `localhost`, inclusive `data/workspace/` (banco e PDFs) e `livros/`. Agora recusa as duas
  pastas (`server.fs.deny`, repetindo os padrões do Vite); o acervo só sai pela API.
- **Serviço Python:** só responde aos nomes pelos quais é chamado (`127.0.0.1`, `localhost`,
  `semantic-engine`; configurável em `SCRIPTORIUM_ALLOWED_HOSTS`) e só aceita POST em JSON, o que
  barra páginas que tentam DNS rebinding ou POSTs "simples" sem preflight.
- **Docker no Linux:** o Docker cria `./data/workspace` como root e o contêiner roda com uid 1001.
  Antes do primeiro `docker compose up`, rode `sudo chown -R 1001:1001 data/workspace`. No Docker
  Desktop do Windows isso não é preciso.

## Consulta de passagens

A migration 022 adiciona um índice parcial apenas para relações com alvos adicionais não vazios.
A consulta materializa a união dos IDs de alvos primários e secundários antes de aplicar a política
de publicação. O OR antigo impedia usar o prefixo de livro/esquema do índice 019 e fazia a abertura
de um capítulo percorrer as relações da biblioteca. A união elimina duplicatas sem perder escopo,
versificação ou decisões de revisão. O teste de regressão verifica resultados e query plans.

Medição nativa Windows, acervo real: 200 relações de Gênesis 1 em 124 ms na primeira consulta e
91 ms na segunda; camada completa com 200 itens em 184 ms. Não é benchmark absoluto do navegador
ou do bind mount Docker. O índice levou 1.935 ms para ser criado. Rollback aditivo offline: remover
o índice 022 e seu recibo de migration, ou restaurar o backup consistente com o runtime parado;
nunca restaurar o arquivo original sem considerar WAL/SHM. O código novo requer schema 22.

A migration 023 (outubro de 2026) só cria índices nas chaves estrangeiras cuja coluna filha não
tinha índice próprio: membros de lote de revisão, unidades por nó, nós filhos, ligações de perguntas,
relações de citação e destaques. Sem eles, cada exclusão ou cascata varria a tabela filha uma vez
por linha (reprocessar um livro, apagar sua estrutura, montar a auditoria). É aditiva: o rollback é
remover os índices e o recibo da 023. O servidor deixa de ter o número do schema escrito à mão: usa
a maior migration que conhece, tanto para recusar acervos mais novos quanto para aceitar o snapshot
importado do navegador. Todos os escritores precisam ser atualizados juntos, como antes.

Na retomada de 14/10, a mesma camada completa pelo adapter HTTP contra Docker retornou os 200 itens
em 5.440 ms, incluindo serialização e várias requisições. É uma medida diferente da consulta nativa
acima, não uma promessa de abertura instantânea no browser.

## Execução

```powershell
docker compose --profile semantic up -d --build
```

Abra `http://localhost:3000`. Defina `SCRIPTORIUM_PORT=5173` no ambiente do Compose para mudar a
porta publicada, parando Vite antes. Mantenha um runtime ativo por instalação: Vite/Windows e
Docker/Linux nunca podem escrever simultaneamente no mesmo SQLite montado.

### Lock do acervo

Ao abrir a pasta, o servidor cria `workspace.lock` com `open(..., "wx")` antes de tocar no banco e
grava `pid`, `hostname`, `platform`, `startedAt`, `heartbeatAt` e um token de dono. O
`heartbeatAt` é renovado a cada 30 s; o pid não decide nada, porque Windows e o contentor Docker
não veem os processos um do outro.

- Lock existente, independentemente da idade: o segundo processo é recusado e o navegador recebe
  HTTP 423 com “Este acervo já está aberto por outro processo (<host>, desde <hora>). Feche-o antes
  de abrir aqui.”, mostrado na barra de estado e na Biblioteca. A próxima requisição tenta de novo.
- Heartbeat antigo **não autoriza recuperação automática**. Suspensão do Windows, event loop
  ocupado, importação ou query demorada não provam que o dono morreu. Essa política substitui o
  timeout de 2 minutos introduzido em `8c58d9a`, que podia admitir dois donos vivos.
- Locks incompletos/malformados também bloqueiam a abertura. Falha ao renovar ou verificar o
  lock interrompe o acesso, em vez de continuar escrevendo sem exclusividade comprovada.
- `close()`, `exit`, `SIGINT` e `SIGTERM` libertam o lock, mas só se ele ainda pertencer ao
  processo. A API verifica a posse em cada requisição e novamente após a leitura assíncrona de
  comandos/uploads, antes de acessar o armazenamento. Não depende do próximo tick do heartbeat.
- `content:import:contextual` adquire o mesmo lock antes de abrir SQLite e o mantém até fechar a
  conexão, incluindo backup e importação. `--runtime-stopped` não contorna a exclusividade.

Após crash/kill forçado, o arquivo pode permanecer. **Pare todos os Vite, containers e importadores
que usam essa pasta, confirme que não restam conexões e preserve backup antes de recuperar.** Só
então renomeie `workspace.lock` para um nome de diagnóstico único (por exemplo,
`workspace.lock.crash-<data-hora>`) e inicie apenas um runtime atualizado. Não remova/renomeie locks
com um processo vivo, nem confunda `workspace.lock` com o banco ou os arquivos SQLite WAL/SHM.
Não existe endpoint ou flag de force-unlock.

O protocolo é cooperativo: editores SQLite, scripts externos ou imagens antigas que ignoram o lock
não são impedidos pelo arquivo. Atualize **todos os escritores**, inclusive reconstruindo a imagem
Docker, antes de alternar entre Windows e Docker. Não use este mecanismo para compartilhamento NFS
ou operação multi-host; a exclusividade pressupõe criação exclusiva coerente no filesystem local
e no bind mount. Um teste com processos Node separados verifica a recusa do importador; não equivale
a um teste simultâneo em Docker Desktop sobre o acervo real.

No desenvolvimento local, configure `SCRIPTORIUM_WORKSPACE_DIR` em `.env.local` (não versionado).
