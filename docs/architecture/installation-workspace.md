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

Na retomada de 14/10, a mesma camada completa pelo adapter HTTP contra Docker retornou os 200 itens
em 5.440 ms, incluindo serialização e várias requisições. É uma medida diferente da consulta nativa
acima, não uma promessa de abertura instantânea no browser.

## Execução

```powershell
docker compose --profile semantic up -d --build
```

Abra `http://localhost:3000`. Defina `SCRIPTORIUM_PORT=5173` no ambiente do Compose para mudar a
porta publicada, parando Vite antes. Não execute Vite/Windows e Docker/Linux escrevendo
simultaneamente no mesmo SQLite montado: mantenha um runtime ativo por instalação.
No desenvolvimento local, configure `SCRIPTORIUM_WORKSPACE_DIR` em `.env.local` (não versionado).
