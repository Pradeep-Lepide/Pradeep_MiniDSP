import type { Risk } from "../src/detection";
import { summarizeScans, type ScanSummaryInput } from "../src/lib/dashboard";
import { createServerSupabaseClient } from "../src/lib/supabase/server";
import {
  AppShell,
  AuthScreen,
  DatabaseSetupMessage,
  MetricCard,
} from "./components";

export const dynamic = "force-dynamic";

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const riskOrder: Risk[] = ["Critical", "High", "Medium", "Low", "None"];

export default async function Home({ searchParams }: HomeProps) {
  const parameters = await searchParams;
  const message = typeof parameters.message === "string" ? parameters.message : undefined;
  const supabase = await createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return <AuthScreen message={message} />;
  }

  const { data, error } = await supabase
    .from("scans")
    .select("classification,total_findings");
  const summary = summarizeScans(error ? [] : (data as ScanSummaryInput[]));
  const maximumRiskCount = Math.max(...Object.values(summary.distribution), 1);

  return (
    <AppShell
      activePage="overview"
      eyebrow="Data discovery & classification"
      message={message}
      title="Security overview"
      user={authData.user}
    >
      {error ? <DatabaseSetupMessage /> : null}

      <section className="metrics-grid" aria-label="Scan metrics">
        <MetricCard label="Files scanned" value={summary.filesScanned}
          detail="Owner-isolated scan records" tone="blue" />
        <MetricCard label="Total findings" value={summary.totalFindings}
          detail="Masked occurrences detected" tone="cyan" />
        <MetricCard label="High / Critical" value={summary.elevatedFiles}
          detail="Files needing review" tone="orange" />
      </section>

      <section className="overview-grid">
        <div className="lp-card">
          <div className="lp-card__header">
            <div>
              <div className="lp-card__title">Risk distribution</div>
              <p className="card-subtitle">Classification of all your completed scans.</p>
            </div>
          </div>
          <div className="lp-card__body risk-distribution">
            {riskOrder.map((risk) => (
              <div className="risk-row" key={risk}>
                <span>{risk}</span>
                <div className="risk-track" aria-hidden="true">
                  <span
                    className={`risk-fill risk-fill--${risk.toLowerCase()}`}
                    style={{ width: `${summary.distribution[risk] / maximumRiskCount * 100}%` }}
                  />
                </div>
                <strong>{summary.distribution[risk]}</strong>
              </div>
            ))}
          </div>
        </div>

        <aside className="lp-card">
          <div className="lp-card__header">
            <div className="lp-card__title">Workspace status</div>
            <span className={`lp-badge ${error ? "lp-badge--warning" : "lp-badge--success"}`}>
              <span className="lp-badge__dot" aria-hidden="true" />
              {error ? "Attention" : "Protected"}
            </span>
          </div>
          <div className="lp-card__body">
            <ul className="control-list">
              <li><span>01</span><div><strong>Server-side scanning</strong><p>Files are validated and analysed away from the browser.</p></div></li>
              <li><span>02</span><div><strong>Masked persistence</strong><p>Only aggregated, masked findings are retained.</p></div></li>
              <li><span>03</span><div><strong>Owner isolation</strong><p>RLS scopes dashboard data to the signed-in user.</p></div></li>
            </ul>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
