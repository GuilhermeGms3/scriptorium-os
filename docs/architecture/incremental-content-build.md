# Build incremental de conteúdo

Cada pacote runtime recebe `buildFingerprint`, calculado de checksums dos inputs relevantes, versão do schema SQLite, versão do importador/parser e configuração material do pacote.

Um artefato só é reutilizado se o fingerprint, a versão do schema e os SHA-256 do monólito e de todos os shards coincidirem. Arquivo ausente ou corrompido força rebuild. Pacotes patrísticos e confessionais têm fingerprints independentes; alterar a Didache não invalida SBLGNT ou WLC/OSHB.

`npm run corpus:index` lista `reused` ou `rebuilt` por edição. O primeiro build após introduzir o fingerprint reconstrói pacotes legados uma vez; builds seguintes sem alteração devem reutilizá-los.

