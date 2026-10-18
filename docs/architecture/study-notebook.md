# Leitor contextual e caderno de notas

## Uso

1. Nas Escrituras, selecione uma passagem e abra o material da sidebar. Imagens/mapas,
   evidências privadas, trechos de fontes primárias e referências bibliográficas abrem uma
   janela sobre a leitura, sem navegação automática à Biblioteca.
2. Consulte o texto original. Em documentos privados, a página pode ser ampliada/recolhida.
   O carregamento da imagem é independente da extração textual. Uma falha não apaga a nota.
3. Escolha um grupo existente ou crie um grupo temático, escreva uma nota e salve.
   A origem é guardada como identificadores e localizadores, não como cópia automática do livro.
4. Abra **Notas**, na navegação principal. Escolha um grupo, crie pastas/subpastas e abra uma
   página. Cada nota abre em uma aba; trocar de aba preserva o rascunho na memória da tela.
   **Ver mapa de notas** reúne conexões manuais e referências escritas, sem inferir relações.
5. A nota herda a cor do grupo, salvo se **Cor própria** estiver marcada. Alterar a cor do
   grupo não substitui cores individuais. As notas anteriores também podem ser editadas.
6. **Consultar fonte** reabre o material. **Abrir na Biblioteca** é uma ação explícita e
   mantém `page` físico (base 1) e `unit` para o destaque já existente no leitor do livro.

A árvore de formação, guias, perguntas, fontes coletadas e mapa conceitual continuam existindo.
Investigações oferecem um link para as notas do respectivo grupo. As capturas contextuais nos
temas e no leitor continuam disponíveis; o editor completo é um espaço independente em `/notes`.
O endereço antigo `/study?view=notebook` redireciona para ele. A árvore de estudos não foi redesenhada.

## Editor e explorador — versão 27

- O grupo é o agrupamento temático existente (`studies`); não foram duplicados estudos ou notas.
  Notas antigas sem grupo continuam acessíveis em **Todas as notas** e podem receber um grupo.
- Pastas podem conter subpastas. **Organizar pasta** renomeia/move a pasta; a lista **Pasta**, no
  documento, move a nota. Não há exclusão destrutiva de pastas ou notas nesta versão.
- Uma nota compartilhada mantém suas associações anteriores. Selecionar outro grupo no editor
  acrescenta a associação, sem apagar o vínculo com o estudo anterior. A organização é por grupo.
- **Escrever** abre uma página ampla, com título e corpo que cresce durante a escrita; **Ler**
  apresenta títulos, parágrafos, listas simples, citações, código, negrito, ênfase e links internos.
  É um subconjunto seguro de Markdown, não um editor WYSIWYG completo nem o conjunto de plugins
  do Obsidian. HTML e URLs arbitrárias não são executados/renderizados como links.
- **Inserir link**, `/` após espaço/início de texto ou `[[` abre o seletor pesquisável. Setas e
  Enter selecionam; Esc cancela. O texto gerado é `[[note:<id>|Título]]`: o destino acompanha
  renomeações. `[[Título]]` digitado manualmente só resolve quando o título for único; nomes
  ambíguos/inexistentes aparecem como pendência, não como ligação inventada. Código não cria links.
- **Conexões da nota** mostra referências recebidas, links escritos e conexões manuais. Estas
  últimas podem ser acrescentadas/desfeitas sem alterar o corpo. Remover um link do texto remove
  somente sua referência dirigida ao salvar, nunca a ligação manual já desenhada.
- Salvar é explícito: botão **Salvar** ou **Ctrl+S/Cmd+S** dentro do documento. O rodapé distingue
  alterações pendentes e salvas. Fechar uma aba/sair com rascunhos pede confirmação; rascunhos
  não salvos não são persistidos nem recuperados após fechamento forçado do navegador.
- O último grupo escolhido fica como preferência de interface em
  `scriptorium.notes.explorer.v1`; texto, pastas, cores e vínculos continuam exclusivamente no
  SQLite canônico. O celular oferece explorador em janela e acesso direto a Notas na barra inferior.
- Em `/notes`, o shell mantém o mesmo documento montado ao mudar a largura da janela/rotacionar
  o dispositivo; não alterna a subárvore do editor entre o painel desktop e o contêiner móvel.
  O inspetor de passagens e o layout das demais rotas não são alterados.
