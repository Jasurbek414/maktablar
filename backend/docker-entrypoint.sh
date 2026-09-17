#!/bin/sh
# Backend maktab LAN'lariga (VPN orqali, 10.20.0.0/24 va 10.30.0.0/16) wg-gateway
# konteyneri orqali chiqadi. Gateway konteyneri qayta yaratilsa docker IP'si o'zgarishi
# mumkin — shu sabab route davriy ravishda qayta tekshiriladi va faqat o'zgarganda yangilanadi.
# NET_ADMIN capability bo'lmasa (yoki gateway yo'q bo'lsa) backend baribir oddiy ishga tushadi.
if [ -n "$VPN_GATEWAY_HOST" ]; then
  (
    last_gw=""
    while true; do
      gw=$(getent hosts "$VPN_GATEWAY_HOST" 2>/dev/null | awk '{print $1}' | head -n1)
      if [ -n "$gw" ] && [ "$gw" != "$last_gw" ]; then
        ok=1
        for net in $(echo "${VPN_ROUTES:-10.20.0.0/24,10.30.0.0/16}" | tr ',' ' '); do
          ip route replace "$net" via "$gw" || ok=0
        done
        if [ "$ok" = "1" ]; then
          echo "[vpn-route] ${VPN_ROUTES:-10.20.0.0/24,10.30.0.0/16} -> $VPN_GATEWAY_HOST ($gw)"
          last_gw="$gw"
        else
          echo "[vpn-route] Ogohlantirish: route o'rnatib bo'lmadi (NET_ADMIN yo'qmi?)"
        fi
      fi
      sleep 30
    done
  ) &
fi

exec java -jar app.jar
