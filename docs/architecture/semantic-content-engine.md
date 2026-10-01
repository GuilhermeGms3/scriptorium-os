# Motor semântico de conteúdo

## Objetivo

Transformar documentos privados pesquisáveis em unidades pequenas e auditáveis que possam ser
relacionadas a passagens, disciplinas e, futuramente, entidades do grafo de conhecimento. O motor
não resume um livro inteiro em uma resposta nem converte interpretação em fato.

## Fluxo operacional

```text
PDF privado no OPFS
  -> páginas extraídas no workspace SQLite
  -> segmentos com offsets na página
  -> classificações controladas por domínio
  -> referências bíblicas candidatas
  -> revisão humana
  -> vínculo aceito visível no inspetor da passagem
```

O primeiro analisador é `deterministic-pt-en-1`. Ele separa blocos, conserva offsets e checksum,
reconhece marcadores controlados em português/inglês e resolve referências bíblicas em ambos os
idiomas. Esta camada deliberadamente simples fornece baseline reproduzível para comparar futuros
extratores mais sofisticados.

## Persistência

A migration 010 acrescenta:

- `semantic_document_indexes`: versão, checksum, estado e contagens da execução;
- `semantic_segments`: página, offsets, tipo estrutural, idioma e checksum;
- `semantic_segment_domains`: domínio, evidência textual, método e revisão;
- `semantic_passage_links`: endereço com versificação, relação, método e revisão;
- `local_translations`: cache local por origem, checksum, idioma e modelo.

O texto do segmento não é duplicado: ele é reconstruído pelos offsets da página privada. Exclusão
do documento remove os derivados por foreign keys. Reindexação apaga somente os derivados daquele
documento e recomeça dentro do mesmo workspace local.

## Domínios controlados

Exegese, hermenêutica, teologia, contexto histórico, arqueologia, geografia, crítica textual,
linguística, patrística, liturgia, filosofia da religião, ciência e `other`. Esses rótulos organizam
material; não afirmam autoria, qualidade acadêmica ou concordância com uma tradição.

## Repertórios avaliados

- **Sefaria**: APIs de textos relacionados, tópicos e léxicos inspiram a separação entre texto,
  relação e índice, sem importar sua ontologia como se fosse universal.
- **ETCBC/BHSA + Text-Fabric**: referência forte para features linguísticas hebraicas e consulta em
  grafo; a licença CC BY-NC exige avaliação separada antes de qualquer redistribuição.
- **Open Scriptures morphhb/Strong's**: candidatos para ampliar identidades lexicais e definições,
  sempre por artefato, licença e proveniência.
- **Concord**: referência de engenharia para construir concordância bíblica a partir de fontes
  reproduzíveis.
- Repositórios do próprio usuário: `tsf-career-unified` contribuiu o padrão conceitual
  `SYSTEM_EXTRACTED -> revisão explícita`; `Resume-Matcher`, validação estruturada de saída e
  provider substituível. Nenhum código ou histórico foi copiado automaticamente.

## Próximos incrementos seguros

1. detecção estrutural de capítulos, notas e citações bibliográficas;
2. criação assistida de entidades/conceitos, sempre como candidato revisável;
3. OCR/EPUB local;
4. embeddings opcionais como mecanismo de recuperação, nunca como substituto de proveniência;
5. conexão aceita com Claim/Evidence/Argument por IDs explícitos.
