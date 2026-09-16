# Ingestão local de documentos privados

## Estado atual

O Scriptorium ainda **não ingere o conteúdo de PDF, EPUB ou imagens**. A Biblioteca atual persiste
metadados bibliográficos, citações e notas. Um arquivo adicionado como referência não é desmontado,
indexado nem ligado automaticamente a passagens.

Este documento define o limite arquitetural do recurso futuro sem apresentar uma interface que
sugira uma capacidade inexistente.

## Objetivo

Permitir que o proprietário de um livro legalmente obtido construa, no próprio dispositivo, um
índice privado e citável para pesquisa pessoal. O arquivo e o texto extraído não devem ser enviados
para um servidor nem incorporados aos pacotes redistribuíveis do projeto.

## Pipeline proposto

```text
arquivo privado
  -> identificação de formato e checksum
  -> extração de texto por página
  -> OCR somente nas páginas sem camada textual
  -> normalização sem apagar o original
  -> blocos citáveis (página, seção e offsets)
  -> índice FTS local
  -> ligações humanas com passagens, entidades, claims e estudos
```

Cada bloco precisa manter:

- ID determinístico derivado do checksum do documento e da localização;
- número físico e rótulo impresso da página, quando existirem;
- offsets no texto extraído e referência ao artefato original;
- idioma, método de extração e qualidade estimada do OCR;
- distinção entre texto do autor, nota de rodapé, cabeçalho e metadado;
- proveniência de qualquer resumo, claim ou ligação criada posteriormente.

## Limites de direitos e segurança

- Documento privado e derivados ficam separados dos corpora redistribuíveis.
- Exportação do workspace não inclui automaticamente o texto integral protegido.
- O usuário informa a base de uso e a permissão de redistribuição; o sistema não presume domínio
  público.
- Parsers devem limitar tamanho, validar tipo real do arquivo e executar sem macros, JavaScript ou
  anexos incorporados.
- OCR e futuros modelos locais não transformam uma inferência em fonte: conteúdo derivado continua
  marcado como assistido por máquina até revisão humana.

## Integração com o conhecimento

O índice encontra trechos; ele não deve gerar automaticamente uma enciclopédia tratada como fato.
O fluxo correto é:

1. pesquisar o texto extraído;
2. abrir o trecho na página original;
3. criar uma citação com âncora exata;
4. relacionar a citação a uma passagem, pergunta ou claim;
5. registrar se a interpretação é humana, assistida por máquina ou revisada.

## Entregas futuras

1. armazenamento privado de artefatos e manifestos;
2. extrator de PDF com páginas e offsets preservados;
3. fila local de OCR recuperável;
4. FTS privado separado dos pacotes públicos;
5. leitor de documento com citação e ligação a estudos;
6. importadores EPUB e imagem somente depois de validar o pipeline de PDF.
