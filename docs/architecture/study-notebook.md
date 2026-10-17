# Leitor contextual e caderno de notas

## Uso

1. Nas Escrituras, selecione uma passagem e abra o material da sidebar. Imagens/mapas,
   evidências privadas, trechos de fontes primárias e referências bibliográficas abrem uma
   janela sobre a leitura, sem navegação automática à Biblioteca.
2. Consulte o texto original. Em documentos privados, a página pode ser ampliada/recolhida.
   O carregamento da imagem é independente da extração textual. Uma falha não apaga a nota.
3. Escolha um grupo existente ou crie um grupo temático, escreva uma nota e salve.
   A origem é guardada como identificadores e localizadores, não como cópia automática do livro.
4. Em **Estudos → Caderno de notas**, selecione o grupo. Cada nota é um ponto; selecione-a,
   escolha outra nota em **Ligar a outra nota** e clique em **Conectar**. A ligação aparece
   nos dois sentidos e pode ser desfeita com **Desligar**.
5. A nota herda a cor do grupo, salvo se **Cor própria** estiver marcada. Alterar a cor do
   grupo não substitui cores individuais. As notas anteriores também podem ser editadas.
6. **Consultar fonte** reabre o material. **Abrir na Biblioteca** é uma ação explícita e
   mantém `page` físico (base 1) e `unit` para o destaque já existente no leitor do livro.

A árvore de formação, guias, perguntas, fontes coletadas e mapa conceitual continuam existindo.
O workspace de cada investigação também contém o caderno do respectivo grupo. A antiga
caixa simplificada de criação de notas foi substituída pelo editor do caderno, não duplicada.

## Limites honestos

- Um registro bibliográfico não equivale a texto integral instalado: a janela identifica essa
  diferença. Um fragmento já disponível pode ser consultado, sem buscar/copiar o livro na web.
- Navegação bíblica e links de conceitos não são interceptados como se fossem arquivos.
- O mapa de notas representa conexões pessoais, não evidências ou conclusões teológicas.
  Não há LLM, revisão acadêmica automática, progresso fictício ou inferência de novas ligações.
- O mapa desenha até 120 pontos por grupo para limitar o custo de SVG. Todas as notas continuam
  disponíveis na lista e no filtro. No celular, somente o mapa tem rolagem horizontal própria.
- O primeiro editor de conexões oferece notas do mesmo grupo. Uma nota previamente compartilhada
  entre estudos mantém seus vínculos; não há fusão automática de grupos.
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
