import assert from "node:assert/strict";
import test from "node:test";

import { summarizeScans } from "../src/lib/dashboard.ts";

test("summarizes dashboard metrics and risk distribution", () => {
  const summary = summarizeScans([
    { classification: "None", total_findings: 0 },
    { classification: "Low", total_findings: 2 },
    { classification: "High", total_findings: 1 },
    { classification: "Critical", total_findings: 3 },
  ]);

  assert.equal(summary.filesScanned, 4);
  assert.equal(summary.totalFindings, 6);
  assert.equal(summary.elevatedFiles, 2);
  assert.deepEqual(summary.distribution, {
    None: 1,
    Low: 1,
    Medium: 0,
    High: 1,
    Critical: 1,
  });
});

test("returns zeroed dashboard metrics for a new workspace", () => {
  assert.deepEqual(summarizeScans([]), {
    filesScanned: 0,
    totalFindings: 0,
    elevatedFiles: 0,
    distribution: {
      None: 0,
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    },
  });
});
