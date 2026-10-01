# Tradução local inglês → português

## Limite arquitetural

O tradutor é um serviço Python opcional e local. Ele não faz parte do SSR, do bundle Vite nem do
target Cloudflare/Lovable. A aplicação envia apenas o trecho solicitado pelo usuário para
`127.0.0.1:8018`, preserva o original e grava a resposta no workspace OPFS/SQLite como
`machine-generated`.

O backend padrão usa `Helsinki-NLP/opus-mt-tc-big-en-pt` com Transformers. É um modelo dedicado
inglês→português, publicado sob CC BY 4.0. Não existe no repositório configuração comprovada de um
modelo chamado “Premier 18” ou de 18 bilhões de parâmetros; o nome e a revisão do modelo são
configuráveis para não cristalizar uma suposição.

Antes de consultar o cache, o cliente lê `GET /v1/info` e obtém provider, modelo e revisão efetivos.
Por isso, trocar uma revisão não reutiliza silenciosamente uma tradução produzida por outra. Uma
entrada antiga ainda pode ser usada como fallback somente quando o serviço local está indisponível.

## Execução

```bash
docker compose --profile semantic up --build
```

O primeiro uso baixa o modelo para o volume `semantic-model-cache`. A aplicação continua utilizável
sem o perfil: nesse caso o botão informa que o tradutor local está indisponível.

Variáveis:

- `VITE_SEMANTIC_ENGINE_URL`: URL consumida pelo navegador; padrão `http://127.0.0.1:8018`;
- `SCRIPTORIUM_TRANSLATION_MODEL`: modelo Hugging Face carregado pelo serviço;
- `SCRIPTORIUM_TRANSLATION_MODEL_REVISION`: revisão opcional para pin estrito;
- `SCRIPTORIUM_ALLOWED_ORIGINS`: origens locais autorizadas por CORS.

## Garantias

- somente `en` → `pt` no backend atual;
- requisição limitada a 50 mil caracteres;
- textos maiores que a janela do modelo são divididos recursivamente por tokens, sem truncamento;
- nenhum download de URL arbitrária ou execução de código remoto (`trust_remote_code=False`);
- cache inclui checksum do original, modelo e revisão efetiva;
- tradução automática não é apresentada como edição acadêmica ou revisada;
- unidades privadas só entram na tradução em lote depois de terem alguma proposta aceita, e cada
  tradução precisa ser marcada separadamente como revisada por humano;
- textos copta, grego e hebraico não são enviados ao tradutor por detecção implícita.
