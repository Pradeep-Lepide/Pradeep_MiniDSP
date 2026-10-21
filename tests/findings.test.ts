import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFindingsCsv,
  filterFindings,
  type FindingView,
} from "../src/lib/findings.ts";

const findings: FindingView[] = [
  {
    id: "finding-1",
    fileName: "customers.csv",
    fileType: "csv",
    sizeBytes: 512,
    findingType: "email",
    risk: "Low",
    occurrenceCount: 2,
    maskedExample: "a***@example.test",
    scannedAt: "2026-10-21T10:00:00.000Z",
  },
  {
    id: "finding-2",
    fileName: "payments.txt",
    fileType: "txt",
    sizeBytes: 2048,
    findingType: "paymentCard",
    risk: "Critical",
    occurrenceCount: 1,
    maskedExample: "************1111",
    scannedAt: "2026-10-21T11:00:00.000Z",
  },
];

test("filters findings by search, risk and finding type", () => {
  assert.deepEqual(
    filterFindings(findings, { query: "customers", risk: "All", type: "all" })
      .map((finding) => finding.id),
    ["finding-1"],
  );
  assert.deepEqual(
    filterFindings(findings, { query: "", risk: "Critical", type: "paymentCard" })
      .map((finding) => finding.id),
    ["finding-2"],
  );
  assert.deepEqual(
    filterFindings(findings, { query: "example.test", risk: "Critical", type: "all" }),
    [],
  );
});

test("exports only masked finding fields with CSV escaping", () => {
  const csv = buildFindingsCsv([
    {
      ...findings[0],
      fileName: "team,\"north\".csv",
    },
  ]);

  assert.match(csv, /^"File name","File type","Size \(bytes\)"/u);
  assert.match(csv, /"team,""north""\.csv"/u);
  assert.match(csv, /"a\*\*\*@example\.test"/u);
  assert.doesNotMatch(csv, /finding-1/u);
});

test("neutralizes spreadsheet formulas in user-controlled file names", () => {
  const csv = buildFindingsCsv([
    {
      ...findings[0],
      fileName: "=HYPERLINK(\"https://example.test\")",
    },
  ]);

  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.test""\)"/u);
});
