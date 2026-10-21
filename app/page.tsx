import type { User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "../src/lib/supabase/server";
import { signIn, signOut, signUp, uploadAndScan } from "./server-actions";

export const dynamic = "force-dynamic";

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface ScanRow {
  id: string;
  file_name: string;
  classification: "None" | "Low" | "Medium" | "High" | "Critical";
  total_findings: number;
  created_at: string;
}

function Icon({ name }: { name: "dashboard" | "scan" | "findings" | "shield" | "upload" }) {
  const paths = {
    dashboard: <path d="M4 4h6v6H4V4Zm10 0h6v10h-6V4ZM4 14h6v6H4v-6Zm10 4h6v2h-6v-2Z" />,
    scan: <path d="M5 3h10l4 4v14H5V3Zm9 1v4h4M8 12h8M8 16h6" />,
    findings: <path d="M4 5h16M4 12h16M4 19h10M7 3v4M12 10v4M17 17v4" />,
    shield: <path d="M12 3 20 6v6c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Zm-3 9 2 2 4-5" />,
    upload: <path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" />,
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function AuthScreen({ message }: { message?: string }) {
  return (
    <main className="auth-shell">
      <section className="auth-brand" aria-labelledby="auth-product-title">
        <div className="brand-mark" aria-hidden="true">M</div>
        <p className="eyebrow">Lepide training workspace</p>
        <h1 id="auth-product-title">Find sensitive data before it becomes risk.</h1>
        <p>
          Scan synthetic CSV and TXT files for emails, UK phone numbers,
          National Insurance numbers and payment-card candidates.
        </p>
        <ul className="auth-benefits">
          <li><span aria-hidden="true">✓</span> Server-side processing</li>
          <li><span aria-hidden="true">✓</span> Masked findings only</li>
          <li><span aria-hidden="true">✓</span> Owner-isolated records</li>
        </ul>
      </section>

      <section className="auth-form-panel" aria-labelledby="sign-in-heading">
        <div className="lp-card lp-card--elevated lp-card--borderless auth-card">
          <div className="lp-card__header">
            <div>
              <p className="eyebrow">Welcome to MiniDSP</p>
              <h2 id="sign-in-heading" className="auth-title">Access your scan workspace</h2>
            </div>
          </div>
          <div className="lp-card__body">
            {message ? <div className="status-banner" role="status">{message}</div> : null}
            <form className="auth-form" action={signIn}>
              <div className="lp-input lp-input--full-width">
                <div className="lp-input__row lp-input__row--label-top">
                  <label className="lp-input__label" htmlFor="email">Work email</label>
                  <div className="lp-input__field">
                    <input className="lp-input__input" id="email" name="email" type="email"
                      autoComplete="email" placeholder="you@example.com" required />
                  </div>
                </div>
              </div>
              <div className="lp-input lp-input--full-width">
                <div className="lp-input__row lp-input__row--label-top">
                  <label className="lp-input__label" htmlFor="password">Password</label>
                  <div className="lp-input__field">
                    <input className="lp-input__input" id="password" name="password" type="password"
                      autoComplete="current-password" minLength={8} required />
                  </div>
                </div>
                <div className="lp-input__message">Use at least 8 characters for new accounts.</div>
              </div>
              <div className="auth-actions">
                <button className="lp-button lp-button--primary lp-button--md lp-button--full-width"
                  type="submit">
                  Sign in
                </button>
                <span className="auth-action-separator">New to MiniDSP?</span>
                <button className="lp-button lp-button--secondary lp-button--md lp-button--full-width"
                  type="submit" formAction={signUp}>
                  Create training account
                </button>
              </div>
            </form>
          </div>
          <div className="lp-card__footer auth-note">
            Synthetic training data only. Never upload customer or production data.
          </div>
        </div>
      </section>
    </main>
  );
}

function Sidebar({ email }: { email: string }) {
  return (
    <nav className="lp-sidebar app-sidebar" aria-label="Primary">
      <div className="lp-sidebar__header">
        <div className="sidebar-logo" aria-label="MiniDSP" role="img">M</div>
      </div>
      <ul className="lp-sidebar__items">
        <li>
          <a className="lp-sidebar__item lp-sidebar__item--active" href="/"
            aria-current="page">
            <span className="lp-sidebar__icon-box"><Icon name="dashboard" /></span>
            <span className="lp-sidebar__label">Overview</span>
          </a>
        </li>
        <li>
          <a className="lp-sidebar__item" href="#new-scan">
            <span className="lp-sidebar__icon-box"><Icon name="scan" /></span>
            <span className="lp-sidebar__label">Scan</span>
          </a>
        </li>
        <li>
          <span className="lp-sidebar__item lp-sidebar__item--disabled" aria-disabled="true">
            <span className="lp-sidebar__icon-box"><Icon name="findings" /></span>
            <span className="lp-sidebar__label">Findings</span>
          </span>
        </li>
      </ul>
      <div className="lp-sidebar__footer">
        <div className="sidebar-account" title={email}>
          <span>{email.slice(0, 1).toUpperCase()}</span>
        </div>
      </div>
    </nav>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: string;
}) {
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      <span>{detail}</span>
    </div>
  );
}

function riskBadge(risk: ScanRow["classification"]) {
  const variant = risk === "Critical"
    ? "error"
    : risk === "High"
      ? "warning"
      : risk === "None"
        ? "neutral"
        : "default";

  return <span className={`lp-badge lp-badge--${variant}`}>{risk}</span>;
}

function Dashboard({
  user,
  scans,
  databaseReady,
  message,
}: {
  user: User;
  scans: ScanRow[];
  databaseReady: boolean;
  message?: string;
}) {
  const totalFindings = scans.reduce((sum, scan) => sum + scan.total_findings, 0);
  const elevatedScans = scans.filter((scan) =>
    scan.classification === "High" || scan.classification === "Critical"
  ).length;

  return (
    <div className="app-shell">
      <Sidebar email={user.email ?? "Training user"} />
      <main className="app-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Data discovery & classification</p>
            <h1>Security overview</h1>
          </div>
          <div className="topbar-actions">
            <span className="user-email">{user.email}</span>
            <form action={signOut}>
              <button className="lp-button lp-button--secondary lp-button--sm">Sign out</button>
            </form>
          </div>
        </header>

        {message ? <div className="status-banner" role="status">{message}</div> : null}

        {!databaseReady ? (
          <div className="lp-message lp-message--warning setup-message" role="status">
            <span className="lp-message__icon"><Icon name="shield" /></span>
            <div className="lp-message__content">
              <div className="lp-message__text">
                <h2 className="lp-message__title">Database setup required</h2>
                <p className="lp-message__body">
                  Authentication is connected, but the scan migration is not applied.
                  Metrics remain at zero and uploads cannot be saved yet.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <section className="metrics-grid" aria-label="Scan metrics">
          <MetricCard label="Files scanned" value={scans.length}
            detail={databaseReady ? "Owner-isolated scans" : "Awaiting database setup"} tone="blue" />
          <MetricCard label="Total findings" value={totalFindings}
            detail="Masked occurrences" tone="cyan" />
          <MetricCard label="High / Critical" value={elevatedScans}
            detail="Files needing review" tone="orange" />
        </section>

        <section className="dashboard-grid">
          <div id="new-scan" className="lp-card scan-card">
            <div className="lp-card__header">
              <div>
                <div className="lp-card__title">Start a new scan</div>
                <p className="card-subtitle">Analyse one synthetic CSV or TXT file securely.</p>
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
              <div className="lp-card__title">Safety controls</div>
            </div>
            <div className="lp-card__body">
              <ul className="control-list">
                <li><span>01</span><div><strong>Server validated</strong><p>Type, size, binary and UTF-8 checks.</p></div></li>
                <li><span>02</span><div><strong>Masked by design</strong><p>Raw contents and matches are discarded.</p></div></li>
                <li><span>03</span><div><strong>Owner isolated</strong><p>RLS policies scope every saved record.</p></div></li>
              </ul>
            </div>
          </aside>
        </section>

        <section className="lp-card recent-card" aria-labelledby="recent-title">
          <div className="lp-card__header">
            <div>
              <div className="lp-card__title" id="recent-title">Recent scans</div>
              <p className="card-subtitle">Your latest classified synthetic files.</p>
            </div>
            <span className="lp-badge lp-badge--neutral">{scans.length} scans</span>
          </div>
          <div className="lp-card__body">
            {scans.length === 0 ? (
              <div className="lp-empty-state compact-empty">
                <span className="lp-empty-state__illustration" aria-hidden="true">
                  <Icon name="scan" />
                </span>
                <p className="lp-empty-state__message">
                  {databaseReady
                    ? "No scans yet. Upload a synthetic file to create the first result."
                    : "Recent scans will appear after the database migration is applied."}
                </p>
              </div>
            ) : (
              <div className="lp-table">
                <table className="lp-table__table">
                  <caption className="visually-hidden">Recent scans</caption>
                  <thead>
                    <tr>
                      <th className="lp-table__th" scope="col">File</th>
                      <th className="lp-table__th" scope="col">Classification</th>
                      <th className="lp-table__th" scope="col">Findings</th>
                      <th className="lp-table__th" scope="col">Scanned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scans.map((scan) => (
                      <tr key={scan.id}>
                        <td className="lp-table__td">{scan.file_name}</td>
                        <td className="lp-table__td">{riskBadge(scan.classification)}</td>
                        <td className="lp-table__td">{scan.total_findings}</td>
                        <td className="lp-table__td">
                          {new Intl.DateTimeFormat("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(scan.created_at))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

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
    .select("id,file_name,classification,total_findings,created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <Dashboard
      user={authData.user}
      scans={error ? [] : (data as ScanRow[])}
      databaseReady={!error}
      message={message}
    />
  );
}
