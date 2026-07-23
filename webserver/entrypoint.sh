#!/bin/sh
set -eu

CERT_DIR=/etc/nginx/certs
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"

if [ ! -s "$CERT_FILE" ] || [ ! -s "$KEY_FILE" ]; then
    install -d -m 0700 "$CERT_DIR"
    umask 077

    openssl req \
        -x509 \
        -newkey rsa:2048 \
        -sha256 \
        -nodes \
        -days 365 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/CN=127.0.0.1" \
        -addext "subjectAltName=IP:127.0.0.1,DNS:localhost"

    chmod 0600 "$KEY_FILE"
    chmod 0644 "$CERT_FILE"
fi

if [ "${1:-}" = "nginx" ]; then
    attempt=1
    max_attempts=60

    echo "Waiting for the application service..."
    until curl -fsS --max-time 2 http://app:3000/health >/dev/null 2>&1; do
        if [ "$attempt" -ge "$max_attempts" ]; then
            echo "Application service was not ready after $max_attempts attempts." >&2
            exit 1
        fi

        attempt=$((attempt + 1))
        sleep 2
    done
    echo "Application service is ready."
fi

exec "$@"
