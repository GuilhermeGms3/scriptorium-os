# Android 0.3.1 — painel contextual e percurso horizontal

## Escopo

Uma única experiência de leitura, conforme a decisão do usuário: não há perfis culto/estudo.
Mantida a identidade visual nativa escura/bronze, a árvore e o conteúdo instalado. Sem alteração
no desktop, nos livros, no banco canônico, na tradução nem no instalador do acervo.

- Cabeçalho em uma faixa: referência, edição resumida, Painel e menu de edições.
- Acesso flutuante a Ir para…; espaço inferior no conteúdo evita ocultar o fim da leitura.
- Painel pela direita: contexto, ferramentas de texto/língua, fontes/filtros e notas vinculadas.
  Tela inteira no telefone, máximo de 480dp em telas largas. Leitor permanece composto abaixo.
- Número do versículo abre seu contexto; botão Painel acompanha o versículo visível.
- Consulta de notas por IDs exatos de unidades/fontes, parametrizada, sem migration.
- Guias/aulas em sequência horizontal, uma etapa por vez; nenhum parágrafo removido da sequência.
- Cursos divididos em objetivos, seções das aulas, leituras/conexões, atividade e revisão.
  Rascunho salvo antes de navegar por etapas/módulos ou sair pelo retorno do curso.
  Regras existentes de conclusão mantidas; navegação não registra domínio nem conclusão.
- Títulos humanos com dois-pontos preservados; identificadores técnicos continuam ocultos.

## Verificação

Comandos Gradle: `:app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug`.
42 testes JVM passaram; lint com zero erros e 21 avisos de versões/KTX/armazenamento.
Testes novos verificam conservação e ordem dos parágrafos, etapas finais de cada aula,
desbloqueio/retomada, identidade de endereços e intervalos/contexto dos comentários.

No AVD privado Scriptorium_Feedback_QA/API37/porta5560, com o acervo real já instalado:
cinco testes de dados passaram (migração pessoal, backup/links, seed sem sobrescrita,
seleção exata de notas e referências/fontes reais). Atualização instalada por cima;
SHA256 do banco pessoal idêntico antes/depois da instalação:
`723c408ebd30203ea22c965b2de663b0120226af95d39ee4ecc1a5d5febb2734`.

As primeiras execuções de interface encontraram um ANR do SystemUI do emulador,
um nome acessível ausente no botão flutuante e rótulo indevido no título do curso.
Corrigidos os dois problemas do app. A trilha também expôs uma falha de nó semântico
destacado na Surface clicável do Material; usa agora Surface visual e clickable semântico.
O salvamento atualiza o progresso sem desmontar e recarregar a tela inteira a cada etapa.

Os dois cenários nativos passaram juntos em49,058s: salto Sl119:105, quatro abas do painel,
retorno ao texto na mesma posição inclusive após abrir Texto original, comentários/fonte/Voltar/Home/paleta; e 14 etapas do primeiro
módulo, edição da resposta, retorno à etapa, saída com rascunho persistido e sem conclusão
automática. O driver usa ACTION_SET_TEXT sem abrir teclado; foi corrigido para não tratar
um Voltar de navegação como se fosse apenas fechamento do teclado.

Conferência visual adicional do leitor compacto, visão geral/fontes do painel e curso;
guia Bíblia e interpretação abriu9 etapas e avançou da introdução à exegese, mostrando
conteúdo, pergunta e Marcos4. Sem duplicação vertical das outras etapas. Capturas em
arquivos temporários privados, fora do Git.

Acervo manteve ID `b289f600860241228bc119395f56b985bdd8c724a4d8d411c8df7e172e8b701b`
e 3.637.896KiB. A atualização não importou/copiou os livros novamente. Os testes do curso
gravam apenas rascunho de QA no banco pessoal do emulador isolado.

APK final: 183.358.167 bytes, versionCode5, SHA256
`23ff7f4c58e678a09c33b36d58e18409ecc86442dcfed23f9d3772a21060e57e`.
Destino privado: `C:/Users/comical/Desktop/Scriptorium-Android-0.3.1/Scriptorium.apk`.
Instalar por cima do aplicativo existente, sem desinstalar. Sem acervo prévio, usar o kit
completo anterior; este APK não contém os PDFs.

## Limites

Sem teste em aparelho físico/API28, tablet real ou avaliação humana de todas as combinações
de fontes. Notas do painel são as ligadas por source_id às unidades/comentários do aparelho;
não é paridade completa com os contextos e vínculos do desktop. Os guias existentes não
ganharam conteúdo acadêmico novo nesta alteração de interface. Nenhum curso é declarado
concluído pela passagem entre etapas. Entrega só do APK; nenhum novo ZIP do acervo.
