FROM alpine:3.19
RUN apk add --no-cache wireguard-tools iptables bash
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wg show wg0 >/dev/null 2>&1
ENTRYPOINT ["/entrypoint.sh"]
