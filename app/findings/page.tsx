import type { FindingType, Risk } from "../../src/detection";
import { createServerSupabaseClient } from "../../src/lib/supabase/server";
import {
  AppShell,
  AuthScreen,
  DatabaseSetupMessage,
  Icon,
  RiskBadge,
} from "../components";

export const dynamic = "force-dynamic";

interface FindingRow {
  id: string;
  finding_type: FindingType;
  risk: Exclude<Risk, "None">;
  occurrence_count: number;
  masked_example: string;
  scans: {
    id: string;
    file_name: string;
    file_type: "csv" | "txt";
    size_bytes: number;
    classification: Risk;
    created_at: string;
  };
}

const findingLabels: Record<FindingType, string> = {
  email: "Email address",
  ukPhone: "UK phone",
  ukNino: "UK NINO",
  paymentCard: "Payment card",
};

function formatBytes(bytes: number): string {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KiB` : `${bytes} B`;
}

export default async function FindingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return <AuthScreen message="Sign in to review findings." />;
  }

  const { data, error } = await supabase
    .from("findings")
    .select(`
      id,
      finding_type,
      risk,
      occurrence_count,
      masked_example,
      scans!inner (
        id,
        file_name,
        file_type,
        size_bytes,
        classification,
        created_at
      )
    `)
    .order("created_at", { ascending: false });
  const findings = error ? [] : (data as unknown as FindingRow[]);

  return (
    <AppShell
      activePage="findings"
      eyebrow="Masked evidence"
      title="Findings"
      user={authData.user}
    >
      {error ? <DatabaseSetupMessage /> : null}
      <section className="lp-card findings-card" aria-labelledby="findings-title">
        <div className="lp-card__header">
          <div>
            <div className="lp-card__title" id="findings-title">Detected data by file</div>
            <p className="card-subtitle">
              Masked examples and source-file metadata for your owner-scoped scans.
            </p>
          </div>
          <span className="lp-badge lp-badge--neutral">{findings.length} types</span>
        </div>
        <div className="lp-card__body">
          {findings.length === 0 ? (
            <div className="lp-empty-state compact-empty">
              <span className="lp-empty-state__illustration" aria-hidden="true">
                <Icon name="findings" />
              </span>
              <p className="lp-empty-state__message">
                No findings yet. Run a synthetic scan to populate this owner-scoped view.
              </p>
              <div className="lp-empty-state__action">
                <a className="findings-scan-link" href="/scan">Go to Scan</a>
              </div>
            </div>
          ) : (
            <div className="lp-table findings-table">
              <table className="lp-table__table">
                <caption className="visually-hidden">Masked findings with source-file details</caption>
                <thead>
                  <tr>
                    <th className="lp-table__th" scope="col">File details</th>
                    <th className="lp-table__th" scope="col">Finding</th>
                    <th className="lp-table__th" scope="col">Risk</th>
                    <th className="lp-table__th" scope="col">Count</th>
                    <th className="lp-table__th" scope="col">Masked example</th>
                    <th className="lp-table__th" scope="col">Scanned</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((finding) => (
                    <tr key={finding.id}>
                      <td className="lp-table__td">
                        <div className="file-detail">
                          <strong>{finding.scans.file_name}</strong>
                          <span>{finding.scans.file_type.toUpperCase()} · {formatBytes(finding.scans.size_bytes)}</span>
                        </div>
                      </td>
                      <td className="lp-table__td">{findingLabels[finding.finding_type]}</td>
                      <td className="lp-table__td"><RiskBadge risk={finding.risk} /></td>
                      <td className="lp-table__td">{finding.occurrence_count}</td>
                      <td className="lp-table__td"><code className="masked-example">{finding.masked_example}</code></td>
                      <td className="lp-table__td">
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(finding.scans.created_at))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
