import type { FindingType, Risk } from "../detection";

export interface FindingView {
  id: string;
  fileName: string;
  fileType: "csv" | "txt";
  sizeBytes: number;
  findingType: FindingType;
  risk: Exclude<Risk, "None">;
  occurrenceCount: number;
  maskedExample: string;
  scannedAt: string;
}

export interface FindingFilters {
  query: string;
  risk: "All" | Exclude<Risk, "None">;
  type: "all" | FindingType;
}

export const findingLabels: Record<FindingType, string> = {
  email: "Email address",
  ukPhone: "UK phone",
  ukNino: "UK NINO",
  paymentCard: "Payment card",
};

export function filterFindings(
  findings: FindingView[],
  filters: FindingFilters,
): FindingView[] {
  const query = filters.query.trim().toLocaleLowerCase("en-GB");

  return findings.filter((finding) => {
    if (filters.risk !== "All" && finding.risk !== filters.risk) {
      return false;
    }

    if (filters.type !== "all" && finding.findingType !== filters.type) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      finding.fileName,
      finding.fileType,
      findingLabels[finding.findingType],
      finding.risk,
      finding.maskedExample,
    ].some((value) => value.toLocaleLowerCase("en-GB").includes(query));
  });
}

function escapeCsvCell(value: string | number): string {
  let text = String(value);

  if (/^[\t\r ]*[=+\-@]/u.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll("\"", "\"\"")}"`;
}

export function buildFindingsCsv(findings: FindingView[]): string {
  const rows: Array<Array<string | number>> = [
    [
      "File name",
      "File type",
      "Size (bytes)",
      "Finding",
      "Risk",
      "Count",
      "Masked example",
      "Scanned at",
    ],
    ...findings.map((finding) => [
      finding.fileName,
      finding.fileType.toUpperCase(),
      finding.sizeBytes,
      findingLabels[finding.findingType],
      finding.risk,
      finding.occurrenceCount,
      finding.maskedExample,
      finding.scannedAt,
    ]),
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}
