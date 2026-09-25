package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * Maktabdagi Mikrotik router — Face ID terminallar va kameralar shu router orqali
 * VPN tunnel ichida markaziy platformaga ulanadi. Mini-PC gateway endi yo'q —
 * har bir maktab uchun bitta router, terminallar to'g'ridan-to'g'ri VPN IP orqali ishlaydi.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "mikrotik_routers")
public class MikrotikRouter {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false, unique = true)
    private School school;

    @Column(nullable = false)
    private String name;

    /** VPN tunnel ichidagi router IP manzili (masalan 10.20.0.5/32) — public IP emas. */
    @Column(name = "vpn_ip")
    private String vpnIp;

    /** RouterOS'ning o'z boshqaruv paneli (REST API) logini — "IP'lar ko'rish" (ARP/DHCP jadvali)
     * funksiyasi uchun ixtiyoriy. Face ID/kamera parollari bilan bir xil naqshda saqlanadi. */
    @Column(name = "router_admin_username")
    private String routerAdminUsername;

    @Column(name = "router_admin_password")
    private String routerAdminPassword;

    /** Maktabning lokal tarmog'i (Face ID/kameralar shu yerda), masalan 192.168.88.0/24.
     * Server uni VpnAddressing#mappedSubnet (10.30.N.0/24) orqali netmap bilan ko'radi.
     * Bo'sh bo'lsa standart 192.168.88.0/24 hisoblanadi. */
    @Column(name = "lan_subnet")
    private String lanSubnet;

    /** Davomat/heartbeat oqimlari uchun X-Api-Key — Device.apiKey o'rnini bosadi. */
    @Column(nullable = false, unique = true)
    private String apiKey;

    /** WireGuard ochiq kaliti — markaziy VPN serverida peer sifatida ro'yxatga olinadi. */
    @Column(name = "wg_public_key")
    private String wgPublicKey;

    /** WireGuard xususiy kaliti — faqat konfiguratsiya qayta yuklab olinishi uchun saqlanadi
     * (Mikrotik konfiguratsiya faylini o'zi generatsiya qilmaydi, platforma qiladi). */
    @Column(name = "wg_private_key")
    private String wgPrivateKey;

    /**
     * VPN transporti (2026-09-19). Standart — WireGuard; UDP ishlamaydigan maktablar uchun panelda
     * OpenVPN (TCP 443) tanlanadi. Ikkalasi ham to'liq avtomatik, bitta router bir vaqtda faqat
     * bittasida bo'ladi. Ustun keyin qo'shilgani uchun eski qatorlarda null — {@link #effectiveTransport()}.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "transport")
    private Transport transport;

    /** OpenVPN login paroli — wgPrivateKey kabi skriptni qayta generatsiya qilish uchun saqlanadi.
     * Hub unga faqat SHA-256 xeshi orqali ega bo'ladi (WireguardSyncController#ovpnClients). */
    @Column(name = "ovpn_password")
    private String ovpnPassword;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RouterStatus status = RouterStatus.OFFLINE;

    @Column
    private LocalDateTime lastHeartbeat;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = RouterStatus.OFFLINE;
    }

    public Transport effectiveTransport() {
        return transport != null ? transport : Transport.WIREGUARD;
    }

    /** OpenVPN common-name / login — id'ga bog'liq, o'zgarmas (vpnIp okteti emas). */
    public String ovpnUsername() {
        return "router" + id;
    }

    public enum RouterStatus {
        ONLINE, OFFLINE
    }

    public enum Transport {
        WIREGUARD, OPENVPN
    }
}
