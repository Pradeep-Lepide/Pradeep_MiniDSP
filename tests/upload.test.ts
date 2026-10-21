import assert from "node:assert/strict";
import test from "node:test";

import {
  persistScanAtomically,
  type AtomicScanRpcArguments,
} from "../src/lib/scan-persistence.ts";
import { prepareUploadForPersistence } from "../src/lib/upload-service.ts";
import {
  MAX_UPLOAD_BYTES,
  type UploadFile,
  UploadValidationError,
  validateUpload,
} from "../src/lib/upload-validation.ts";

function syntheticFile(
  name: string,
  content: string | Uint8Array,
  type = "text/plain",
  declaredSize?: number,
): UploadFile {
  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;

  return {
    name,
    type,
    size: declaredSize ?? bytes.byteLength,
    async arrayBuffer() {
      return Uint8Array.from(bytes).buffer;
    },
  };
}

async function expectValidationCode(
  file: UploadFile,
  code: UploadValidationError["code"],
): Promise<void> {
  await assert.rejects(
    validateUpload(file),
    (error) => error instanceof UploadValidationError && error.code === code,
  );
}

test("accepts non-empty CSV and TXT uploads up to 1 MiB", async () => {
  const csv = await validateUpload(syntheticFile("safe.csv", "name,value\nitem,1", "text/csv"));
  const txt = await validateUpload(syntheticFile("safe.txt", "synthetic notes"));
  const maximum = await validateUpload(
    syntheticFile("maximum.txt", new Uint8Array(MAX_UPLOAD_BYTES).fill(0x61)),
  );

  assert.equal(csv.fileType, "csv");
  assert.equal(txt.fileType, "txt");
  assert.equal(maximum.sizeBytes, MAX_UPLOAD_BYTES);
});

test("rejects empty uploads", async () => {
  await expectValidationCode(syntheticFile("empty.txt", ""), "empty");
});

test("rejects uploads larger than 1 MiB using actual bytes", async () => {
  await expectValidationCode(
    syntheticFile("large.txt", new Uint8Array(MAX_UPLOAD_BYTES + 1), "text/plain", 1),
    "oversized",
  );
});

test("rejects a declared oversized upload before reading its contents", async () => {
  let contentRead = false;
  const file: UploadFile = {
    name: "large.txt",
    type: "text/plain",
    size: MAX_UPLOAD_BYTES + 1,
    async arrayBuffer() {
      contentRead = true;
      return new ArrayBuffer(0);
    },
  };

  await expectValidationCode(file, "oversized");
  assert.equal(contentRead, false);
});

test("rejects unsupported extensions and MIME types", async () => {
  await expectValidationCode(syntheticFile("data.json", "{}", "application/json"), "unsupported");
  await expectValidationCode(
    syntheticFile("data.csv", "a,b", "application/octet-stream"),
    "unsupported",
  );
});

test("rejects binary content", async () => {
  await expectValidationCode(
    syntheticFile("binary.txt", new Uint8Array([0x61, 0x00, 0x62])),
    "binary",
  );
});

test("rejects invalid UTF-8", async () => {
  await expectValidationCode(
    syntheticFile("invalid.txt", new Uint8Array([0xc3, 0x28])),
    "invalidUtf8",
  );
});

test("builds a masked-only aggregated persistence payload", async () => {
  const rawEmail = "alex@example.test";
  const rawCard = "4111 1111 1111 1111";
  const payload = await prepareUploadForPersistence(
    syntheticFile("synthetic.csv", `${rawEmail},${rawCard}`, "text/csv"),
  );
  const serialized = JSON.stringify(payload);

  assert.equal(payload.classification, "Critical");
  assert.equal(payload.totalFindings, 2);
  assert.equal(serialized.includes(rawEmail), false);
  assert.equal(serialized.includes(rawCard), false);
  assert.deepEqual(payload.findings.map((finding) => finding.maskedExample), [
    "a***@example.test",
    "************1111",
  ]);
});

test("uses one atomic RPC and exposes no partial-write fallback on failure", async () => {
  const payload = await prepareUploadForPersistence(
    syntheticFile("synthetic.txt", "alex@example.test"),
  );
  const calls: AtomicScanRpcArguments[] = [];

  await assert.rejects(
    persistScanAtomically(async (arguments_) => {
      calls.push(arguments_);
      return { data: null, error: { message: "synthetic database failure" } };
    }, payload),
    { message: "The scan could not be saved." },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].p_findings.length, 1);
});
