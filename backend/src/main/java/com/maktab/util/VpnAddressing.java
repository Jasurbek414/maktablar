package com.maktab.util;

import com.maktab.model.MikrotikRouter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * VPN manzillash sxemasi — bitta joyda, RouterController / WireguardSyncController /
 * qurilma drayverlari bir xil qoidadan foydalanishi uchun.
 *
 *   Router tunnel IP:     10.20.0.N         (N = routerning VPN IP oxirgi okteti)
 *   Maktab virtual LAN:   10.30.N.0/24      (Mikrotik'da netmap bilan haqiqiy LAN'ga o'giriladi)
 *   Backend gateway:      10.20.0.254       (backend shu peer orqali maktab LAN'lariga chiqadi)
 *
 * Nega netmap: deyarli barcha Mikrotik'larda LAN standart 192.168.88.0/24 — agar server
 * maktab LAN'larini to'g'ridan-to'g'ri route qilganda ular to'qnashardi. Har bir maktab o'z
 * noyob 10.30.N.0/24 oynasi orqali ko'rinadi, maktabdagi qurilmalarning IP'si o'zgarmaydi.
 * Netmap 1:1 bo'lgani uchun LAN aynan /24 bo'lishi shart.
 */
@Component
public class VpnAddressing {

    private static final Pattern IPV4 = Pattern.compile("^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$");

    @Value("${app.wireguard.subnet-base:10.20.0}") private String tunnelBase;
    @Value("${app.wireguard.mapped-base:10.30}") private String mappedBase;
    @Value("${app.wireguard.gateway-ip:10.20.0.254}") private String gatewayIp;

    public static final String DEFAULT_LAN_SUBNET = "192.168.88.0/24";

    public String tunnelBase() { return tunnelBase; }
    public String tunnelSubnet() { return tunnelBase + ".0/24"; }
    public String mappedSupernet() { return mappedBase + ".0.0/16"; }
    public String serverTunnelIp() { return tunnelBase + ".1"; }
    public String gatewayIp() { return gatewayIp; }

    /** Router VPN IP'sining oxirgi okteti (10.20.0.7/32 -> 7). */
    public int hostOctet(MikrotikRouter r) {
        String ip = stripPrefix(r.getVpnIp());
        Matcher m = IPV4.matcher(ip == null ? "" : ip);
        if (!m.matches()) throw new IllegalStateException("Router VPN IP noto'g'ri: " + r.getVpnIp());
        return Integer.parseInt(m.group(4));
    }

    /** Router tomonidagi tunnel interfeysi manzili (10.20.0.N/24). /32 berilsa serverga route bo'lmaydi. */
    public String routerTunnelAddress(MikrotikRouter r) {
        return tunnelBase + "." + hostOctet(r) + "/24";
    }

    /** Server (hub) tomonidagi peer allowed-ips uchun router tunnel IP (10.20.0.N/32). */
    public String routerTunnelHost(MikrotikRouter r) {
        return tunnelBase + "." + hostOctet(r) + "/32";
    }

    /** Maktabning server tomonidan ko'rinadigan virtual LAN'i (10.30.N.0/24). */
    public String mappedSubnet(MikrotikRouter r) {
        return mappedBase + "." + hostOctet(r) + ".0/24";
    }

    public String lanSubnet(MikrotikRouter r) {
        return r.getLanSubnet() != null && !r.getLanSubnet().isBlank() ? r.getLanSubnet() : DEFAULT_LAN_SUBNET;
    }

    /** Routerning o'z LAN'dagi manzili — RouterOS defconf standarti bo'yicha bridge/gateway
     * odatda subnetning birinchi hosti (masalan 192.168.88.0/24 -> 192.168.88.1). */
    public String routerOwnLanIp(MikrotikRouter r) {
        String base = stripPrefix(lanSubnet(r)); // a.b.c.0
        return base.substring(0, base.lastIndexOf('.')) + ".1";
    }

    /**
     * Maktab LAN'idagi qurilma IP'sini backend yeta oladigan virtual IP'ga o'giradi
     * (192.168.88.253 -> 10.30.N.253). Qurilma LAN subnetiga tegishli bo'lmasa null.
     */
    public String toReachableIp(MikrotikRouter r, String lanIp) {
        Matcher dev = IPV4.matcher(lanIp == null ? "" : lanIp.trim());
        if (!dev.matches()) return null;
        String lan = lanSubnet(r);
        Matcher net = IPV4.matcher(stripPrefix(lan));
        if (!net.matches()) return null;
        for (int i = 1; i <= 3; i++) {
            if (!dev.group(i).equals(net.group(i))) return null;
        }
        return mappedBase + "." + hostOctet(r) + "." + dev.group(4);
    }

    /**
     * LAN subnetini tekshiradi va normallashtiradi. Faqat xususiy diapazondagi aniq /24
     * qabul qilinadi (netmap 1:1 bo'lishi uchun) va VPN diapazonlari bilan kesishmasligi kerak.
     * @return normallashtirilgan "a.b.c.0/24" yoki xato bo'lsa null
     */
    public String normalizeLanSubnet(String input) {
        if (input == null) return null;
        String s = input.trim();
        if (!s.endsWith("/24")) return null;
        Matcher m = IPV4.matcher(stripPrefix(s));
        if (!m.matches()) return null;
        int a = Integer.parseInt(m.group(1)), b = Integer.parseInt(m.group(2)), c = Integer.parseInt(m.group(3));
        if (a > 255 || b > 255 || c > 255) return null;
        boolean isPrivate = a == 10 || (a == 172 && b >= 16 && b <= 31) || (a == 192 && b == 168);
        if (!isPrivate) return null;
        String normalized = a + "." + b + "." + c + ".0/24";
        if (normalized.startsWith(tunnelBase + ".") || normalized.startsWith(mappedBase + ".")) return null;
        return normalized;
    }

    private static String stripPrefix(String cidr) {
        if (cidr == null) return null;
        int slash = cidr.indexOf('/');
        return slash >= 0 ? cidr.substring(0, slash) : cidr;
    }
}
