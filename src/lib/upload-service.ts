import { scanText } from "../detection.ts";
import type { ScanPersistencePayload } from "./scan-persistence.ts";
import { type UploadFile, validateUpload } from "./upload-validation.ts";

export async function prepareUploadForPersistence(
  file: UploadFile,
): Promise<ScanPersistencePayload> {
  const upload = await validateUpload(file);
  const result = scanText(upload.content);

  return {
    fileName: upload.fileName,
    fileType: upload.fileType,
    sizeBytes: upload.sizeBytes,
    classification: result.classification,
    totalFindings: result.totalCount,
    findings: result.findings,
  };
}
