import type { FindingType, Risk } from "../../src/detection";
import type { FindingView } from "../../src/lib/findings";
import { createServerSupabaseReadClient } from "../../src/lib/supabase/server";
import {
  AppShell,
  AuthScreen,
  DatabaseSetupMessage,
  Icon,
} from "../components";
import { FindingsTable } from "./findings-table";

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

export default async function FindingsPage() {
  const supabase = await createServerSupabaseReadClient();
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
  const findingViews: FindingView[] = findings.map((finding) => ({
    id: finding.id,
    fileName: finding.scans.file_name,
    fileType: finding.scans.file_type,
    sizeBytes: finding.scans.size_bytes,
    findingType: finding.finding_type,
    risk: finding.risk,
    occurrenceCount: finding.occurrence_count,
    maskedExample: finding.masked_example,
    scannedAt: finding.scans.created_at,
  }));

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
          <span className="lp-badge lp-badge--neutral">{findingViews.length} types</span>
        </div>
        <div className="lp-card__body">
          {findingViews.length === 0 ? (
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
          ) : <FindingsTable findings={findingViews} />}
        </div>
      </section>
    </AppShell>
  );
}
