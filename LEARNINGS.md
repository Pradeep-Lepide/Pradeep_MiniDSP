# What I learned

After each phase, the Agent asks the developer for one useful learning and records it briefly.

- **Planning:**
- **Detection:** Validate synthetic values against domain rules. Resolve cross-detector overlaps before aggregation with explicit risk-first precedence so one source span is never double counted.
- **Security/persistence:** Keep transport limits above the accepted content limit for protocol overhead, reject trustworthy oversized metadata early, and still enforce the authoritative limit on bytes actually read.
- **Security/persistence:** Treat migrations as executable code: capture the first SQL failure, verify no partial schema remains, correct the PL/pgSQL expression, and rerun the complete migration before claiming readiness.
- **UI:** Keep dashboard, workflow and evidence concerns in separate App Shell routes: Overview summarizes, Scan performs the upload task, and Findings presents masked evidence with source-file metadata.
- **Testing/deployment:** A successful PowerShell API probe does not prove Node runtime connectivity. Test through the actual runtime and trust the OS CA store rather than disabling TLS when HTTPS inspection adds a local root certificate.
- **What I'd do differently:**
