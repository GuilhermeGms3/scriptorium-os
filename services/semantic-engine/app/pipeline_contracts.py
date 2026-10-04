"""Validated private pipeline input/output contracts, exposed through FastAPI OpenAPI."""

from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class Address(Contract):
    workId: str = Field(min_length=1, max_length=250)
    bookId: str = Field(min_length=1, max_length=100)
    chapter: int = Field(gt=0, le=500)
    verseStart: int = Field(gt=0, le=500)
    verseEnd: int = Field(gt=0, le=500)
    versificationSchemeId: str = Field(min_length=1, max_length=100)


class Candidate(Contract):
    id: str = Field(min_length=1, max_length=500)
    editionId: str = Field(min_length=1, max_length=250)
    text: str = Field(min_length=1, max_length=10000)
    passage: Address


class IndexBatch(Contract):
    candidates: list[Candidate] = Field(min_length=1, max_length=100)


class IndexResponse(Contract):
    changed: int = Field(ge=0)
    indexed: int = Field(ge=0)


class LinkRequest(Contract):
    unitId: str = Field(min_length=1, max_length=500)
    text: str = Field(min_length=1, max_length=12000)
    editionId: str = Field(min_length=1, max_length=250)
    useLlm: bool = False


class Selection(Contract):
    candidateId: str | None
    evidenceQuote: str = Field(max_length=2000)
    relationType: Literal["discusses", "alludes-to"]
    rationale: str = Field(max_length=2000)


class LinkDecision(Selection):
    candidateId: str
    passage: Address
    editionId: str
    evidenceStart: int = Field(ge=0)
    evidenceEnd: int = Field(gt=0)


class LinkResponse(Contract):
    unitId: str
    retrieval: str
    candidates: list[Candidate] = Field(max_length=8)
    status: Literal["needs-review", "abstained"]
    decision: LinkDecision | None
    model: str | None = None
    modelRevision: str | None = None


class OcrRequest(Contract):
    imageBase64: str = Field(min_length=1, max_length=12000000)
    language: str = Field(default="por+eng", pattern=r"^[a-z]{3}(?:\+[a-z]{3}){0,2}$")


Coordinate = Annotated[float, Field(ge=0, le=1)]


class LayoutBlock(Contract):
    startOffset: int = Field(ge=0)
    endOffset: int = Field(gt=0)
    bbox: tuple[Coordinate, Coordinate, Coordinate, Coordinate]
    kind: Literal["line"]


class OcrResponse(Contract):
    text: str = Field(max_length=200000)
    method: str
    revision: str
    blocks: list[LayoutBlock] = Field(max_length=20000)


class ModelConfiguration(Contract):
    configured: bool
    model: str | None = None
    revision: str | None = None


class PipelineInfo(Contract):
    version: str
    models: dict[str, ModelConfiguration]
    ocrAvailable: bool
    retrieval: str
    automaticInferencePublication: Literal[False]
