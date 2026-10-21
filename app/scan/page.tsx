import { AppShell, AuthScreen, DatabaseSetupMessage, Icon } from "../components";
import { uploadAndScan } from "../server-actions";
import { createServerSupabaseClient } from "../../src/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ScanPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ScanPage({ searchParams }: ScanPageProps) {
  const parameters = await searchParams;
  const message = typeof parameters.message === "string" ? parameters.message : undefined;
  const supabase = await createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return <AuthScreen message="Sign in to run a scan." />;
  }

  const { error } = await supabase.from("scans").select("id").limit(1);
  const databaseReady = !error;

  return (
    <AppShell
      activePage="scan"
      eyebrow="Secure file analysis"
      message={message}
      title="Run a scan"
      user={authData.user}
    >
      {!databaseReady ? <DatabaseSetupMessage /> : null}
      <section className="dashboard-grid">
        <div className="lp-card scan-card">
          <div className="lp-card__header">
            <div>
              <div className="lp-card__title">Upload a synthetic file</div>
              <p className="card-subtitle">Analyse one CSV or TXT file without retaining its contents.</p>
            </div>
            <span className={`lp-badge ${databaseReady ? "lp-badge--success" : "lp-badge--warning"}`}>
              <span className="lp-badge__dot" aria-hidden="true" />
              {databaseReady ? "Ready" : "Setup needed"}
            </span>
          </div>
          <div className="lp-card__body">
            <form action={uploadAndScan} className="upload-form">
              <label className="upload-zone">
                <span className="upload-icon"><Icon name="upload" /></span>
                <span className="upload-title">Choose a synthetic file</span>
                <span className="upload-help">CSV or TXT · maximum 1 MiB · processed in memory</span>
                <input name="file" type="file" accept=".csv,.txt,text/csv,text/plain" required />
              </label>
              <button className="lp-button lp-button--primary lp-button--md"
                type="submit" disabled={!databaseReady}>
                Upload and scan
              </button>
            </form>
          </div>
        </div>

        <aside className="lp-card safety-card">
          <div className="lp-card__header">
            <div className="lp-card__title">Before you scan</div>
          </div>
          <div className="lp-card__body">
            <ul className="control-list">
              <li><span>01</span><div><strong>Synthetic files only</strong><p>Never use customer or production data.</p></div></li>
              <li><span>02</span><div><strong>Validated on the server</strong><p>Type, size, binary and UTF-8 checks run before detection.</p></div></li>
              <li><span>03</span><div><strong>Raw data discarded</strong><p>Only masked aggregates are sent to persistence.</p></div></li>
            </ul>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
