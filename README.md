# ICT2216 Secure Software Development Practical

Student: Liew Jin Hsuen Alexander (`2401499`)

Email: `2401499@sit.singaporetech.edu.sg`

This repository implements Questions 1–9 of the ICT2216 practical test.

## Architecture

All services share the dedicated `ict2216-ssd-network`.

| Service | Purpose | Host access |
| --- | --- | --- |
| `webserver` | Nginx HTTP redirect, self-signed HTTPS, and reverse proxy | `80`, `443` |
| `app` | Node.js/Express account-creation application | Internal port `3000` only |
| `database` | PostgreSQL application database | Internal port `5432` only |
| `gitserver` | Gitea local Git server with SQLite | HTTP `3000`, SSH `2222` |
| `sonar-database` | Dedicated SonarQube PostgreSQL database | Internal port `5432` only |
| `sonarqube` | SonarQube Community Build | HTTP `9000` |
| `sonar-scanner` | Opt-in Docker scanner profile | No published port |

Gitea data is stored in the `ict2216-gitea-data` volume. PostgreSQL data is
stored in the `ict2216-postgres-data` volume.

SonarQube uses separate persistent data, extensions, logs, and PostgreSQL
volumes. Removing Compose volumes also permanently deletes the SonarQube
project and its preserved Q8 dashboard.

## Requirements and startup

Install Docker and Docker Compose. Build and start the complete project:

```sh
sudo docker-compose up --build
```

Run it in the background:

```sh
sudo docker-compose up --build -d
```

Stop the containers without deleting persistent data:

```sh
sudo docker-compose down
```

To delete all Gitea repositories and PostgreSQL records and start completely
clean, run:

```sh
sudo docker-compose down --volumes --remove-orphans
```

**Warning:** the `--volumes` command permanently deletes both named volumes.

## URLs and credentials

- Account-creation application: <https://127.0.0.1/>
- Local Gitea server: <http://127.0.0.1:3000/>
- Gitea SSH endpoint: `127.0.0.1:2222`

The HTTPS browser warning is expected because Nginx generates a self-signed
certificate automatically. Accept the warning to open the application.

Assessment credentials used by PostgreSQL and the Gitea administrator:

```text
Username: admin
Password: 2401499@sit.singaporetech.edu.sg
Email:    2401499@sit.singaporetech.edu.sg
```

## Local Git server setup

Gitea configuration and its SQLite database are created automatically.
On a new `ict2216-gitea-data` volume, create the administrator once with the
supported Gitea CLI:

```sh
docker-compose exec -u git gitserver gitea admin user create \
  --config /data/gitea/conf/app.ini \
  --username admin \
  --password '2401499@sit.singaporetech.edu.sg' \
  --email 2401499@sit.singaporetech.edu.sg \
  --admin \
  --must-change-password=false
```

Create the required public repository using the Gitea web interface or API:

```sh
curl -u 'admin:2401499@sit.singaporetech.edu.sg' \
  -H 'Content-Type: application/json' \
  -d '{"name":"ICT2116-SSD-Quiz","private":false}' \
  http://127.0.0.1:3000/api/v1/user/repos
```

Configure the repository identity and add Gitea without replacing `origin`:

```sh
git config user.name "Liew Jin Hsuen Alexander"
git config user.email "2401499@sit.singaporetech.edu.sg"
git remote add local-git http://admin@127.0.0.1:3000/admin/ICT2116-SSD-Quiz.git
git push -u local-git main
```

Enter the assessment password when Git prompts. Inspect and verify the local
repository with:

```sh
git config --get user.name
git config --get user.email
git remote -v
git ls-remote local-git
```

## Account creation and password validation

The home page contains username and password inputs and a **Create account**
button. Frontend JavaScript provides immediate feedback and calls a focused API
for the common-password check. The final backend endpoint independently repeats
every rule before inserting a record.

The OWASP C7 Level 1 rules used by this no-MFA exercise are:

- At least 10 characters
- Only printable ASCII characters from U+0020 through U+007E
- Spaces, including leading and trailing spaces, are accepted and not trimmed
- Long passwords and passphrases are encouraged
- No uppercase, lowercase, number, or special-character complexity rules
- Passwords in the complete NCSC common-password list are rejected

The source list is
[`100k-most-used-passwords-NCSC.txt`](https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/100k-most-used-passwords-NCSC.txt).
The application imports it idempotently into `common_passwords`; the primary
key prevents duplicates and provides indexed lookups.

PostgreSQL database: `ssd_quiz`

- `common_passwords(password TEXT PRIMARY KEY)`
- `"2401499"(id, username, created_at)`

The quoted `"2401499"` table has no password column. Successful account
creation stores only the username and creation time. The Welcome page displays
the submitted password only because Question 4 explicitly requires it; output
is HTML-escaped and the value is never placed in a URL, cookie, browser
storage, application log, or database. Password rotation is not applicable to
this one-time creation exercise because no password is retained.

## Q5 and Q6 automated security testing

