export class CorpusNotInstalledError extends Error {
  override readonly name = "CorpusNotInstalledError";
}
export class TextUnitNotFoundError extends Error {
  override readonly name = "TextUnitNotFoundError";
}
export class VersificationMismatchError extends Error {
  override readonly name = "VersificationMismatchError";
}
export class CrosswalkNotFoundError extends Error {
  override readonly name = "CrosswalkNotFoundError";
}
export class AmbiguousPassageError extends Error {
  override readonly name = "AmbiguousPassageError";
}
export class InvalidAnchorError extends Error {
  override readonly name = "InvalidAnchorError";
}
export class StorageUnavailableError extends Error {
  override readonly name = "StorageUnavailableError";
}
export class UnsupportedDatabaseVersionError extends Error {
  override readonly name = "UnsupportedDatabaseVersionError";
}
export class CorruptDatabaseError extends Error {
  override readonly name = "CorruptDatabaseError";
}
export class SourceNotFoundError extends Error {
  override readonly name = "SourceNotFoundError";
}
export class DuplicateSourceError extends Error {
  override readonly name = "DuplicateSourceError";
}
export class CitationNotFoundError extends Error {
  override readonly name = "CitationNotFoundError";
}
export class InvalidLocatorError extends Error {
  override readonly name = "InvalidLocatorError";
}
export class ImportValidationError extends Error {
  override readonly name = "ImportValidationError";
}
export class PackageIntegrityError extends Error {
  override readonly name = "PackageIntegrityError";
}
export class PackageUnavailableError extends Error {
  override readonly name = "PackageUnavailableError";
}
export class WorkspaceMigrationError extends Error {
  override readonly name = "WorkspaceMigrationError";
}
