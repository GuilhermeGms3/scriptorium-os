# Motor semântico local

Serviço opcional, executado somente no dispositivo do usuário, para:

- traduzir conteúdo em inglês para português sem substituir o original;
- enriquecer a desmontagem determinística com atribuições, correferências e bibliografia;
- devolver propostas revisáveis por lote, com checkpoint serializável.

O serviço não recebe caminhos de arquivos, não baixa PDFs e não publica conteúdo privado. O navegador
envia apenas as unidades semânticas do lote escolhido para `127.0.0.1:8018`.

## Python

O projeto aceita Python 3.11 a 3.13 e fixa `3.13.3` em `.python-version`. No Windows, `python` pode
continuar apontando para uma instalação antiga; os comandos npm abaixo procuram primeiro a `.venv` e
depois `py -3.13`, evitando depender do `PATH` global:

```bash
npm run semantic:install
npm run semantic:test
npm run semantic:dev
```

Também é possível executar manualmente, a partir desta pasta:

```powershell
py -3.13 -m pip install -e ".[test]"
py -3.13 -m pytest tests -q
py -3.13 -m uvicorn app.main:app --host 127.0.0.1 --port 8018
```

## Contrato contextual

- `GET /v1/analyze/info`: versão e limites do analisador;
- `POST /v1/analyze/batch`: até 200 unidades e 20.000 caracteres por unidade;
- `checkpoint`: estado opaco devolvido ao cliente e persistido no workspace;
- toda saída continua `machine-proposed` até revisão humana no Scriptorium.

O modo contextual é complementar: estrutura, âncoras e propostas determinísticas continuam sendo
calculadas no cliente. Se este serviço estiver indisponível, selecione o modo determinístico no painel
do documento.