The **Q5-Q6 Security Testing** GitHub Actions workflow runs on pushes to
`main`, pull requests targeting `main`, and manual dispatch. Its four jobs are:

- **Integration test:** Mocha and Supertest exercise the Express request,
  password policy, real PostgreSQL queries, inserts, schema, escaping, and
  invalid-submission behavior.
- **UI test:** Selenium WebDriver and headless Chrome test the form, short and
  common password errors, successful creation, Welcome display, Logout, and
  HTML escaping through a temporary HTTP-only CI endpoint.
- **Dependency check:** `npm audit --omit=dev` and OWASP Dependency-Check scan
  `package-lock.json`; Dependency-Check fails at CVSS 7 or higher.
- **ESLint security:** ESLint 9 flat configuration, the recommended
  `eslint-plugin-security` rules, SARIF generation, artifact upload, and
  best-effort GitHub Code Scanning upload.

Mocha's test-only transitive `diff` and `serialize-javascript` packages are
overridden to patched releases; the full npm audit is clean after those
compatibility-tested overrides.

CI uses an isolated PostgreSQL service and unique test usernames. Test cleanup
deletes only records created by that test run. The temporary HTTP endpoint is
used only inside CI; public application behavior remains the Q1/Q2 HTTPS
endpoint with HTTP redirected to HTTPS.

Generated reports, screenshots, coverage, browser profiles, dependencies, and
container data are ignored by Git.

### Local test commands

Install reproducibly from the `app` directory:

```sh
npm ci
npm audit --omit=dev
npm run lint
npm run lint:security
npm run lint:sarif
npm run test:integration
npm run test:ui
```

The integration and UI commands require an isolated PostgreSQL database through
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Set
`PASSWORD_FILE` to the repository's complete NCSC file. UI tests also require
the application running over HTTP and `UI_BASE_URL` pointing to it. The GitHub
workflow provisions these dependencies automatically.

Successful SARIF generation writes `app/reports/eslint-results.sarif`; the
directory is intentionally not committed.

### Workflow results and artifacts

