FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/models/huggingface

WORKDIR /app

RUN groupadd --system --gid 1001 scriptorium \
    && useradd --system --uid 1001 --gid scriptorium --create-home scriptorium

COPY pyproject.toml ./
COPY --chown=scriptorium:scriptorium app ./app
RUN pip install --no-cache-dir .

USER scriptorium
EXPOSE 8018

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8018/health', timeout=3)"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8018"]

