# ICT2216 Secure Software Development Practical

Student: Liew Jin Hsuen Alexander (`2401499`)

Email: `2401499@sit.singaporetech.edu.sg`

This repository implements Questions 1–4 of the ICT2216 practical test.
Questions 5–9 are intentionally not implemented.

## Architecture

All services share the dedicated `ict2216-ssd-network`.

| Service | Purpose | Host access |
| --- | --- | --- |
| `webserver` | Nginx HTTP redirect, self-signed HTTPS, and reverse proxy | `80`, `443` |
| `app` | Node.js/Express account-creation application | Internal port `3000` only |
| `database` | PostgreSQL application database | Internal port `5432` only |
| `gitserver` | Gitea local Git server with SQLite | HTTP `3000`, SSH `2222` |

Gitea data is stored in the `ict2216-gitea-data` volume. PostgreSQL data is
stored in the `ict2216-postgres-data` volume.

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

docker-compose logs webserver app database gitserver
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
docker-compose.yml          Four services, health checks, network, and volumes
webserver/                  Nginx TLS generation and application reverse proxy
app/                        Express app, frontend validation, and package lock
database/init.sql           Idempotent PostgreSQL table definitions
database/100k-...txt        Complete NCSC common-password source
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
- [x] No MFA, password rotation, or Questions 5–9 functionality added
