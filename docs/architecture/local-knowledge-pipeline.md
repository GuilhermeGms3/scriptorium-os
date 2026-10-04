# Pipeline local de livros e conexões — implementação inicial

Extensão do `DocumentKnowledgePipelineService`, não um segundo motor de documentos.
O workspace SQLite/OPFS continua sendo a fonte canônica. O serviço Python contém
somente OCR, inferência e um índice regenerável de textos bíblicos disponíveis.
Não há publicação de livros/trechos privados para Git, servidor remoto ou corpus público.

## Camadas e limites reais

| Camada                | Código entregue                                                                                               | Limite atual                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1. Extração           | pdf.js; PDF original imutável em OPFS; geometria nativa em novas importações; Tesseract TSV em páginas vazias | OCR exige instalação do executável/idiomas; documentos antigos precisam de reimportação para geometria nativa      |
| 2. Estrutura          | árvore e unidades citáveis do motor canônico existente; páginas, offsets UTF-16 e checksums                   | reconstrução de colunas, tabelas e notas complexas ainda heurística; não há Docling/GROBID                         |
| 3. Referências        | parser determinístico existente + resolução contra corpus/edição/esquema                                      | esquema da fonte deve ser confirmado por livro antes de visibilidade automática; nada de alinhar LXX/MT por número |
| 4. Entidades/contexto | entidades, temas, atribuições e bibliografia dos analisadores existentes                                      | não há novo modelo de correferência ou extração bibliográfica neural                                               |
| 5. Candidatos         | FTS5 e embeddings multilíngues globais opcionais em SQLite no companion                                       | indexação vetorial inicial custa inferência; índice regenerável não é backup do workspace                          |
| 6. Reordenação        | união de até 32 candidatos FTS e 24 vetoriais; similaridade cosseno; 8 candidatos enviados ao LLM             | não há cross-encoder treinado/calibrado; busca vetorial exata CPU, sem ANN                                         |
| 7. Inferência         | LM Studio/llama.cpp via API OpenAI-compatible local, JSON Schema, opção de abstenção                          | servidor/modelos/revisões são configuração do operador, não downloads automáticos                                  |
| 8. Validação          | Zod/Pydantic, candidato permitido, edição/esquema e trecho literal com offsets                                | validação estrutural não prova relevância exegética nem verdade teológica                                          |
| 9. Visibilidade       | referências explícitas verificadas podem ficar `machine-visible`; inferências ficam `exception` até auditoria | inferência automática generalizada bloqueada enquanto não houver avaliação/calibração                              |
| 10. Auditoria         | amostra determinística por documento e classe, confirmação/rejeição em lote, revogação por livro              | não é estimativa estatística de precisão; histórico de todas as revisões e feedback de treinamento ainda ausentes  |

## Uso no frontend

Biblioteca → abrir documento → Conhecimento do livro:

1. Importar inclusive PDF escaneado; agora ele permanece disponível para OCR posterior.
2. Recuperar páginas vazias com OCR, escolhendo os idiomas instalados.
3. Desmontar o livro (determinístico ou contextual existente).
4. Verificar serviço local e preparar índice da edição escolhida. Com embeddings
   configurados, esta operação também gera os vetores. Repetir é idempotente por
   checksum + modelo + revisão + receita de embedding.
5. Confirmar a numeração da fonte **somente se verificada**; sem confirmação, todas
   as referências explícitas permanecem nas exceções.
6. Conectar/retomar, opcionalmente com LLM. Pausa cancela requisições do cliente e
   preserva o checkpoint; uma requisição já recebida pelo servidor pode terminar.
7. Examinar amostra/exceções e confirmar ou rejeitar selecionados.

A leitura consulta relações humanas e privadas `machine-visible`, distinguindo-as
visualmente. Afirmações não revisadas não passam a ser “aceitas” por causa de uma
ligação automática. O trecho original da unidade permanece acessível. Os exports
editoriais continuam restritos a propostas humanas e direitos previamente revisados.

## Persistência e retomada

Migration **015** acrescenta `pipeline_jobs`, `pipeline_decisions`,
`pipeline_unit_receipts` e `document_page_layouts`, com FKs e constraints.
As quatro tabelas entram no backup privado v3 como campos opcionais: backups
anteriores continuam legíveis sem alterar seu checksum. O backup existente não
inclui PDF nem texto integral de páginas, mas contém propostas/recibos/trechos de
evidência: trate-o como **privado**, não como material publicável.

Jobs usam fonte, analyzer/revisão, data do índice canônico, edição, política,
confirmação de esquema e configuração de modelos como chave de retomada.
Mudanças invalidam decisões automáticas pendentes. A reconstrução estrutural
apaga derivados em cascata e preserva as revisões de propostas pelo mecanismo
canônico existente; auditorias privadas de ligações derivadas precisam ser refeitas.
Não há ainda lease transacional entre múltiplas abas/processos: execute apenas um
processamento por documento. O painel bloqueia processamento concorrente de
estrutura/conexão dentro da mesma instância; Python serializa OCR/inferência/indexação.

OCR só preenche páginas vazias: jamais desloca spans de texto já analisado.
Texto/layout/checkpoint de OCR são gravados em transação; triggers atualizam FTS.
Eventos de mutação recarregam o inspetor e descartam respostas assíncronas antigas.

O companion guarda `candidates.sqlite` em `~/.scriptorium/semantic-index` ou
`SCRIPTORIUM_PIPELINE_DATA`. Schema versionado 1→2; versões futuras desconhecidas
são recusadas. FTS/vetores são derivados dos corpora habilitados, não dos PDFs.
Vetores usam média normalizada de chunks de 1.800 caracteres, com sobreposição de
200; o texto original nunca é truncado para o LLM. Limites de tokens precisam ser
conferidos para o modelo de embedding escolhido. Uma matriz CPU de uma edição fica
em cache, invalidada após indexação; cerca de 31 mil × 768 × 4 bytes ≈ 95 MB apenas
para a matriz, além do custo de carregamento. Desempenho não foi medido nesta etapa.

## Segurança e falhas

- URLs de modelos/companion exclusivamente loopback, sem credenciais, redirects ou proxy.
- OCR recebe PNG limitado a 8 MiB/20 milhões de pixels, nunca caminho arbitrário.
- Tesseract é chamado sem shell, com arquivo temporário removido ao terminar.
- Uma operação pesada por vez no serviço; timeouts e retomada no cliente.
- SQL parametrizado; a única interpolação gera placeholders de quantidade controlada.
- PDFs e candidatos são dados não confiáveis: não instruções para o modelo.
- Inferências sem evidência literal, fora de candidatos ou sem revisão do modelo são recusadas.
- Não bindar o companion/modelos em `0.0.0.0`; não são serviços autenticados de produção.

## Validação restante

Solicitação desta etapa: código e compilação, com testes funcionais posteriores.
Ainda validar com modelos reais: precisão/abstenção por livro e regra, recall
multilíngue, paginação de scans, layouts difíceis, reinício/retomada, backup
roundtrip com as novas tabelas, cancelamento, consumo de memória e QA no navegador.
Não existe promessa de cobertura de todos os versículos nem de precisão percentual.
