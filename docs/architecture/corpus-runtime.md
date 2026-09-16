# Corpus Runtime

O fluxo efetivo é:

```text
fonte -> ingestão -> normalização -> validação -> pacote SQLite -> repositório -> serviço -> UI
```

Cada edição publicável recebe um banco SQLite próprio, manifesto, checksum SHA-256, tamanho, direitos e proveniência. `CorpusPackageRegistry` distingue disponível, instalado, habilitado e carregado; verifica integridade e só abre a edição solicitada. `SQLiteCorpusStorage` usa SQLite WASM no navegador e mantém o boundary `CorpusStorage`, permitindo um adaptador nativo futuro.

FTS5 indexa texto preservado e uma representação auxiliar normalizada. Grego com ou sem diacríticos, português e formas hebraicas auxiliares podem ser consultados sem modificar o original. O TAGNT é incorporado como alinhamentos e anotações dos tokens SBLGNT; lema e morfologia permanecem campos próprios e Strong é apenas um atributo pesquisável, nunca a identidade lexical.

As migrations vivem em `src/lib/corpus-runtime/migrations/`, ativam chaves estrangeiras e registram versão. A abertura faz `quick_check` e recusa schema incompatível. Consultas e FTS usam parâmetros; a query FTS é transformada em termos literais controlados.

O runtime atual desserializa em memória somente o banco da edição aberta. O pacote SBLGNT+TAGNT atual tem cerca de 253 MB; OPFS/VFS e pacotes ainda mais granulares são uma evolução necessária antes de distribuir conjuntos substancialmente maiores.

Veja também [ADR 0003](../adr/0003-sqlite-local-corpus-index.md).
