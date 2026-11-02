# Edições privadas e fontes de referência — novembro de 2026

## Fluxo efetivamente utilizado

As edições fornecidas pelo usuário entram no mesmo `data/workspace/workspace.sqlite3`
da biblioteca, comentários, estudos e notas. Não são pacotes públicos nem um segundo
banco. Os PDFs originais, hashes e páginas extraídas são preservados.

1. `process-library-queue.ts --checksums ... --extraction-only` extrai somente os
   documentos selecionados. Não aplica o analisador genérico aos novos comentários.
2. `app.private_bible_sources` lê geometria PDF.js, títulos e marcadores de verso,
   separando as cinco colunas da compilação multiversões.
3. Apenas sequências de capítulo completas, contínuas e dentro dos limites
   cadastrados seguem para staging. Capítulos ambíguos ficam no relatório.
4. `import-private-scripture.ts` valida trechos literais e offsets UTF-16 antes de
   inserir, usando o lock exclusivo da instalação e transações de até 100 unidades.
5. `ScriptureRepository` consulta essas unidades por capítulo, reúne o ViewModel
   de leitura/comparação e expõe edições, áudio e busca FTS. Os componentes existentes
   recebem dados reais, sem trocar o design do leitor.

O ID textual é derivado da edição e evidência; o endereço bíblico é uma associação
separada, com esquema da fonte, método e revisão. A conferência estrutural não prova
equivalência semântica entre versificações: o Reader informa alinhamento `partial`.
Não existe alinhamento palavra a palavra nestas novas traduções.

## Persistência, segurança e migração

Migration aditiva **29**:

- `private_scripture_editions`: título, sigla, língua e posição editorial;
- `private_scripture_units`: identidade, edição, documento, endereço, esquema,
  mapping, texto, SHA-256 e fragmentos;
- `private_scripture_fts`: FTS5 externo, índices de capítulo/documento e triggers.

FKs restringem exclusões de documentos/edições referenciados; endereço duplicado
por edição é recusado. Reimportação idêntica reutiliza unidades; mudança de texto,
evidência, edição ou endereço no mesmo ID exige revisão explícita. Nenhum registro
anterior é sobrescrito silenciosamente.

O rollback operacional é voltar o código somente mantendo um runtime compatível
com schema 29, ou restaurar um snapshot consistente com os escritores parados.
Não há migration de downgrade nem `DROP` automático destas tabelas.

Chamadas do repositório privado durante SSR retornam vazio sem inicializar SQLite
WASM/OPFS. No cliente, o runtime existente escolhe instalação ou navegador.
O evento `scriptorium:knowledge-changed` invalida os caches de capítulos/unidades.
Nenhuma configuração de target de produção ou porta foi alterada nesta entrega.

O backup JSON estrutural leva **metadados das edições**, não seus textos protegidos
nem PDFs. Restaurar esse JSON sozinho exige reimportar as fontes. Um snapshot
SQLite completo conserva os textos; os arquivos originais continuam na instalação.
Não confundir Git, imagem Docker, backup estrutural e transporte do acervo.

## Notas, introduções e remissões

`app.annotated_bible_sources` produz o contrato contextual já usado pelo Reader:

- **TEB:** mapa calibrado da página física 50, marcadores de nota separados do texto
  bíblico; remissões internas não escolhem o destino principal. Lote inicial,
  não extrator validado para todas as 2.492 páginas.
- **LTT:** referência explícita no início da nota, com posição editorial
  Texto Tradicional/Textus Receptus e preservação verbal identificada na fonte.
- **Ave-Maria:** notas ao final de cada livro, usando cabeçalhos tipográficos para
  reiniciar o contexto. Cabeçalhos desconhecidos não herdam o livro anterior.
  Passagens com versificação ainda não resolvida ficam em exceções.

Os trechos são originais da fonte, não sínteses inventadas. São propostas automáticas
visíveis conforme a política contextual existente, com auditoria pendente. A marca
`machine-proposed` não equivale a revisão humana ou consenso teológico.

## Anchor EPUB

O EPUB fornecido tem XHTML malformado e referência de capa ausente. O operador
`prepare-anchor-epub.py` recupera texto inerte com a biblioteca padrão, ignora scripts,
valida caminhos ZIP/tamanho descompactado e gera um PDF de consulta com ReportLab.
O extra opcional `reference` está fixado no `uv.lock`; não é necessário ao servidor
de tradução nem ao leitor normal.

**Uma página do derivado corresponde a um item XHTML do EPUB**, não a uma página
impressa. O original fica em `originals/<sha>.epub`; o derivado e sua proveniência
identificam origem, checksum e receita. Ilustrações do EPUB não foram transpostas
para esse derivado textual; permanecem no arquivo original.

`app.reference_source_entries` confirma o sufixo do cabeçalho no índice de artigos,
classifica pessoa/lugar/conceito e publica `studyContext.referenceEntry` com
`extent: page-local`. São leituras nos estudos de história/fontes/geografia,
não lemas gregos/hebraicos nem lugares georreferenciados.

Referências bíblicas explícitas usam `relationType: cites` e
`referenceRole: lexical-mention`. A apresentação contextual existente as mantém
como obras de referência/fontes, sem promovê-las a comentário direto do versículo.

## Operação reproduzível

Pare o escritor legítimo antes dos importadores. Não remova um lock por idade.
Os operadores recusam banco ausente e aceitam reutilizar um snapshot existente
por `--reuse-backup <arquivo>`, evitando cópias completas repetidas.

```powershell
# Raiz do repositório; staging novo, nunca misturar resultados de versões antigas.
cd services/semantic-engine
.venv/Scripts/python.exe -m app.private_bible_sources ../../data/workspace/workspace.sqlite3 ../../data/workspace/novo-staging --root ../..
.venv/Scripts/python.exe -m app.annotated_bible_sources ../../data/workspace/workspace.sqlite3 ../../data/workspace/novas-notas --root ../..
cd ../..
npx tsx scripts/content/import-private-scripture.ts data/workspace/workspace.sqlite3 data/workspace/novo-staging --runtime-stopped --reuse-backup <snapshot-existente>
npm run content:import:contextual -- data/workspace/workspace.sqlite3 data/workspace/novas-notas/<prefixo-sha> --runtime-stopped --reuse-backup <snapshot-existente>
# Reimportação somente leitura: troca --runtime-stopped por --verify.
```

Consulte [resultado e cobertura do lote](../qa/private-bibles-2026-11-02.md).
