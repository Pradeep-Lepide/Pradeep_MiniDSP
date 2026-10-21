import type { Risk } from "../detection";

export interface ScanSummaryInput {
  classification: Risk;
  total_findings: number;
}

export interface DashboardSummary {
  filesScanned: number;
  totalFindings: number;
  elevatedFiles: number;
  distribution: Record<Risk, number>;
}

export function summarizeScans(scans: ScanSummaryInput[]): DashboardSummary {
  const distribution: Record<Risk, number> = {
    None: 0,
    Low: 0,
    Medium: 0,
    High: 0,
    Critical: 0,
  };

  let totalFindings = 0;
  let elevatedFiles = 0;

  for (const scan of scans) {
    distribution[scan.classification] += 1;
    totalFindings += scan.total_findings;
    if (scan.classification === "High" || scan.classification === "Critical") {
      elevatedFiles += 1;
    }
  }

  return {
    filesScanned: scans.length,
    totalFindings,
    elevatedFiles,
    distribution,
  };
}
