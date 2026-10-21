import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { scanText, type Risk } from "../src/detection.ts";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturesDirectory = path.join(testDirectory, "fixtures", "additional");

test("detects and masks a plausible email", () => {
  const result = scanText("Contact alex@example.test for help.");

  assert.equal(result.classification, "Low");
  assert.deepEqual(result.findings, [{
    type: "email",
    risk: "Low",
    count: 1,
    maskedExample: "a***@example.test",
  }]);
});

test("ignores malformed email values", () => {
  assert.equal(scanText("alex@@example.test user@localhost @example.test").totalCount, 0);
});

test("detects common UK mobile and geographic phone forms without partial matches", () => {
  const result = scanText(
    "Mobile 07700 900123, international +44 7700 900123, office 020 7946 0958.",
  );

  assert.equal(result.classification, "Medium");
  assert.equal(result.findings[0].type, "ukPhone");
  assert.equal(result.findings[0].count, 3);
  assert.equal(result.findings[0].maskedExample, "07******123");
  assert.equal(scanText("12345 077009001234 107700900123").totalCount, 0);
});

test("detects valid NINOs case-insensitively and rejects invalid forms", () => {
  const result = scanText("AB 12 34 56 C and ce123456a");

  assert.equal(result.classification, "High");
  assert.equal(result.findings[0].type, "ukNino");
  assert.equal(result.findings[0].count, 2);
  assert.equal(result.findings[0].maskedExample, "AB******C");
  assert.equal(scanText("BG 12 34 56 A and AB 12 34 5 C").totalCount, 0);
});

test("requires 13-19 digits and a valid Luhn checksum for card candidates", () => {
  const result = scanText("Cards 4111 1111 1111 1111 and 4012-8888-8888-1881.");

  assert.equal(result.classification, "Critical");
  assert.equal(result.findings[0].type, "paymentCard");
  assert.equal(result.findings[0].count, 2);
  assert.equal(result.findings[0].maskedExample, "************1111");
  assert.equal(scanText("4111 1111 1111 1112 and 411111111111").totalCount, 0);
});

test("counts repeated non-overlapping matches by detector type", () => {
  const result = scanText("one@example.test, one@example.test; 4111111111111111, 4111111111111111");

  assert.equal(result.findings.find((item) => item.type === "email")?.count, 2);
  assert.equal(result.findings.find((item) => item.type === "paymentCard")?.count, 2);
  assert.equal(result.totalCount, 4);
});

test("gives an overlapping phone span precedence over an email span", () => {
  const result = scanText("07700900123@example.test");

  assert.deepEqual(result, {
    classification: "Medium",
    totalCount: 1,
    findings: [{
      type: "ukPhone",
      risk: "Medium",
      count: 1,
      maskedExample: "07******123",
    }],
  });
});

test("gives an overlapping NINO span precedence over an email span", () => {
  const result = scanText("AB123456C@example.test");

  assert.deepEqual(result, {
    classification: "High",
    totalCount: 1,
    findings: [{
      type: "ukNino",
      risk: "High",
      count: 1,
      maskedExample: "AB******C",
    }],
  });
});

test("uses the highest risk for non-overlapping mixed findings", () => {
  const result = scanText(
    "alex@example.test 07700 900123 AB123456C 4111 1111 1111 1111",
  );

  assert.equal(result.classification, "Critical");
  assert.deepEqual(result.findings.map((item) => item.risk), [
    "Low",
    "Medium",
    "High",
    "Critical",
  ]);
});

test("returns None and no findings for clean input", () => {
  assert.deepEqual(scanText("Inventory item: blue notebook, quantity 12."), {
    classification: "None",
    totalCount: 0,
    findings: [],
  });
});

test("classifies all supplied scannable synthetic fixtures as intended", async () => {
  const manifestPath = path.join(fixturesDirectory, "EXPECTED_RESULTS.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Array<{
    file: string;
    expected_file_risk: Risk | "Reject";
  }>;

  for (const fixture of manifest) {
    if (fixture.expected_file_risk === "Reject") {
      continue;
    }

    const content = await readFile(path.join(fixturesDirectory, fixture.file), "utf8");
    const result = scanText(content);
    assert.equal(result.classification, fixture.expected_file_risk, fixture.file);
  }
});
