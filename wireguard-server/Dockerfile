FROM alpine:3.19
# openvpn — zaxira transport (2026-09-19), wg0 bilan bitta konteynerda (entrypoint.sh 5-bo'lim)
RUN apk add --no-cache wireguard-tools curl jq bash iptables ip6tables openvpn
COPY entrypoint.sh /entrypoint.sh
COPY ovpn-auth.sh ovpn-connect.sh /usr/local/bin/
# Windows'da tahrirlangan bo'lsa CRLF skriptni buzadi ("$'\r': command not found")
RUN sed -i 's/\r$//' /entrypoint.sh /usr/local/bin/ovpn-auth.sh /usr/local/bin/ovpn-connect.sh \
    && chmod +x /entrypoint.sh /usr/local/bin/ovpn-auth.sh /usr/local/bin/ovpn-connect.sh
# OpenVPN yoqilgan bo'lsa (sertifikatlar bor) uning jarayoni ham tirik bo'lishi shart.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wg show wg0 >/dev/null 2>&1 \
        && test "$(( $(date +%s) - $(cat /tmp/wg-loop-alive 2>/dev/null || echo 0) ))" -lt 90 \
        && { [ ! -f /etc/openvpn/server.conf ] || pgrep -x openvpn >/dev/null; }
ENTRYPOINT ["/entrypoint.sh"]
