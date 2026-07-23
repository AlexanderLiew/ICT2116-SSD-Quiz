FROM nginxinc/nginx-unprivileged:1.28-alpine

USER root

RUN apk add --no-cache curl openssl \
    && install -d -o nginx -g nginx -m 0700 /etc/nginx/certs

COPY nginx.conf /etc/nginx/nginx.conf
COPY html/ /usr/share/nginx/html/
COPY entrypoint.sh /usr/local/bin/ssd-entrypoint.sh

RUN chown nginx:nginx /usr/local/bin/ssd-entrypoint.sh \
    && chmod 0755 /usr/local/bin/ssd-entrypoint.sh

USER nginx

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=5 \
  CMD curl -fk https://127.0.0.1:8443/ || exit 1

ENTRYPOINT ["/usr/local/bin/ssd-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