- A migração **027** acrescenta `note_folders`, `note_placements` e `note_references`. FKs compostas
  impedem pastas/posicionamentos cruzando grupos, índices restringem nomes irmãos e um trigger
  impede ciclos. Não reescreve notas, origens, cores, arestas ou livros existentes.
- O worker OPFS, instalação e CLI usam a versão27. Backup v3 passa a incluir campos opcionais
  `noteFolders`, `notePlacements` e `noteReferences`; backups anteriores continuam aceitos.
  A importação ordena pais antes de filhos e rejeita hierarquia circular antes de gravar.
- Antes de atualizar uma instalação26, exporte o workspace/faça sua cópia operacional usual.
  A027 é aditiva/transacional e não cria outra cópia automática de vários GB: o `VACUUM INTO`
  pré026 descrito abaixo continua restrito àquela atualização. Não executar uma build antiga
  sobre banco27; rollback operacional exige restaurar o backup anterior com escritores parados.

## Limites honestos

- Um registro bibliográfico não equivale a texto integral instalado: a janela identifica essa
  diferença. Um fragmento já disponível pode ser consultado, sem buscar/copiar o livro na web.
- Navegação bíblica e links de conceitos não são interceptados como se fossem arquivos.
- O mapa de notas representa conexões pessoais, não evidências ou conclusões teológicas.
  Não há LLM, revisão acadêmica automática, progresso fictício ou inferência de novas ligações.
- O mapa desenha até 120 pontos por grupo para limitar o custo de SVG. Todas as notas continuam
  disponíveis na lista e no filtro. No celular, somente o mapa tem rolagem horizontal própria.
- O seletor do editor completo oferece notas de todos os grupos, com identificador para distinguir
  títulos iguais. A captura contextual anterior continua limitada ao grupo/tema selecionado.
- A imagem da página usa a rota autenticada da instalação local. Em OPFS sem servidor de
  prévias, permanece a consulta ao texto extraído e à Biblioteca, com indisponibilidade explícita.
- A tradução reutiliza o serviço existente para unidades instaladas em inglês; mantém o original
  e identifica a tradução automática. Este trabalho não adiciona modelos, idiomas ou dependência
  de LLM. O serviço/modelo de tradução precisa estar disponível para uma tradução nova.

## Arquitetura e persistência

- `StudySource` é uma união validada: documento privado + página/unidade, unidade de obra
  primária, ou referência bibliográfica. URLs internas são derivadas dos IDs com encoding.
- `StudySourceService` recupera somente a unidade pedida. Não carrega uma obra inteira para
  abrir um trecho. A língua vem do corpus, inclusive quando não é inglês.
- `ReadingSource` transporta o contexto de abertura e eventuais vínculos de passagem com
  esquema de versificação; não transforma uma associação automática em interpretação revisada.
- Um único `SourceReaderProvider`, dentro do Workbench, gerencia a janela acessível, o retorno
  do foco, o carregamento, os erros e o editor. Imagens revogam seus object URLs ao desmontar.
- `StudyNotebookRepository` usa o mesmo `WorkspaceDatabase`. Não há outro banco, pasta de
  livros, API pública ou storage em localStorage para os novos dados de estudo.
- A migração **026** adiciona `studies.color`, `notes.color`, `notes.source_json` e a tabela
  `note_connections`. Cores são hexadecimais validadas no domínio e no SQLite.
- As arestas têm dois FKs com cascade e chave composta canônica (`source < target`), sem laços
  próprios ou duplicação inversa. Conectar repetidamente é idempotente.
- Salvar/editar nota atualiza nota, vínculos, data do estudo e FTS na mesma transação. Edições
  conferem `updated_at` atomicamente; conflitos deixam o rascunho na tela em vez de sobrescrever.
- Mutations notificam o mecanismo existente de invalidação; o Workbench recarrega notas/estudos,
  e as consultas de conexões usam `useWorkspaceQuery` com refresh de mutations habilitado.
- Fechar a janela, mudar de nota/grupo ou navegar com alterações não salvas pede confirmação.
  Reload/fechamento usa o aviso nativo do navegador; não é autosave de um rascunho.

## Migração, backup e operação

A lista do worker OPFS foi alinhada às migrações 025 e 026, presentes no servidor e CLI.
Nenhuma inicialização WASM/OPFS foi movida para SSR.

