# Fila local de incorporação da biblioteca

Worker Node 22+ independente do chat e do navegador, sem LLM ou API externa. Reutiliza
`PrivateDocumentRepository`, `DocumentKnowledgePipelineService`, perfis, papéis e
`LocalKnowledgePipelineService`. Nenhum segundo motor de conhecimento ou banco paralelo.

## Operação

Na raiz, com runtimes que escrevem no acervo parados:

```powershell
npm run library:enqueue -- data/workspace/workspace.sqlite3 "C:/Users/comical/Documents/Livros do Scriptorium"
powershell -NoProfile -File scripts/content/start-library-queue.ps1
npm run library:status -- data/workspace/workspace.sqlite3
```

No Linux/macOS, rode `npm run library:run -- data/workspace/workspace.sqlite3` em um gerenciador
de processos da sua escolha. O helper Windows inicia um processo oculto separado e informa PID/logs.
O processamento continua sem tokens do Codex enquanto o computador/processo estiverem ativos.
Não há inicialização automática após reboot. Para retomar, execute o helper novamente.
O helper aguarda até quatro horas a liberação normal de outro dono da fila/acervo, sem roubar
locks. `-RetryFailed` também retoma falhas com menos de três tentativas; não instala OCR nem
altera formatos bloqueados. Sem essa opção, falhas ficam para correção e `library:retry` explícito.

```powershell
npm run library:pause -- data/workspace/workspace.sqlite3
# Aguarda terminar o documento atual e libera o acervo. Não mate processos nem remova locks vivos.
npm run library:retry -- data/workspace/workspace.sqlite3
# Recoloca somente falhas na fila; depois execute o helper/run novamente.
```

`enqueue` é um snapshot explícito dos PDFs/EPUBs da pasta, sem monitoramento automático.
SHA-256 elimina duplicatas binárias e documentos já registrados. Mesmo título com bytes diferentes
não é deduplicado semanticamente. O arquivo original é revalidado antes de cada incorporação.
EPUB é registrado como bloqueado; não é convertido nem dado como processado.

## Etapas e persistência

1. Assinatura PDF, checksum e limites de 256 MiB/5.000 páginas/50 milhões de caracteres.
2. Cópia privada verificada do original, com temporário + fsync + rename.
3. PDF.js preserva texto, página e geometria dos itens, sem executar JavaScript/eval do PDF.
4. Importação transacional pelo repositório, incluindo FTS e proveniência privada.
5. Classificação documental, desmontagem determinística em lotes retomáveis de 50 páginas,
   anotações de papéis e propostas de ligações pelo motor existente.
6. Registro de referências explícitas para revisão. **Versificação não confirmada** nesta fila:
   `sourceSchemeConfirmed=false`, sem autoaprovação ou inferência LLM. As referências não são
   promovidas a comentários originais e uma menção não se transforma em exegese.

Páginas vazias permanecem com OCR pendente; o worker não instala nem roda OCR automaticamente.
Documento inteiramente sem texto tem o original incorporado, mas falha a etapa textual com motivo
explícito. Falhas individuais não impedem os demais PDFs. `retry` permite tentar novamente depois
da correção; não há retry infinito. `running` interrompido é retomável na próxima execução.

Os dados continuam no SQLite canônico e em `documents/`. `library-import-queue/queue.json` contém
somente a fila/recibos operacionais, nunca texto dos livros ou um banco de conhecimento concorrente.
Gravação atômica com fsync, lock próprio e estado por documento/etapa. Os checkpoints de análise
continuam nas tabelas canônicas; extração interrompida antes do import é refeita para aquele PDF.

O worker adquire o **mesmo lock exclusivo** de Vite/Docker antes de abrir SQLite, verifica posse
nas operações e cria um backup consistente antes do primeiro documento de cada novo conjunto.
Enquanto processa, o front que tentar abrir esse mesmo acervo pode receber 423: é manutenção
offline, não um segundo escritor escondido. Pause a fila e aguarde a liberação para usar o acervo.
Lock após crash exige inspeção offline; nunca há takeover automático por idade do heartbeat.

Logs, fila, PDFs, banco e backups ficam em `data/workspace`, ignorados pelo Git/imagem Docker.
Recarregue a Biblioteca após o worker terminar; não há push de mutations para navegadores externos.
Código atualizado não transfere dados a outro computador por Git.

## Limites

Concluído significa **incorporado + estrutura + propostas determinísticas**, não leitura editorial
integral ou interpretação certificada. Perfis especializados de comentários/sermões/léxicos ainda
exigem calibração própria; as novas fontes não usam automaticamente os perfis Shedd/Genebra.
Arquivos malformados que travem o parser podem exigir intervenção no processo; limites de tamanho
e checkpoints não substituem isolamento de parser/timeout de subprocesso, ainda não implementados.
