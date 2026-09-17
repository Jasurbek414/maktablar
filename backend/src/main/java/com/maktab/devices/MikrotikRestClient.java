package com.maktab.devices;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maktab.faceterminal.TerminalException;

import java.net.ConnectException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * RouterOS'ning o'z REST API'siga (Basic Auth) murojaat qiluvchi minimal klient — Face ID/kamera
 * uchun ishlatilgan Digest auth'dan farqli, Mikrotik REST oddiy Basic Auth ishlatadi.
 *
 * Faqat o'qish (GET) uchun — router konfiguratsiyasini o'zgartirmaydi. Maqsad: "Terminal qo'shish"
 * formasida IP maydonini routerning ARP/DHCP jadvalidan olingan haqiqiy ulangan qurilmalar bilan
 * to'ldirish (2026-09-16 so'ralgan).
 */
public class MikrotikRestClient {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final String baseUrl;
    private final String authHeader;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public MikrotikRestClient(String baseUrl, String username, String password) {
        this.baseUrl = baseUrl;
        this.authHeader = "Basic " + Base64.getEncoder().encodeToString(
            (username + ":" + password).getBytes(StandardCharsets.UTF_8));
    }

    public record LanHost(String ipAddress, String macAddress, String hostName, String source) {}

    /**
     * ARP jadvali (barcha ko'ringan qurilmalar, statik xotira kerak emas) + DHCP ijaralari
     * (ko'pincha hostname bor) birlashtiriladi, IP bo'yicha dublikat olib tashlanadi.
     */
    public List<LanHost> lanHosts() {
        Map<String, LanHost> byIp = new LinkedHashMap<>();
        for (JsonNode n : getArray("/rest/ip/arp")) {
            String ip = text(n, "address");
            if (ip == null || ip.isBlank() || "false".equals(text(n, "complete"))) continue;
            byIp.put(ip, new LanHost(ip, text(n, "mac-address"), null, "arp"));
        }
        for (JsonNode n : getArray("/rest/ip/dhcp-server/lease")) {
            String ip = text(n, "address");
            if (ip == null || ip.isBlank()) continue;
            String host = text(n, "host-name");
            LanHost existing = byIp.get(ip);
            byIp.put(ip, new LanHost(ip, existing != null ? existing.macAddress() : text(n, "mac-address"),
                host != null && !host.isBlank() ? host : null, "dhcp"));
        }
        return new ArrayList<>(byIp.values());
    }

    private List<JsonNode> getArray(String path) {
        HttpResponse<String> resp;
        try {
            resp = http.send(HttpRequest.newBuilder(URI.create(baseUrl + path))
                .timeout(Duration.ofSeconds(8))
                .header("Authorization", authHeader)
                .GET().build(), HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            throw connectionError(e);
        }
        if (resp.statusCode() == 401) {
            throw new TerminalException("Router admin login/paroli noto'g'ri");
        }
        if (resp.statusCode() >= 300) {
            throw new TerminalException("Router " + path + " so'roviga xato qaytardi: HTTP " + resp.statusCode());
        }
        try {
            JsonNode n = JSON.readTree(resp.body());
            List<JsonNode> list = new ArrayList<>();
            if (n.isArray()) n.forEach(list::add);
            return list;
        } catch (Exception e) {
            throw new TerminalException("Router javobini o'qib bo'lmadi");
        }
    }

    private static String text(JsonNode n, String field) {
        return n.hasNonNull(field) ? n.get(field).asText() : null;
    }

    private TerminalException connectionError(Exception e) {
        if (e instanceof HttpConnectTimeoutException || e instanceof HttpTimeoutException
                || e instanceof ConnectException || e.getCause() instanceof ConnectException) {
            return new TerminalException("Router javob bermadi (" + baseUrl + ") — router ONLINE ekanini tekshiring");
        }
        return new TerminalException("Router bilan aloqa xatosi: " + e.getClass().getSimpleName());
    }
}