Open the
[Q5-Q6 workflow](https://github.com/AlexanderLiew/ICT2116-SSD-Quiz/actions/workflows/q5-q6-security-testing.yml)
to inspect each job and download:

- `Dependency-Check-Report`
- `ESLint-Security-Report`
- `UI-Failure-Screenshots` only when UI testing fails

An NVD API key is optional because the pinned Dependency-Check action includes
an updated vulnerability database. To provide one, create a repository Actions
secret named `NVD_API_KEY`; the workflow never prints or commits it.

GitHub SARIF upload requires Code Scanning availability and
`security-events: write`. The SARIF artifact is still uploaded if repository
visibility, plan, or token permissions prevent Code Scanning upload.

## Questions 7 and 8: SonarQube

- SonarQube Community Build: `26.7.0.124771`
- SonarQube PostgreSQL: `postgres:17-alpine`
- Scanner image: `12.1.0.3233_8.0.1`
- Embedded SonarScanner CLI: `8.0.1.6346`
- URL: <http://127.0.0.1:9000/>
- Project key: `ict2216-ssd-quiz-2401499`

Start and check the services:

```sh
docker compose up -d sonar-database sonarqube
docker compose ps sonar-database sonarqube
curl http://127.0.0.1:9000/api/system/status
```

Generate a project or global analysis token under **My Account > Security**.
Set it only in the local environment and run the pinned Docker scanner:

```sh
export SONAR_TOKEN='token entered locally'
docker compose run --rm sonar-scanner
```

The scanner covers first-party Node/Express, browser JavaScript, HTML, CSS,
Docker, JSON, YAML, SQL/text configuration, and test files. It excludes
dependencies, generated output, volume data, credentials, certificates, and
the large NCSC password file. Exact scope and initial results are preserved in
`evidence/Q8-initial-sonarqube-scan/`.

The unchanged Q8 baseline is retained for comparison with Question 9.

## Question 9 remediation

Final scanned commit: `dc825da6cc0e506908cc3e46eb71c167d70f9635`.

- Nginx now uses the pinned unprivileged image and runs as UID 101 on internal
  ports 8080/8443 while host ports remain 80/443.
- Express error middleware retains four parameters without the unnecessary
  `void` expression.
- Integration assertions use Chai `expect`, preserving all security checks.
- Final SonarQube result: Quality Gate passed; 0 Bugs, 0 Vulnerabilities,
  0 Hotspots, 0 Code Smells; Reliability, Security, and Maintainability all A.
- Coverage remains 0.0%; no coverage was fabricated.
- Final evidence: `evidence/Q9-final-sonarqube-scan/`.

The slow Dependency-Check was not rerun due to the time limit. `npm audit`,
integration, Selenium, ESLint, service health, HTTPS, Gitea, and SonarQube
checks passed.

Manual Q9 screenshots:

- Overview: `http://127.0.0.1:9000/dashboard?id=ict2216-ssd-quiz-2401499`
- Bugs: `http://127.0.0.1:9000/project/issues?id=ict2216-ssd-quiz-2401499&types=BUG`
- Vulnerabilities: `http://127.0.0.1:9000/project/issues?id=ict2216-ssd-quiz-2401499&types=VULNERABILITY`
- Hotspots: `http://127.0.0.1:9000/security_hotspots?id=ict2216-ssd-quiz-2401499`
- Code Smells: `http://127.0.0.1:9000/project/issues?id=ict2216-ssd-quiz-2401499&types=CODE_SMELL`

## Verification

```sh
docker-compose config
docker compose config
docker-compose up --build -d
docker-compose ps

curl -I http://127.0.0.1/
curl -k -I https://127.0.0.1/
curl -k https://127.0.0.1/
curl http://127.0.0.1:3000/api/healthz

docker-compose exec webserver openssl x509 \
  -in /etc/nginx/certs/server.crt \
  -noout -subject -issuer -dates -ext subjectAltName

docker-compose exec database psql -U admin -d ssd_quiz \
  -c 'SELECT COUNT(*) FROM common_passwords;'
docker-compose exec database psql -U admin -d ssd_quiz \
  -c '\d "2401499"'

docker-compose logs webserver app database gitserver sonarqube sonar-database
git ls-remote local-git
```

Invalid requests remain on the home page, show a validation error, return
HTTP 400, and do not add a student row. A valid request returns the Welcome
page and adds exactly one row.

## Troubleshooting ports 80 and 443

The final configuration must use host ports 80 and 443. If startup reports
that a port is already allocated, identify the owner before changing anything:

```sh
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Stop only a container that you own and know is safe to interrupt, then start
this project again. Do not change the committed port mappings for assessment.

## File structure

```text
docker-compose.yml          Application, Git, SonarQube, scanner, network, volumes
webserver/                  Nginx TLS generation and application reverse proxy
app/                        Express app, frontend validation, and package lock
database/init.sql           Idempotent PostgreSQL table definitions
database/100k-...txt        Complete NCSC common-password source
.github/workflows/          Q5/Q6 GitHub Actions workflow
app/tests/                  Mocha/Supertest and Selenium test suites
app/eslint.config.mjs       ESLint 9 flat security configuration
sonar-project.properties    Q7/Q8 source, test, and exclusion scope
evidence/Q8-.../            Preserved initial scan metrics and issues
```

## Requirements checklist

### Questions 1 and 2

- [x] Nginx `webserver` service on host ports 80 and 443
- [x] HTTP redirects to `https://127.0.0.1/`
- [x] Automatic RSA-2048/SHA-256 self-signed certificate
- [x] Certificate CN `127.0.0.1`; SANs `IP:127.0.0.1`, `DNS:localhost`
- [x] HTTPS health check and dedicated Docker network
- [x] No certificate private key committed

### Question 3

- [x] Persistent Gitea service on the dedicated network
- [x] Web port 3000, SSH port 2222, and reliable health check
- [x] Required administrator identity and supported one-time bootstrap command
- [x] Repository Git name/email configured
- [x] `origin` preserved and `local-git` documented as the second remote

### Question 4

- [x] HTTPS account-creation form and Welcome/Logout flow
- [x] Matching frontend and authoritative backend password validation
- [x] Complete NCSC list imported idempotently into PostgreSQL
- [x] Parameterised common-password lookup and student insert
- [x] Student table named exactly `"2401499"` with no password column
- [x] Submitted username and assessment-required password safely escaped
- [x] Passwords are not stored or logged
- [x] PostgreSQL persistence, health check, and application startup retry
- [x] No MFA or password rotation added

### Question 5

- [x] Real-PostgreSQL Mocha/Supertest integration tests
- [x] Headless-Chrome Selenium tests over an isolated HTTP endpoint
- [x] OWASP Dependency-Check with HTML artifact and CVSS 7 threshold
- [x] Additional runtime `npm audit --omit=dev`
- [x] Push, pull-request, and manual GitHub Actions triggers

### Question 6

- [x] ESLint 9 flat configuration for Node.js, browser, and test files
- [x] Recommended `eslint-plugin-security` analysis
- [x] SARIF generation and `ESLint-Security-Report` artifact
- [x] Best-effort GitHub Code Scanning upload with minimum permissions

### Question 7

- [x] Pinned SonarQube Community Build and dedicated PostgreSQL service
- [x] Persistent SonarQube and database volumes with health checks
- [x] Pinned, opt-in Docker SonarScanner using `SONAR_TOKEN`

### Question 8

- [x] Correctly scoped initial analysis committed before scanning
- [x] Initial metrics and all Bugs, Vulnerabilities, and Hotspots preserved
- [x] No finding fixed, suppressed, dismissed, or reviewed

### Question 9

- [x] All seven Q8 findings reviewed and remediated in source
- [x] Nginx runtime changed to non-root without changing host ports 80/443
- [x] Final scan passed with zero open issues and all A ratings
- [x] Separate before-and-after Q9 evidence preserved
