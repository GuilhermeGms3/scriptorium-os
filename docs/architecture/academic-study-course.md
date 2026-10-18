# Formação acadêmica por percurso

## Recorte entregue

`/study/course/genesis-1` oferece o primeiro currículo desenvolvido: **Gênesis 1: texto,
contexto e interpretações**. São seis módulos e doze aulas originais em português, com
introdução, conceito, exemplo explicado, discussão e conclusão. A atividade pertence ao módulo.
Há objetivos, pré-requisitos, referências identificadas e síntese final. Não atribuir revisão
acadêmica humana ou exaustividade ao material. Os outros 95 temas continuam introdutórios;
não foram convertidos em cursos completos por esta entrega.

A árvore e Biblioteca celeste permanecem. O curso é acessível em Estudos e em temas relacionados.
A trilha horizontal identifica etapa atual, disponível, bloqueada e realizada. As seis áreas
acompanham o módulo: Conteúdo, Percurso, Leituras, Conexões, Caderno e Vídeos. O corpo distingue
explicação, Escritura, original da fonte, exemplo, metadados e atividade; trechos privados são
agrupados por obra, com quatro escolhas visíveis e apenas uma unidade aberta.

## Conteúdo e fontes

- Currículo: `src/lib/content/study-courses/`, carregado sob demanda. Texto explicativo original,
  com referências externas verificáveis e perspectivas identificadas. Não é transcrição de livros.
- Bíblia: `ScriptureKnowledgeEngine`, intervalo completo, edição selecionável, links para Escrituras
  e Rastro. Confirmação de leitura exige que o texto esteja disponível; falhas têm nova tentativa.
- Acervo: `StudyLibraryRepository.inventory` distingue importação, páginas com texto, estrutura,
  unidades e classificação/revisão. Não afirma que todos os livros foram compreendidos integralmente.
- `loadCourseReadings` reutiliza a camada canônica de conhecimento por passagem. Exclui propostas
  pendentes, unidades vazias e associações sem análise contextual; mantém esquema/obra e intervalo.
  Menções lexicais pertencem ao módulo linguístico. Contexto histórico exige domínio pertinente.
  A seleção utiliza o destino principal da relação: referências secundárias não se tornam comentários
  diretos automaticamente. Não há associação por palavras soltas ou novo processamento de PDFs.
- A finalidade pedagógica acompanha o trecho, com documento, páginas físicas, autoria cadastrada,
  estado de conferência e razão da ligação. Publicado automaticamente não significa revisão humana.
  O leitor de fontes existente abre contexto e captura notas. Página interna zero-based vira
  localizador físico one-based na interface; não se inventa paginação impressa.
- Leituras privadas são complementares: a aula desenvolvida, Bíblia e referências externas permitem
  estudar sem importar livros nem fornecer uma API. A seleção automática ainda exige crítica do leitor;
  não equivale a uma curadoria bibliográfica humana integral de cada parágrafo.
- Vídeos selecionados têm autoria, perspectiva e finalidade. A busca opcional reaproveita YouTube:
  chave apenas na memória da aba, consulta explícita ao Google e nenhuma transmissão de notas/PDFs.

Verificação somente leitura em 18/10/2026: 57 documentos, 51 com texto/unidades. O primeiro módulo
retornou unidades pertinentes de oito obras, entre elas Genebra, Shedd, Catecismo e Comentário ao
Gênesis de Agostinho. Isso descreve o snapshot verificado, não cobertura completa nem revisão humana.

## Progresso e integridade

Modelo em `domain/study-course.ts`, persistência em `StudyCourseRepository`.
Migration **028** é aditiva: `study_course_progress`, chave `(course_id, course_revision, module_id)`.
Não altera notas, estudos, PDFs, propostas, revisões nem histórico. Currículo editorial é versionado
no código; não há FK para uma tabela fictícia de cursos. Alterações substanciais de requisitos
exigem nova revisão de curso; o progresso anterior permanece identificável, sem completar a nova.

Salvar é explícito. Conclusão requer todas as aulas e passagens confirmadas, resposta com mínimo de
80 caracteres e critérios de reflexão marcados. O mínimo valida presença de registro, não qualidade
acadêmica. Não há nota automática nem avaliação de adesão confessional. Módulo posterior só aceita
gravação após concluir os anteriores; conclusão não é revertida por uma edição incompleta.
Versão otimista e guarda transacional impedem sobrescrever progresso concorrente. Conflito conserva
rascunho. Rascunho de caderno impede salvar progresso enquanto estiver pendente, evitando remontagem
que descartaria a nota. Troca de módulo e navegação pedem descarte somente quando há alterações.

Caderno reutiliza grupos e editor existentes. Um grupo do curso é compartilhado; novas notas recebem
vínculos do curso, módulo e passagens. Vínculos `study-course:` passam por Estudos e retornam ao curso/módulo; módulos
ainda bloqueados não são liberados por uma URL. Captura de fontes e de vídeos preserva origem. O explorador
independente de Notas, pastas, wikilinks e conexões permanece com seu contrato anterior.

Exportação/restore v2/v3 aceita `research.courseProgress` opcional, com validação antes da escrita.
Backups antigos sem o campo continuam legíveis. Restore preserva a política existente de inclusão,
sem sobrescrever progresso existente. Worker OPFS, instalação nativa e CLI incluem a migration.

Rollback: manter schema028 e reverter apenas o consumidor é seguro; não remover a tabela com
progresso do usuário. Para voltar todo o banco, usar snapshot validado sob lock exclusivo, conforme
procedimento existente, ciente de que restauração integral volta também outros dados. Nunca executar
DROP automático nem migrar o banco canônico durante QA. A instalação pré026 já exige um backup grande;
essa política anterior não foi alterada. Nesta entrega, migrações foram testadas em bancos descartáveis.

## Verificação

Testes cobrem upgrade27, integridade, gates, IDs inválidos, conflito entre preflight e transação,
backup/compatibilidade e seleção de fontes por contexto. QA em origem isolada5174: leituras reais,
conclusão/desbloqueio, reload, seis abas, captura de nota, rascunho, desktop e móvel. O banco canônico
foi consultado read-only; não foi migrado nem copiado para testar a interface.
