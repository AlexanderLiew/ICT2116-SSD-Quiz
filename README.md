# ICT2216 Secure Software Development Practical

This project implements Questions 1 and 2 of the ICT2216 Secure Software
Development practical test. It runs a minimal Nginx web server in Docker,
redirects HTTP traffic to HTTPS, and generates a self-signed TLS certificate
automatically inside the container.

Questions 3–9 are intentionally not implemented.

## Requirements

- Docker
- Docker Compose (`docker-compose` or `docker compose`)

## Start and stop

Build and start the service:

```sh
sudo docker-compose up --build
```

Run it in the background:

```sh
sudo docker-compose up --build -d
```

Stop and remove the service:

```sh
sudo docker-compose down
```

Open <https://127.0.0.1/>. The browser warning is expected because the
certificate is self-signed; accept the warning to view the page.

## Verification

```sh
docker-compose config
docker-compose up --build -d
docker-compose ps
curl -I http://127.0.0.1/
curl -k -I https://127.0.0.1/
curl -k https://127.0.0.1/
docker-compose exec webserver openssl x509 \
  -in /etc/nginx/certs/server.crt -noout -subject -issuer -dates -ext subjectAltName
docker-compose logs webserver
docker-compose down
```

For a clean-start test:

```sh
docker-compose down --volumes --remove-orphans
docker-compose up --build -d
```

## Project structure

```text
docker-compose.yml          Compose service, ports, health check, and network
webserver/Dockerfile        Nginx image with OpenSSL and curl
webserver/entrypoint.sh     Automatic self-signed certificate generation
webserver/nginx.conf        HTTP redirect and HTTPS server configuration
webserver/html/index.html   Minimal proof-of-service page
```

## Q1 and Q2 checklist

- [x] `webserver` service defined in Docker Compose
- [x] Nginx web server exposed on host ports 80 and 443
- [x] Dedicated Docker network for later services
- [x] HTTP redirects to `https://127.0.0.1/`
- [x] HTTPS serves the proof-of-service page
- [x] RSA 2048-bit, SHA-256 self-signed certificate generated automatically
- [x] Certificate CN is `127.0.0.1`
- [x] Certificate SANs include `IP:127.0.0.1` and `DNS:localhost`
- [x] Private key is generated inside the container with restricted permissions
- [x] HTTPS Docker health check accepts the self-signed certificate
