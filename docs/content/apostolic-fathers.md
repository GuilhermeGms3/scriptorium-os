# Pais Apostólicos — corpus legível

O pacote `apostolic-fathers-pd-en-1` contém texto inglês de edições históricas, não traduções modernas:

- **Didache**: Francis Brown e Roswell D. Hitchcock, *The Didache; or, The Teaching of the Twelve Apostles* (1884), Project Gutenberg 42053.
- **1 Clement, 2 Clement, Polycarp to the Philippians, Martyrdom of Polycarp, Barnabas e Diognetus**: Alexander Roberts, James Donaldson e F. Crombie, *The Writings of the Apostolic Fathers* (T. & T. Clark, 1870), Project Gutenberg 77576.

Os arquivos são verificados por tamanho e SHA-256 antes do build. O pipeline separa introduções e notas editoriais do corpo antigo, normaliza Unicode em NFC e cria unidades por capítulo/seção. O endereço usa `work + section` no esquema `scriptorium-document-locator-1`; não inventa endereços bíblicos.

Cada obra possui shard próprio, índice FTS5 compartilhado, navegação no Reader, citação estruturada e notas persistentes ancoradas no `TextUnitId`. Aliases da Didache incluem Didache, Didaquê, Didakhé e Διδαχή.

Limitações: a tradução está em inglês histórico; Inácio, Hermas e Pápias continuam catalogados, mas ainda sem texto integral neste pacote. O corpus não afirma autenticidade, autoria ou data.

