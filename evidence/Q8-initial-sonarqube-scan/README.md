# Question 8 Initial SonarQube Scan

**This is the initial Question 8 scan before Question 9 remediation.**

The preserved, correctly scoped analysis was run on commit
`aeb447a516828880e7758ed206199c20a5ceb746` using project key
`ict2216-ssd-quiz-2401499`. It completed successfully at
2026-07-23 07:24:16 UTC. The earlier analysis was an authorization and scope
configuration test; this is the Q8 baseline.

No finding was fixed, suppressed, dismissed, resolved, marked safe, or reviewed.

## Initial metrics

| Metric | Initial result |
| --- | --- |
| Quality Gate | Passed (`OK`) |
| Bugs | 0 |
| Vulnerabilities | 1 |
| Security Hotspots | 0 |
| Code Smells | 6 |
| Reliability rating | A |
| Security rating | B |
| Maintainability rating | A |
| Coverage | 0.0% (no coverage report was supplied or fabricated) |
| Duplicated lines | 0.0% |
| Lines of code | 547 |
| Server processing warnings | 0 |
| Scanner warnings | 1 informational scope/SCM warning from the Text/Secrets sensor |

## Bugs, vulnerabilities, and security hotspots

There are no Bugs and no Security Hotspots in this initial scan.

| Rule / issue | Category | Severity | File | Location | Message | Status | Suggested Q9 action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docker:S6471` / `55fc31ea-6b8e-4e8d-a7f3-1171deaa0973` | Vulnerability | Minor; Security impact Low | `webserver/Dockerfile` | Line 1 | The `nginx` image runs with `root` as the default user. Make sure it is safe here. | Open | In Q9, assess the image entrypoint and privileged-port requirements, then use a supported non-root Nginx configuration if Q1/Q2 behavior can be preserved. |

## Scope

SonarQube indexed 24 files across JavaScript, CSS, HTML/Web, Docker, JSON, and
YAML. `app/tests` was classified as test code. Because Community Build has no
SQL quality profile, tracked SQL and documentation/configuration text were
explicitly included in the Text/Secrets sensor.

The scan excluded dependencies, Git metadata, generated reports and coverage,
Selenium screenshots, Docker/Gitea/PostgreSQL/SonarQube data, generated
certificates and private keys, temporary files, and
`database/100k-most-used-passwords-NCSC.txt`.

Machine-readable non-secret results are stored in `results/`.

