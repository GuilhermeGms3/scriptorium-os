# Android 0.5.2 — textos adicionais e localização de títulos

## Diagnóstico e implementação

O filtro Apócrifo só considerava textos extras, excluindo todos os livros que tivessem
capítulos bíblicos. O pacote-base já continha 15 obras adicionais em português na Bíblia
Portuguesa Mundial, entre elas Judite, Macabeus e Daniel Grego. O catálogo de metadados do
APK cobria apenas os 66 livros da Bíblia Livre. A busca usava `display_address` original
em inglês, mesmo com a interface em português.

O gerador agora inclui os 85 livros distintos presentes nas três coleções do desktop,
com rótulos portugueses e tags de filtro. Textos adicionais não são declarados não canônicos
para todas as tradições; a tela explicita a variação de cânon. Livros mantêm edição, obra,
esquema, referências e conteúdo originais. A busca normal e semântica apresenta referências
com o título localizado. A leitura restaurada também atualiza o título de apresentação.

As 19 obras estruturadas têm títulos portugueses, inclusive Tomé; os cabeçalhos de suas
edições receberam rótulos de apresentação. O texto copta de Tomé continua copta.
Títulos bibliográficos originais de PDFs privados não foram traduzidos automaticamente.

O Evangelho de Judas foi localizado por uma página com cabeçalho explícito no volume
Nag Hammadi III, página física313. A entrada só existe se essa página estiver realmente
instalada e abre a evidência, em espanhol. Não é uma edição de corpus inventada. Entradas
documentais de Nag Hammadi não são automaticamente apresentadas como textos integrais.

## Complemento sem duplicação do acervo

`scripts/mobile/add-corpus-editions.ts` aceita um manifesto-base e edições registradas,
preserva todos os arquivos/edições e gera um delta autenticado pelo instalador existente.
Rejeita edição desconhecida, caminho já usado e pedido sem adições. Não lê nem escreve
o banco pessoal. O instalador distingue complemento de pacote completo na mensagem.

Entrega privada em `C:/Users/comical/Desktop/Scriptorium-Android-0.5.2`:

- Base exigida: `b289f600860241228bc119395f56b985bdd8c724a4d8d411c8df7e172e8b701b`.
- Geração: `7a5aab7a2cefd4d716ce501a2f524ec36c8f2820325b5d54587ca3623f19379b`.
- Delta de 15.654.404 bytes, apenas manifesto + corpus King James de 147.034.112 bytes.
- Reutilização confirmada no emulador: 75 arquivos antigos compartilhados, um arquivo novo.
- São acrescentadas quatro obras distintas à navegação: Susana, Bel e o Dragão, Cântico
  dos Três Jovens e Adições a Ester. O corpo desses livros está em inglês, como na fonte.
- Os 57 PDFs não são copiados novamente. O APK isolado corrige filtros/títulos/Judas,
  mas o corpus King James exige também importar `acervo.scriptorium` ou executar o instalador.

## Verificação

- Build Android, testes JVM e lint: aprovados; 53 testes, zero erros e22 avisos de lint existentes.
- Typecheck, ESLint/Prettier focados: aprovados. Testes móveis TS:12 em4 arquivos aprovados.
- Dois cenários de dados reais: seis capítulos adicionais, Tomé em português, página de Judas
  e referências localizadas; referências bíblicas/fontes antigas preservadas (2,989s).
- Dois cenários de interface: filtro Apócrifo abre Judite1 e Judas no volume real; busca
  abre o capítulo/versículo correto após restauração e no mesmo capítulo (40,367s).
- `git diff --check`: aprovado. Sem alteração no desktop, schema pessoal, PDFs ou texto-fonte.
- Instalado e validado no emulador isolado. No Samsung SM-S906E, APK0.5.2/code10 e geração
  de acervo confirmados por ADB após execução do instalador. Índice de arquivos confirmou
  75 caminhos anteriores reutilizados e somente um arquivo novo. Os testes que gravam
  dados de QA foram executados exclusivamente no emulador.
- SHA256 do APK entregue: `79deaad8e888811228efebc5a9074e88c20235c3fad644b4854cc79f85a2ec6e`.
