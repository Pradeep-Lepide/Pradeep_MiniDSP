import type { Finding, Risk } from "../detection.ts";

export interface ScanPersistencePayload {
  fileName: string;
  fileType: "csv" | "txt";
  sizeBytes: number;
  classification: Risk;
  totalFindings: number;
  findings: Finding[];
}

export interface AtomicScanRpcArguments {
  p_file_name: string;
  p_file_type: "csv" | "txt";
  p_size_bytes: number;
  p_classification: Risk;
  p_total_findings: number;
  p_findings: Finding[];
}

interface RpcResult {
  data: string | null;
  error: { message: string } | null;
}

export type AtomicScanRpc = (arguments_: AtomicScanRpcArguments) => Promise<RpcResult>;

export class ScanPersistenceError extends Error {
  constructor() {
    super("The scan could not be saved.");
    this.name = "ScanPersistenceError";
  }
}

export async function persistScanAtomically(
  invokeRpc: AtomicScanRpc,
  payload: ScanPersistencePayload,
): Promise<string> {
  const result = await invokeRpc({
    p_file_name: payload.fileName,
    p_file_type: payload.fileType,
    p_size_bytes: payload.sizeBytes,
    p_classification: payload.classification,
    p_total_findings: payload.totalFindings,
    p_findings: payload.findings,
  });

  if (result.error || !result.data) {
    throw new ScanPersistenceError();
  }

  return result.data;
}
