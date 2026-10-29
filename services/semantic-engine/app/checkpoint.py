"""Wire-compatible scalar checkpoint shared by the API and deterministic analyzer."""

from typing import TypeAlias

CheckpointValue: TypeAlias = str | int | float | bool | None
Checkpoint: TypeAlias = dict[str, CheckpointValue]
