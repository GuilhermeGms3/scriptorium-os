from __future__ import annotations

import os
from functools import lru_cache

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from .translator import MarianTranslationBackend, TranslationBackend


class TranslationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    text: str = Field(min_length=1, max_length=50_000)
    source_language: str = Field(alias="sourceLanguage", pattern=r"^[A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?$")
    target_language: str = Field(alias="targetLanguage", pattern=r"^[A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?$")


class TranslationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    translated_text: str = Field(alias="translatedText")
    provider: str
    model: str
    model_revision: str | None = Field(default=None, alias="modelRevision")


class ModelInfoResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    provider: str
    model: str
    model_revision: str = Field(alias="modelRevision")


@lru_cache(maxsize=1)
def backend() -> TranslationBackend:
    return MarianTranslationBackend()


app = FastAPI(title="Scriptorium Semantic Engine", version="0.1.0", docs_url="/docs")
origins = os.getenv(
    "SCRIPTORIUM_ALLOWED_ORIGINS",
    "http://127.0.0.1:3000,http://localhost:3000,http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8080,http://localhost:8080",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["content-type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/info", response_model=ModelInfoResponse)
def model_info(translation_backend: TranslationBackend = Depends(backend)) -> ModelInfoResponse:
    return ModelInfoResponse(
        provider="transformers-local",
        model=translation_backend.model_name,
        modelRevision=translation_backend.resolved_model_revision,
    )


@app.post("/v1/translate", response_model=TranslationResponse)
def translate(
    request: TranslationRequest,
    translation_backend: TranslationBackend = Depends(backend),
) -> TranslationResponse:
    try:
        result = translation_backend.translate(
            request.text, request.source_language, request.target_language
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=503, detail="O modelo local não pôde traduzir o trecho.") from error
    return TranslationResponse(
        translatedText=result.translated_text,
        provider=result.provider,
        model=result.model,
        modelRevision=result.model_revision,
    )