Na instalação nativa, antes de atualizar um banco existente anterior à 026, com o lock exclusivo
já adquirido, `VACUUM INTO` produz uma cópia consistente incluindo commits do WAL:
`workspace.before-notebook-v<versão>-<timestamp>-<sufixo>.sqlite3`, ao lado do banco.
É necessário espaço adicional da ordem do banco inteiro; em acervos grandes isso pode levar
tempo. Se o backup falha, a atualização é interrompida antes de alterar o schema. Não apague
essas cópias automaticamente. PDFs continuam na mesma pasta e não são duplicados pelo backup SQL.

Antes de atualizar OPFS, exporte o backup do workspace. As migrations rodam transacionalmente,
mas essa modalidade não cria a cópia nativa descrita acima. Não limpe dados do navegador.

O backup JSON v3 inclui `research.noteConnections`, cores e origem das notas. O campo novo é
opcional na leitura, mantendo checksums de backups anteriores válidos. A importação respeita
a ordem de FKs. A política anterior sobre texto privado/PDFs não foi alterada. O export legado
de `StudyRepository` continua deprecated e não transporta as novas arestas: use o backup v3.

Não execute código antigo sobre um banco 026. Não há downgrade destrutivo automático: restaure
uma cópia anterior, com os processos parados e o lock liberado, somente se realmente necessário,
preservando primeiro notas e modificações posteriores. Reutilize o volume canônico do Docker.

## Verificação

Os testes exercitam migração 025→026, integridade, edição/FTS, conflito de versão, idempotência
das arestas, roundtrip de backup, compatibilidade com backup anterior e leitura limitada de
fontes. O teste da instalação confere o conteúdo e `quick_check` da cópia pré-migração.
O QA visual usa um workspace temporário isolado: nunca um segundo escritor no acervo privado.

Este módulo não reimporta livros nem modifica propostas/revisões da biblioteca.

### Verificação da separação de Notas — 18/10/2026

- 452 testes/69 arquivos passaram, incluindo upgrade26→27, ciclos/FKs, posicionamento,
  referências dirigidas, preservação de arestas manuais, conflito, HTML escapado e roundtrip
  com filhos antes dos pais. O teste da cópia pré026 agora espera a versão atual27 na instalação.
- QA isolado com Playwright (Browser plugin indisponível): criação de grupo/pasta/subpasta,
  duas notas, seletor `[[` por teclado, links/backlinks, troca de abas sem perder rascunho,
  cancelamento do descarte e leitura em1536×1024/390×844. OPFS real preservou texto e pasta
  após reload, sem chamar a instalação. Nenhum conteúdo de teste entrou no acervo original.
- Typecheck, lint completo e build passaram. Na build Node, reinício do servidor manteve as
  notas; redimensionar desktop→celular→desktop preservou o rascunho, e o endereço legado
  redirecionou corretamente. Sessão final sem erros de console ou overflow horizontal global.
- Não há novo endpoint, dependência ou serviço de IA. O Docker do usuário não foi reconstruído.

### Evidência local — 17/10/2026

- Suíte completa: 425 testes em 62 arquivos passaram; os 11 testes específicos do caderno e
  da consulta de fontes também foram executados após o ajuste da validação de backup.
- Typecheck, lint dos arquivos desta entrega e build passaram. Não foram acrescentadas
  dependências. Os avisos informativos do Vite/Node sobre plugin e SQLite experimental permanecem.
- Playwright foi usado porque o Browser plugin não estava disponível. QA em 1440×1000 e
  390×844, inicialmente na build Node e na conferência final em Vite na porta5174, com workspace
  temporário isolado. O banco original foi usado somente em leitura para obter um exemplo.
- Verificados: imagem/página36 do documento, texto original, salvar com origem e passagem,
  aparecer imediatamente em Minhas notas, abrir o caderno sem deixar o modal por cima, editar
  repetidamente, ligar/desligar, herdar cor do grupo sem sobrescrever cor própria, preservar após
  reload/reinício do servidor e impedir navegação descartando rascunho sem confirmação.
- OPFS também foi testado em contexto de navegador isolado sem instalação disponível: grupo e
  nota reapareceram após reload e o diretório OPFS foi confirmado. Backup/restore e FKs foram
  exercitados nos testes de integração, sem apagar o workspace privado.
- No celular, a janela fecha o drawer do inspetor para não empilhar modais; o cabeçalho/fechar
  permanece visível e o atalho para escrever foca a nota. Sem overflow horizontal global ou
  erros de console na sessão limpa final. O mapa possui rolagem horizontal interna intencional.
- Não foi executado um modelo real de tradução, nem reconstruído/substituído o Docker do usuário.
