"use client";

import { useMemo, useState } from "react";

import type { FindingType, Risk } from "../../src/detection";
import {
  buildFindingsCsv,
  filterFindings,
  findingLabels,
  type FindingView,
} from "../../src/lib/findings";
import { Icon, RiskBadge } from "../components";

const risks: Array<"All" | Exclude<Risk, "None">> = [
  "All",
  "Critical",
  "High",
  "Medium",
  "Low",
];

const types: Array<"all" | FindingType> = [
  "all",
  "email",
  "ukPhone",
  "ukNino",
  "paymentCard",
];

function formatBytes(bytes: number): string {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KiB` : `${bytes} B`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function downloadCsv(findings: FindingView[]) {
  const csv = buildFindingsCsv(findings);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `minidsp-findings-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function FindingsTable({ findings }: { findings: FindingView[] }) {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<(typeof risks)[number]>("All");
  const [type, setType] = useState<(typeof types)[number]>("all");
  const filteredFindings = useMemo(
    () => filterFindings(findings, { query, risk, type }),
    [findings, query, risk, type],
  );

  return (
    <>
      <div className="findings-toolbar">
        <div className="lp-input lp-input--full-width findings-search">
          <div className="lp-input__row lp-input__row--label-top">
            <label className="lp-input__label" htmlFor="findings-search">
              Search findings
            </label>
            <div className="lp-input__field">
              <input
                className="lp-input__input"
                id="findings-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="File name, finding, risk or masked value"
              />
            </div>
          </div>
        </div>
        <button
          className="lp-button lp-button--primary lp-button--md findings-export"
          type="button"
          disabled={filteredFindings.length === 0}
          onClick={() => downloadCsv(filteredFindings)}
        >
          Export CSV
        </button>
      </div>

      <div className="findings-filter-groups">
        <div className="findings-filter" role="group" aria-label="Filter by risk">
          <span>Risk</span>
          <div className="findings-filter__buttons">
            {risks.map((option) => (
              <button
                className={`lp-button lp-button--sm ${
                  risk === option ? "lp-button--primary" : "lp-button--secondary"
                }`}
                type="button"
                key={option}
                aria-pressed={risk === option}
                onClick={() => setRisk(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="findings-filter" role="group" aria-label="Filter by finding type">
          <span>Finding type</span>
          <div className="findings-filter__buttons">
            {types.map((option) => (
              <button
                className={`lp-button lp-button--sm ${
                  type === option ? "lp-button--primary" : "lp-button--secondary"
                }`}
                type="button"
                key={option}
                aria-pressed={type === option}
                onClick={() => setType(option)}
              >
                {option === "all" ? "All" : findingLabels[option]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="findings-result-summary" aria-live="polite">
        Showing {filteredFindings.length} of {findings.length} finding types
      </div>

      {filteredFindings.length === 0 ? (
        <div className="lp-empty-state compact-empty findings-filter-empty">
          <span className="lp-empty-state__illustration" aria-hidden="true">
            <Icon name="findings" />
          </span>
          <p className="lp-empty-state__message">
            No masked findings match the selected filters.
          </p>
          <div className="lp-empty-state__action">
            <button
              className="lp-button lp-button--secondary lp-button--md"
              type="button"
              onClick={() => {
                setQuery("");
                setRisk("All");
                setType("all");
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <div className="lp-table findings-table">
          <table className="lp-table__table">
            <caption className="visually-hidden">
              Masked findings with source-file details
            </caption>
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
              {filteredFindings.map((finding) => (
                <tr key={finding.id}>
                  <td className="lp-table__td">
                    <div className="file-detail">
                      <strong>{finding.fileName}</strong>
                      <span>{finding.fileType.toUpperCase()} · {formatBytes(finding.sizeBytes)}</span>
                    </div>
                  </td>
                  <td className="lp-table__td">{findingLabels[finding.findingType]}</td>
                  <td className="lp-table__td"><RiskBadge risk={finding.risk} /></td>
                  <td className="lp-table__td">{finding.occurrenceCount}</td>
                  <td className="lp-table__td">
                    <code className="masked-example">{finding.maskedExample}</code>
                  </td>
                  <td className="lp-table__td">{formatDate(finding.scannedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
