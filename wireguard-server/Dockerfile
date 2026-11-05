# alpine 3.20 — Python 3.12 kerak: sstp-server 0.7+ faqat 3.12+ da; 3.19 dagi 0.6.0 da ulanishni
# buzadigan xato bor (hello_timer_expired: 'transport' yo'q -> RouterOS "internal error (6)").
FROM alpine:3.20
# openvpn — zaxira transport (2026-09-19), wg0 bilan bitta konteynerda (entrypoint.sh 5-bo'lim)
# ppp + sstp-server — SSTP transporti (2026-10-03, entrypoint.sh 6-bo'lim)
RUN apk add --no-cache wireguard-tools curl jq bash iptables ip6tables openvpn ppp python3 py3-pip openssl \
    && apk add --no-cache --virtual .sstp-build gcc musl-dev python3-dev \
    && pip3 install --no-cache-dir --break-system-packages sstp-server==0.7.2 \
    && apk del .sstp-build
COPY entrypoint.sh /entrypoint.sh
COPY ovpn-auth.sh ovpn-connect.sh /usr/local/bin/
COPY sstp-ip-up.sh /etc/ppp/ip-up
COPY sstp-ip-down.sh /etc/ppp/ip-down
# Windows'da tahrirlangan bo'lsa CRLF skriptni buzadi ("$'\r': command not found")
RUN sed -i 's/\r$//' /entrypoint.sh /usr/local/bin/ovpn-auth.sh /usr/local/bin/ovpn-connect.sh /etc/ppp/ip-up /etc/ppp/ip-down \
    && chmod +x /entrypoint.sh /usr/local/bin/ovpn-auth.sh /usr/local/bin/ovpn-connect.sh /etc/ppp/ip-up /etc/ppp/ip-down
# OpenVPN/SSTP yoqilgan bo'lsa ularning jarayoni ham tirik bo'lishi shart.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wg show wg0 >/dev/null 2>&1 \
        && test "$(( $(date +%s) - $(cat /tmp/wg-loop-alive 2>/dev/null || echo 0) ))" -lt 90 \
        && { [ ! -f /etc/openvpn/server.conf ] || pgrep -x openvpn >/dev/null; } \
        && { [ ! -f /etc/ppp/options.sstpd ] || pgrep -f /usr/bin/sstpd >/dev/null; }
ENTRYPOINT ["/entrypoint.sh"]
