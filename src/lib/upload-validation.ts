export const MAX_UPLOAD_BYTES = 1_048_576;

export type SupportedFileType = "csv" | "txt";

export interface UploadFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export interface ValidatedUpload {
  fileName: string;
  fileType: SupportedFileType;
  sizeBytes: number;
  content: string;
}

export type UploadValidationCode =
  | "empty"
  | "oversized"
  | "unsupported"
  | "binary"
  | "invalidUtf8";

export class UploadValidationError extends Error {
  readonly code: UploadValidationCode;

  constructor(code: UploadValidationCode, message: string) {
    super(message);
    this.name = "UploadValidationError";
    this.code = code;
  }
}

const allowedMimeTypes: Record<SupportedFileType, ReadonlySet<string>> = {
  csv: new Set(["", "text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"]),
  txt: new Set(["", "text/plain"]),
};

function fileTypeFromName(fileName: string): SupportedFileType | undefined {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension === "csv" || extension === "txt" ? extension : undefined;
}

function containsBinaryControlBytes(bytes: Uint8Array): boolean {
  return bytes.some((byte) =>
    byte === 0
    || (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d)
    || byte === 0x7f
  );
}

export async function validateUpload(file: UploadFile): Promise<ValidatedUpload> {
  const fileType = fileTypeFromName(file.name);
  if (!fileType || !allowedMimeTypes[fileType].has(file.type.toLowerCase())) {
    throw new UploadValidationError("unsupported", "Only CSV and TXT files are supported.");
  }

  if (file.size === 0) {
    throw new UploadValidationError("empty", "The selected file is empty.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(
      "oversized",
      "The selected file exceeds the 1 MiB limit.",
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new UploadValidationError("empty", "The selected file is empty.");
  }

  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(
      "oversized",
      "The selected file exceeds the 1 MiB limit.",
    );
  }

  if (containsBinaryControlBytes(bytes)) {
    throw new UploadValidationError("binary", "Binary files are not supported.");
  }

  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new UploadValidationError("invalidUtf8", "The file is not valid UTF-8.");
    }
    throw error;
  }

  return {
    fileName: file.name,
    fileType,
    sizeBytes: bytes.byteLength,
    content,
  };
}
