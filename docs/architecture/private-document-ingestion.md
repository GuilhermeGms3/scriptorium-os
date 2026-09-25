# Ingestão local de documentos privados

## Estado atual

O Scriptorium ingere **PDFs privados que possuam camada textual**. O arquivo original permanece no
OPFS do navegador e o texto extraído é persistido por página no SQLite privado do workspace, com
índice FTS5. A Biblioteca e a busca global conseguem localizar os trechos e abrir a página física
correspondente.

EPUB, imagens e OCR ainda não foram implementados. Um PDF composto apenas por imagens é recusado
com uma mensagem explícita, sem fingir que foi indexado.

## Objetivo

Permitir que o proprietário de um livro legalmente obtido construa, no próprio dispositivo, um
índice privado e citável para pesquisa pessoal. O arquivo e o texto extraído não devem ser enviados
para um servidor nem incorporados aos pacotes redistribuíveis do projeto.

## Pipeline implementado

```text
arquivo privado
  -> identificação de formato e checksum
  -> extração de texto por página
  -> identificação das páginas sem camada textual
  -> normalização sem apagar o original
  -> blocos citáveis (página, seção e offsets)
  -> índice FTS local
  -> pesquisa no leitor privado e na busca global
  -> ligações humanas futuras com passagens, entidades, claims e estudos
```

Cada página mantém:

- ID determinístico derivado do checksum do documento e da localização;
- número físico e rótulo da página;
- texto extraído e referência ao artefato original;
- idioma, método de extração e contagem de itens textuais;
- proveniência de qualquer resumo, claim ou ligação criada posteriormente.

Os IDs são derivados do SHA-256 do arquivo e do índice da página. Reimportar o mesmo PDF é
idempotente: o registro existente é reutilizado.

## Limites de direitos e segurança

- Documento privado e derivados ficam separados dos corpora redistribuíveis.
- Exportação do workspace não inclui o arquivo nem o texto integral protegido. Depois de restaurar
  um backup em outro navegador, documentos privados precisam ser reimportados a partir do original.
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

## Persistência

- `private_documents`: manifesto local, checksum, contagem de páginas e método de extração;
- `private_document_pages`: texto citável por página;
- `private_document_pages_fts`: índice FTS5 separado dos pacotes públicos;
- `source_assets`: referência ao PDF armazenado no OPFS;
- `bibliographic_sources`: registro visível na Biblioteca, marcado como privado e não
  redistribuível.

## Entregas futuras

1. fila local de OCR recuperável para páginas sem camada textual;
2. seleção de trechos e criação direta de citações/links para estudos;
3. identificação estrutural de cabeçalhos, notas e seções;
4. exportação privada opcional e criptografada dos documentos;
5. importadores EPUB e imagem depois da validação continuada do pipeline de PDF.
