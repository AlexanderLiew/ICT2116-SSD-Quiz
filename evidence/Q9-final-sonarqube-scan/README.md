# Question 9 Final SonarQube Scan

Q8 initial scan commit: `aeb447a516828880e7758ed206199c20a5ceb746`

Q9 final scan commit: `dc825da6cc0e506908cc3e46eb71c167d70f9635`

The initial Q8 evidence in `evidence/Q8-initial-sonarqube-scan/` was preserved
unchanged.

## Review and remediation

| Initial finding | Decision | Q9 remediation |
| --- | --- | --- |
| `docker:S6471` in `webserver/Dockerfile` | Genuine runtime security issue | Switched to pinned `nginxinc/nginx-unprivileged:1.28-alpine`, ended the image as user `nginx`, moved internal listeners to 8080/8443, and retained host 80/443. Certificate ownership is `nginx:nginx`; key mode is 0600. |
| `javascript:S3735` in `app/server.js` | Genuine unnecessary expression | Removed `void _next`; retained all four Express error-middleware parameters and configured ESLint to ignore intentionally underscore-prefixed arguments. |
| Five `javascript:S2699` findings in integration tests | Analyzer compatibility false positives; tests already had meaningful Node assertions | Converted all assertions to Chai `expect` without removing response, schema, database-count, or escaping checks. All nine tests still pass. |

The optional case-insensitive common-password correction was not made because
it was outside the required SonarQube findings and the time-limited remediation.

## Before and after

| Metric | Q8 initial | Q9 final |
| --- | ---: | ---: |
| Quality Gate | Passed | Passed |
| Bugs | 0 | 0 |
| Vulnerabilities | 1 | 0 |
| Security Hotspots | 0 | 0 |
| Code Smells | 6 | 0 |
| Reliability | A | A |
| Security | B | A |
| Maintainability | A | A |
| Coverage | 0.0% | 0.0% |
| Duplicated Lines | 0.0% | 0.0% |
| Lines of Code | 547 | 553 |
| Server processing warnings | 0 | 0 |

No coverage was fabricated. The scanner indexed 27 files in the same six
language families and retained the Q8 exclusion and test-classification scope.
It emitted the same informational Text/Secrets SCM scope warning.

## Verification

- Both Compose configuration commands passed.
- Six long-running Compose services became healthy.
- Nginx ran as `nginx`, UID 101; private key mode was 0600.
- HTTP redirected to HTTPS; HTTPS, Gitea, and SonarQube returned 200.
- Integration tests: 9 passing.
- Selenium tests: 5 passing.
- ESLint and ESLint security checks passed.
- `npm audit` reported 0 vulnerabilities.
- No submitted test password appeared in application or webserver logs.
- No private key is tracked.

The final scan completed successfully with zero open issues. The seven Q8
issues are closed because their source locations were remediated, not because
they were suppressed, dismissed, accepted, or manually resolved.

