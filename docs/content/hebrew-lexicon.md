# Léxico hebraico e morfologia OSHB

O build fixa o TBESH no commit STEPBible `efe428a0047bf7b9c3ce2624f60c252c6e435945` e verifica SHA-256 `464dccadd95fd8620dd05fa0d7a4caba58ec3c4d5db3ebf38e43d046ca25b591`.

O repositório é apresentado como CC BY 4.0, porém o próprio cabeçalho do arquivo informa que as definições derivam do Abridged BDB da Online Bible e pede permissão antes de aplicá-las em um projeto. O pacote aberto importa identificadores Strong/Extended Strong, lema, transliteração, classe abreviada e **gloss curto**. O campo de definição longa é excluído e a proveniência registra `definitionExcludedForRights: true`.

O Word Inspector consulta esses verbetes pelo SQLite. Um gloss pertence ao lexema; ele não é desambiguação automática do sentido de uma ocorrência.

O decoder morfológico segue a gramática posicional publicada pelo OSHB e preserva o código original. Expõe idioma, categoria, subtipo, pessoa, gênero, número, estado, stem, aspecto, prefixos e sufixos quando presentes. Valores desconhecidos permanecem `unmapped`. A especificação fixada é `parsing/Oshm.xml`, SHA-256 `5e558dd4729e5c06165df839dcf3f9d1ab71e9f06c5b63a5e1568637b73070e8`.

