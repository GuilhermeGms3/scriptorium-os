# Build incremental de conteúdo

Cada pacote runtime recebe `buildFingerprint`, calculado de checksums dos inputs relevantes, versão do schema SQLite, versão do importador/parser e configuração material do pacote.

Um artefato só é reutilizado se o fingerprint, a versão do schema e os SHA-256 do monólito e de todos os shards coincidirem. Arquivo ausente ou corrompido força rebuild. Pacotes patrísticos e confessionais têm fingerprints independentes; alterar a Didache não invalida SBLGNT ou WLC/OSHB.

`npm run corpus:index` lista `reused` ou `rebuilt` por edição. O primeiro build após introduzir o fingerprint reconstrói pacotes legados uma vez; builds seguintes sem alteração devem reutilizá-los.

`public/corpus-packages/registry.json` fica fora do Git, como os `.sqlite3` que ele descreve. Os SHA-256
do registro são dos arquivos construídos na própria máquina, e as mesmas fontes, com o mesmo
fingerprint, geram bytes diferentes em outro computador (por exemplo, com outra versão do SQLite do Node). Com o registro versionado, cada `git pull` trazia os
checksums do outro computador: os pacotes locais eram recusados no navegador e o próximo
`corpus:index` reconstruía tudo. `npm run build` e `npm test` geram o registro antes; depois de um
clone, ou de um pull que traga corpus novo, rode `npm run corpus:index` antes de `npm run dev`.
