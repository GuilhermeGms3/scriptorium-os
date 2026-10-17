# Motor semântico local

Serviço opcional, executado somente no dispositivo do usuário, para:

- traduzir conteúdo em inglês para português sem substituir o original;
- enriquecer a desmontagem determinística com atribuições, correferências e bibliografia;
- devolver propostas revisáveis por lote, com checkpoint serializável.

O serviço não recebe caminhos de arquivos, não baixa PDFs e não publica conteúdo privado. O navegador
envia apenas as unidades semânticas do lote escolhido para `127.0.0.1:8018`.

## Python

A extração offline de comentários originais usa `app.commentary_cli`, com perfis calibrados de
Shedd/Genebra e sem LLM. Requer o extra opcional `commentary` para evidência de fontes do PDF.
Operação, integração canônica, cobertura e limites:
[extração de comentários originais](../../docs/architecture/original-commentary-extraction.md).
Não é um endpoint que recebe caminhos enviados pelo navegador.

O projeto aceita Python 3.11 a 3.13 e fixa `3.13.3` em `.python-version`. No Windows, `python` pode
continuar apontando para uma instalação antiga; os comandos npm abaixo procuram primeiro a `.venv` e
depois `py -3.13`, evitando depender do `PATH` global:

```bash
# Instale uv 0.11.26 (https://docs.astral.sh/uv/getting-started/installation/).
npm run semantic:install
npm run semantic:test
npm run semantic:typecheck
npm run semantic:lint
npm run semantic:benchmark
npm run semantic:dev
```

Também é possível executar manualmente, a partir desta pasta:

```powershell
uv sync --locked --extra test --extra commentary --python 3.13
uv run --locked --extra test --extra commentary pytest tests -q
uv run --locked --extra test --extra commentary ruff check app tests scripts
uv run --locked --extra test --extra commentary mypy --strict app
uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8018
```

`ruff` e `mypy` vêm com as dependências de teste e leem a configuração do `pyproject.toml`
(linhas de 100 colunas; B008 e RUF001 ignorados de propósito).

## Contrato contextual

- `GET /v1/analyze/info`: versão e limites do analisador;
- `POST /v1/analyze/batch`: até 200 unidades e 20.000 caracteres por unidade;
- `checkpoint`: estado opaco devolvido ao cliente e persistido no workspace; guarda a última pessoa
  nomeada e a posição dela (`lastPersonUnit`), porque “Ele afirma…” só é resolvido até 3 unidades
  depois do nome, inclusive entre lotes. O contrato compartilhado aceita somente valores escalares
  (`str/int/float/bool/null`), não objetos aninhados;
- toda saída continua `machine-proposed` até revisão humana no Scriptorium.

A revisão 3 das regras procura o agente só em palavras com maiúscula (com “de/da/do/dos/das/e”),
aceita um complemento entre o nome e o verbo, recusa demonstrativos e documentos como pessoa,
protege abreviaturas (cf., S., Sto., p., v., cap., vol., ed., trad., séc.) antes de dividir frases e
lê autores ABNT com iniciais. O cliente recusa respostas de um serviço com revisão antiga.

O modo contextual é complementar: estrutura, âncoras e propostas determinísticas continuam sendo
calculadas no cliente. Se este serviço estiver indisponível, selecione o modo determinístico no painel
do documento.

## Pipeline de OCR, candidatos e LLM (opcional)

`GET /v1/pipeline/info`, `POST /v1/pipeline/ocr`, `POST /v1/pipeline/index`
e `POST /v1/pipeline/link` são consumidos pelo painel local de cada livro.
`POST /v1/pipeline/search` reutiliza a recuperação híbrida para a opção **Por sentido** da Busca.
Não chama uma LLM geradora. A preparação é explícita por edição e revisão do embedding.
Contrato completo e limites: [arquitetura](../../docs/architecture/local-knowledge-pipeline.md).

Instale Tesseract com os idiomas `por`, `eng` e, para PDFs espanhóis, `spa`.
Use `SCRIPTORIUM_TESSERACT` para indicar o executável quando não estiver no PATH.
Não é preciso instalar llama.cpp se já utilizar LM Studio com API local compatível.

Antes de iniciar `npm run semantic:dev`, configure, por exemplo:

```powershell
$env:SCRIPTORIUM_LLM_URL = "http://127.0.0.1:1234/v1"
$env:SCRIPTORIUM_LLM_MODEL = "identificador-exato-no-servidor-local"
$env:SCRIPTORIUM_LLM_REVISION = "sha256-do-arquivo-de-modelo-utilizado"
$env:SCRIPTORIUM_EMBEDDING_URL = "http://127.0.0.1:1234/v1"
$env:SCRIPTORIUM_EMBEDDING_MODEL = "identificador-do-embedding-multilingue"
$env:SCRIPTORIUM_EMBEDDING_REVISION = "sha256-do-arquivo-de-embedding-utilizado"
```

Substitua os valores ilustrativos; obtenha hashes com `Get-FileHash -Algorithm SHA256`.
Revisões são declaradas pelo operador, não verificadas pelo protocolo OpenAI-compatible:
troque-as ao trocar o arquivo. O servidor precisa implementar `/embeddings` e
`/chat/completions` com `response_format=json_schema`. Sem embedding configurado,
o fluxo usa FTS; sem LLM configurado, recupera candidatos sem inferir.

Os modelos não são baixados/iniciados por esses endpoints. Chamada sem índice,
configuração inválida ou saída não verificável falha de forma recuperável.

## Índice e glossário

`uv.lock` fixa dependências transitivas; Torch usa a distribuição CPU em Windows/Linux. Docker usa
o mesmo lock e uv 0.11.26. CI verifica Python 3.11/3.13 em Windows/Linux; a execução desse workflow
no GitHub deve ser conferida separadamente. A validação local usa Python 3.13.3.

O índice derivado `candidates.sqlite` usa schema 3, vetores BLOB float32 little-endian e NumPy
na recuperação (sem carregar Torch). Migração transacional cria `*.before-v3-*` consistente e
recusa versões desconhecidas. Não altera `workspace.sqlite3`, PDFs ou associações publicadas.
No Docker o índice passa a `/models/semantic-index`, persistido no volume já existente `/models`.
Índices antigos no home efêmero do container não são movidos automaticamente: reindexe a edição.

O arquivo `app/theological-glossary.json` é versionado e editável. Pode ser substituído pelo caminho
local `SCRIPTORIUM_TRANSLATION_GLOSSARY`. Regras são literais, sensíveis a maiúsculas e a limites de
palavra: `LORD` → `SENHOR`, sem mudar `Lord` ou `LORDship`. O fingerprint das regras compõe
`modelRevision`, invalidando o cache exato quando o glossário muda, sem apagar revisões humanas.
Placeholders são verificados; se o Marian os alterar, traduzem-se segmentos circundantes e mantêm-se
os termos protegidos literalmente. Isso pode reduzir a fluência, não autoriza perda de termos.

Detalhes, operação e medições: [busca, vetores e estatísticas](../../docs/architecture/semantic-search-vectors-lexical-statistics.md).
