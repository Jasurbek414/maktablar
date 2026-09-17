FROM alpine:3.19
RUN apk add --no-cache wireguard-tools curl jq bash iptables ip6tables
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wg show wg0 >/dev/null 2>&1 \
        && test "$(( $(date +%s) - $(cat /tmp/wg-loop-alive 2>/dev/null || echo 0) ))" -lt 90
ENTRYPOINT ["/entrypoint.sh"]
