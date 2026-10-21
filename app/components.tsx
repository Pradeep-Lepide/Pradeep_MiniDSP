import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

import type { Risk } from "../src/detection";
import { signIn, signOut, signUp } from "./server-actions";

type ActivePage = "overview" | "scan" | "findings";
type IconName = "dashboard" | "scan" | "findings" | "shield" | "upload";

export function Icon({ name }: { name: IconName }) {
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

export function AuthScreen({ message }: { message?: string }) {
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

function Sidebar({ activePage, email }: { activePage: ActivePage; email: string }) {
  const items: Array<{ key: ActivePage; href: string; label: string; icon: IconName }> = [
    { key: "overview", href: "/", label: "Overview", icon: "dashboard" },
    { key: "scan", href: "/scan", label: "Scan", icon: "scan" },
    { key: "findings", href: "/findings", label: "Findings", icon: "findings" },
  ];

  return (
    <nav className="lp-sidebar app-sidebar" aria-label="Primary">
      <div className="lp-sidebar__header">
        <div className="sidebar-logo" aria-label="MiniDSP" role="img">M</div>
      </div>
      <ul className="lp-sidebar__items">
        {items.map((item) => (
          <li key={item.key}>
            <a
              className={`lp-sidebar__item ${activePage === item.key ? "lp-sidebar__item--active" : ""}`}
              href={item.href}
              aria-current={activePage === item.key ? "page" : undefined}
            >
              <span className="lp-sidebar__icon-box"><Icon name={item.icon} /></span>
              <span className="lp-sidebar__label">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="lp-sidebar__footer">
        <div className="sidebar-account" title={email}>
          <span>{email.slice(0, 1).toUpperCase()}</span>
        </div>
      </div>
    </nav>
  );
}

export function AppShell({
  activePage,
  children,
  eyebrow,
  message,
  title,
  user,
}: {
  activePage: ActivePage;
  children: ReactNode;
  eyebrow: string;
  message?: string;
  title: string;
  user: User;
}) {
  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} email={user.email ?? "Training user"} />
      <main className="app-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <span className="user-email">{user.email}</span>
            <form action={signOut}>
              <button className="lp-button lp-button--secondary lp-button--sm">Sign out</button>
            </form>
          </div>
        </header>
        {message ? <div className="status-banner" role="status">{message}</div> : null}
        {children}
      </main>
    </div>
  );
}

export function DatabaseSetupMessage() {
  return (
    <div className="lp-message lp-message--warning setup-message" role="status">
      <span className="lp-message__icon"><Icon name="shield" /></span>
      <div className="lp-message__content">
        <div className="lp-message__text">
          <h2 className="lp-message__title">Database setup required</h2>
          <p className="lp-message__body">
            The scan schema is unavailable. Metrics and owner-scoped records cannot be loaded.
          </p>
        </div>
      </div>
    </div>
  );
}

export function MetricCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "blue" | "cyan" | "orange";
  value: number;
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

export function RiskBadge({ risk }: { risk: Risk }) {
  const variant = risk === "Critical"
    ? "error"
    : risk === "High"
      ? "warning"
      : risk === "None"
        ? "neutral"
        : "default";

  return <span className={`lp-badge lp-badge--${variant}`}>{risk}</span>;
}
