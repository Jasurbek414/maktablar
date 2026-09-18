package com.maktab.faceterminal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.net.ConnectException;
import java.net.URI;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Hikvision kirish nazorati terminali (DS-K1T seriyasi) uchun ISAPI klienti — bitta terminal
 * uchun yaratiladi (TerminalEndpointResolver#hikvision).
 *
 * Endpointlar DS-K1T673DX (firmware V4.41.1) qurilmasining /capabilities javoblari asosida
 * tanlangan va shu qurilmada sinalgan:
 *  - foydalanuvchi:  UserInfo/SetUp (PUT, yaratadi yoki yangilaydi), UserInfo/Search, UserInfo/Delete
 *  - yuz:            FDLib/FDSetUp (PUT multipart, qo'shadi yoki almashtiradi), faceLibType=blackFD, FDID=1
 *  - voqealar:       AcsEvent (beginSerialNo bilan — oxirgi o'qilgandan keyingilarini, yo'qotishsiz)
 *  - boshqaruv:      RemoteControl/door/1, System/reboot, System/time
 */
public class HikvisionIsapiClient {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String FACE_LIB_TYPE = "blackFD";
    private static final String FDID = "1";
    /** Qurilma bitta so'rovda ko'pi bilan 30 ta voqea/foydalanuvchi qaytaradi (capabilities: maxResults 30). */
    public static final int MAX_PAGE = 30;

    private final String baseUrl;
    private final DigestAuthHttpClient http;

    public HikvisionIsapiClient(String baseUrl, String username, String password) {
        this.baseUrl = baseUrl;
        this.http = new DigestAuthHttpClient(username, password);
    }

    public String baseUrl() { return baseUrl; }

    // ─── Holat ───────────────────────────────────────────────────────────────────

    /** deviceType: ACS (kirish nazorati / Face ID), IPCamera, IPDome, NVR, DVR, ... */
    public record DeviceInfo(String deviceName, String model, String serialNumber, String macAddress,
                             String firmwareVersion, String deviceType) {}

    public DeviceInfo deviceInfo() {
        String xml = checkXml(send("GET", "/ISAPI/System/deviceInfo", null, null), "qurilma ma'lumotini olish");
        String fw = xmlTag(xml, "firmwareVersion");
        String fwDate = xmlTag(xml, "firmwareReleasedDate");
        return new DeviceInfo(xmlTag(xml, "deviceName"), xmlTag(xml, "model"), xmlTag(xml, "serialNumber"),
            xmlTag(xml, "macAddress"), fw != null && fwDate != null ? fw + " " + fwDate : fw, xmlTag(xml, "deviceType"));
    }

    public record UserCounts(int users, int usersWithFace) {}

    public UserCounts userCounts() {
        JsonNode n = checkJson(send("GET", "/ISAPI/AccessControl/UserInfo/Count?format=json", null, null), "foydalanuvchilar sonini olish");
        JsonNode c = n.path("UserInfoCount");
        return new UserCounts(c.path("userNumber").asInt(0), c.path("bindFaceUserNumber").asInt(0));
    }

    public record DeviceTime(String timeMode, OffsetDateTime localTime, String timeZone) {}

    public DeviceTime deviceTime() {
        String xml = checkXml(send("GET", "/ISAPI/System/time", null, null), "qurilma vaqtini olish");
        OffsetDateTime t = null;
        try { t = OffsetDateTime.parse(xmlTag(xml, "localTime")); } catch (Exception ignore) { }
        return new DeviceTime(xmlTag(xml, "timeMode"), t, xmlTag(xml, "timeZone"));
    }

    /** Qurilma vaqtini berilgan vaqtga qo'lda o'rnatadi (NTP o'chadi). Vaqt mintaqasi offset'dan olinadi. */
    public void setTime(OffsetDateTime now) {
        int offsetSec = now.getOffset().getTotalSeconds();
        // Hikvision POSIX TZ yozuvi: UTC+5 -> "CST-5:00:00" (belgi teskari)
        String tz = String.format("CST%s%d:%02d:00", offsetSec >= 0 ? "-" : "+",
            Math.abs(offsetSec) / 3600, (Math.abs(offsetSec) % 3600) / 60);
        String body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Time version=\"2.0\" xmlns=\"http://www.isapi.org/ver20/XMLSchema\">"
            + "<timeMode>manual</timeMode><localTime>" + now.withNano(0).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            + "</localTime><timeZone>" + tz + "</timeZone></Time>";
        checkXml(send("PUT", "/ISAPI/System/time", body, "application/xml"), "qurilma vaqtini o'rnatish");
    }

    // ─── Kamera ──────────────────────────────────────────────────────────────────

    /**
     * Joriy kadr (JPEG). channel — Hikvision oqim ID'si, masalan "101" (1-kanal asosiy oqim);
     * kamera, NVR va Face ID terminalda ham shu endpoint (DS-K1T673DX'da sinalgan).
     */
    public byte[] snapshot(String channel) {
        String ch = channel != null && channel.matches("\\d{1,5}") ? channel : "101";
        HttpResponse<byte[]> resp;
        try {
            resp = http.getBytes(uri("/ISAPI/Streaming/channels/" + ch + "/picture"));
        } catch (Exception e) {
            throw connectionError(e);
        }
        authCheck(resp, "kadr olish");
        String ct = resp.headers().firstValue("Content-Type").orElse("");
        byte[] body = resp.body();
        if (resp.statusCode() != 200 || !ct.startsWith("image/") || body == null || body.length == 0) {
            throw new TerminalException("Kamera kadr qaytarmadi (HTTP " + resp.statusCode()
                + (resp.statusCode() == 404 ? ", " + ch + "-kanal mavjud emas" : "") + ")");
        }
        return body;
    }

    // ─── NVR (registrator) ───────────────────────────────────────────────────────
    // NVR'ning IP-kamera kanallari: kanal N ning asosiy oqimi Streaming ID'si N*100+1 (1 -> "101").

    public record NvrChannel(int id, String name, String ipAddress, Boolean online) {}

    /** NVR'ga ulangan IP-kameralar ro'yxati (holati bilan, agar NVR holatni ham bersa). */
    public List<NvrChannel> nvrChannels() {
        HttpResponse<String> resp = send("GET", "/ISAPI/ContentMgmt/InputProxy/channels", null, null);
        if (resp.statusCode() == 404) {
            throw new TerminalException("Bu qurilma IP-kameralar ro'yxatini bermadi (HTTP 404) — u NVR emas yoki analog DVR");
        }
        List<NvrChannel> channels = parseNvrChannels(checkXml(resp, "NVR kanallarini olish"));
        Map<Integer, Boolean> online;
        try {
            online = nvrChannelOnline();
        } catch (TerminalException e) {
            online = Map.of(); // holat ixtiyoriy — ro'yxatning o'zi yetarli
        }
        List<NvrChannel> result = new ArrayList<>(channels.size());
        for (NvrChannel ch : channels) {
            result.add(new NvrChannel(ch.id(), ch.name(), ch.ipAddress(), online.get(ch.id())));
        }
        return result;
    }

    /** Har bir NVR kanalining onlayn holati (kanal id -> kamera NVR'ga ulanganmi). */
    public Map<Integer, Boolean> nvrChannelOnline() {
        return parseNvrChannelStatus(checkXml(send("GET", "/ISAPI/ContentMgmt/InputProxy/channels/status", null, null),
            "NVR kanal holatini olish"));
    }

    // "<InputProxyChannel>" — "(?:\s[^>]*)?>" sharti "<InputProxyChannelList>" ni o'tkazib yuboradi.
    private static final Pattern NVR_CHANNEL_BLOCK = Pattern.compile("(?s)<InputProxyChannel(?:\\s[^>]*)?>(.*?)</InputProxyChannel>");
    private static final Pattern NVR_STATUS_BLOCK = Pattern.compile("(?s)<InputProxyChannelStatus(?:\\s[^>]*)?>(.*?)</InputProxyChannelStatus>");

    static List<NvrChannel> parseNvrChannels(String xml) {
        List<NvrChannel> list = new ArrayList<>();
        Matcher m = NVR_CHANNEL_BLOCK.matcher(xml == null ? "" : xml);
        while (m.find()) {
            String block = m.group(1);
            Integer id = parseIntOrNull(xmlTag(block, "id"));
            if (id == null) continue;
            list.add(new NvrChannel(id, xmlTag(block, "name"), xmlTag(block, "ipAddress"), null));
        }
        return list;
    }

    static Map<Integer, Boolean> parseNvrChannelStatus(String xml) {
        Map<Integer, Boolean> map = new LinkedHashMap<>();
        Matcher m = NVR_STATUS_BLOCK.matcher(xml == null ? "" : xml);
        while (m.find()) {
            String block = m.group(1);
            Integer id = parseIntOrNull(xmlTag(block, "id"));
            if (id != null) map.put(id, "true".equalsIgnoreCase(xmlTag(block, "online")));
        }
        return map;
    }

    private static Integer parseIntOrNull(String s) {
        try {
            return s == null ? null : Integer.valueOf(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // ─── Boshqaruv ───────────────────────────────────────────────────────────────

    /** cmd: open | close | alwaysOpen | alwaysClose */
    public void door(int doorNo, String cmd) {
        String body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><RemoteControlDoor version=\"2.0\" xmlns=\"http://www.isapi.org/ver20/XMLSchema\">"
            + "<cmd>" + cmd + "</cmd></RemoteControlDoor>";
        checkXml(send("PUT", "/ISAPI/AccessControl/RemoteControl/door/" + doorNo, body, "application/xml"), "eshikni boshqarish");
    }

    public void reboot() {
        checkXml(send("PUT", "/ISAPI/System/reboot", null, "application/xml"), "qurilmani qayta yuklash");
    }

    // ─── Foydalanuvchilar va yuzlar ──────────────────────────────────────────────

    /** Foydalanuvchini yaratadi yoki (mavjud bo'lsa) yangilaydi — bitta so'rov. */
    public void upsertUser(String employeeNo, String name) {
        ObjectNode root = JSON.createObjectNode();
        ObjectNode u = root.putObject("UserInfo");
        u.put("employeeNo", employeeNo);
        u.put("name", truncate(name, 128));
        u.put("userType", "normal");
        ObjectNode valid = u.putObject("Valid");
        valid.put("enable", true);
        valid.put("beginTime", "2020-01-01T00:00:00");
        valid.put("endTime", "2037-12-31T23:59:59");
        valid.put("timeType", "local");
        ArrayNode rights = u.putArray("RightPlan");
        ObjectNode plan = rights.addObject();
        plan.put("doorNo", 1);
        plan.put("planTemplateNo", "1");
        u.put("doorRight", "1");
        checkJson(send("PUT", "/ISAPI/AccessControl/UserInfo/SetUp?format=json", root.toString(), "application/json"),
            "foydalanuvchini yozish");
    }

    /** Yuz rasmini foydalanuvchiga bog'lab yuklaydi (mavjud yuz almashtiriladi). */
    public void setFace(String employeeNo, byte[] jpeg) {
        ObjectNode rec = JSON.createObjectNode();
        rec.put("faceLibType", FACE_LIB_TYPE);
        rec.put("FDID", FDID);
        rec.put("FPID", employeeNo);
        try {
            HttpResponse<String> resp = http.requestMultipart("PUT", uri("/ISAPI/Intelligent/FDLib/FDSetUp?format=json"),
                "FaceDataRecord", rec.toString(), "img", jpeg, "image/jpeg");
            checkJson(resp, "yuz rasmini yuklash");
        } catch (TerminalException e) {
            throw e;
        } catch (Exception e) {
            throw connectionError(e);
        }
    }

    /** Foydalanuvchini (va unga bog'langan yuzni) qurilmadan o'chiradi. */
    public void deleteUser(String employeeNo) {
        ObjectNode root = JSON.createObjectNode();
        root.putObject("UserInfoDelCond").putArray("EmployeeNoList").addObject().put("employeeNo", employeeNo);
        checkJson(send("PUT", "/ISAPI/AccessControl/UserInfo/Delete?format=json", root.toString(), "application/json"),
            "foydalanuvchini o'chirish");
    }

    public record DeviceUser(String employeeNo, String name, int faces) {}
    public record UserPage(List<DeviceUser> users, int total) {}

    public UserPage searchUsers(int position, int max) {
        ObjectNode root = JSON.createObjectNode();
        ObjectNode c = root.putObject("UserInfoSearchCond");
        c.put("searchID", UUID.randomUUID().toString().substring(0, 16));
        c.put("searchResultPosition", Math.max(0, position));
        c.put("maxResults", Math.min(MAX_PAGE, Math.max(1, max)));
        JsonNode n = checkJson(send("POST", "/ISAPI/AccessControl/UserInfo/Search?format=json", root.toString(), "application/json"),
            "foydalanuvchilar ro'yxatini olish").path("UserInfoSearch");
        List<DeviceUser> users = new ArrayList<>();
        for (JsonNode u : n.path("UserInfo")) {
            users.add(new DeviceUser(u.path("employeeNo").asText(), u.path("name").asText(), u.path("numOfFace").asInt(0)));
        }
        return new UserPage(users, n.path("totalMatches").asInt(users.size()));
    }

    // ─── Voqealar ────────────────────────────────────────────────────────────────

    public record AcsEvent(long serialNo, int major, int minor, OffsetDateTime time, String employeeNo, String pictureUrl) {}
    public record EventPage(List<AcsEvent> events, boolean more) {}

    /** Qurilma qabul qiladigan eng katta tartib raqami (capabilities: endSerialNo max 3000000000). */
    private static final long MAX_SERIAL = 3_000_000_000L;

    /** Berilgan tartib raqamidan (shu jumladan) boshlab voqealar, o'sish tartibida. */
    public EventPage eventsFromSerial(long beginSerialNo, int max) {
        ObjectNode cond = eventCond(max);
        long begin = Math.max(1, beginSerialNo);
        cond.put("beginSerialNo", begin);
        // Bu firmware beginSerialNo'ni faqat endSerialNo bilan birga qabul qiladi (yolg'iz bo'lsa badJsonContent)
        cond.put("endSerialNo", Math.min(MAX_SERIAL, begin + 1_000_000L));
        return searchEvents(cond);
    }

    /** Vaqt oralig'idagi voqealar (qo'lda qayta tiklash uchun). */
    public EventPage eventsBetween(OffsetDateTime from, OffsetDateTime to, int position, int max) {
        ObjectNode cond = eventCond(max);
        cond.put("searchResultPosition", Math.max(0, position));
        cond.put("startTime", from.withNano(0).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        cond.put("endTime", to.withNano(0).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        return searchEvents(cond);
    }

    /** Qurilmadagi eng oxirgi voqeaning tartib raqami (voqea bo'lmasa 0). */
    public long latestSerial() {
        ObjectNode cond = eventCond(1);
        cond.put("timeReverseOrder", true);
        List<AcsEvent> list = searchEvents(cond).events();
        return list.isEmpty() ? 0 : list.get(0).serialNo();
    }

    /**
     * Voqea snapshot rasmini yuklab oladi. Qurilma URL'ni o'zining LAN IP'si bilan qaytaradi
     * (http://192.168.88.253/LOCALS/...) — backend unga VPN manzili orqali yetadi, shuning uchun
     * faqat path/query olinib, shu klientning baseUrl'iga qo'shiladi.
     */
    public byte[] downloadPicture(String pictureUrl) {
        if (pictureUrl == null || pictureUrl.isBlank()) return null;
        try {
            URI original = URI.create(pictureUrl.trim());
            String pathAndQuery = (original.getRawPath() != null ? original.getRawPath() : "")
                + (original.getRawQuery() != null ? "?" + original.getRawQuery() : "");
            if (!pathAndQuery.startsWith("/")) return null;
            HttpResponse<byte[]> resp = http.getBytes(uri(pathAndQuery));
            return resp.statusCode() == 200 && resp.body() != null && resp.body().length > 0 ? resp.body() : null;
        } catch (Exception e) {
            return null; // rasm ixtiyoriy — davomat yozuvi rasmsiz ham saqlanadi
        }
    }

    private ObjectNode eventCond(int max) {
        ObjectNode cond = JSON.createObjectNode();
        cond.put("searchID", UUID.randomUUID().toString().substring(0, 16));
        cond.put("searchResultPosition", 0);
        cond.put("maxResults", Math.min(MAX_PAGE, Math.max(1, max)));
        cond.put("major", 0);
        cond.put("minor", 0);
        return cond;
    }

    private EventPage searchEvents(ObjectNode cond) {
        ObjectNode root = JSON.createObjectNode();
        root.set("AcsEventCond", cond);
        JsonNode n = checkJson(send("POST", "/ISAPI/AccessControl/AcsEvent?format=json", root.toString(), "application/json"),
            "voqealarni olish").path("AcsEvent");
        List<AcsEvent> events = new ArrayList<>();
        for (JsonNode e : n.path("InfoList")) {
            OffsetDateTime t = null;
            try { t = OffsetDateTime.parse(e.path("time").asText()); } catch (Exception ignore) { }
            String emp = e.hasNonNull("employeeNoString") ? e.path("employeeNoString").asText()
                : (e.hasNonNull("employeeNo") ? e.path("employeeNo").asText() : null);
            events.add(new AcsEvent(e.path("serialNo").asLong(0), e.path("major").asInt(0), e.path("minor").asInt(0),
                t, emp != null && !emp.isBlank() ? emp : null,
                e.hasNonNull("pictureURL") ? e.path("pictureURL").asText() : null));
        }
        return new EventPage(events, "MORE".equalsIgnoreCase(n.path("responseStatusStrg").asText()));
    }

    // ─── Ichki yordamchilar ──────────────────────────────────────────────────────

    private URI uri(String path) {
        return URI.create(baseUrl + path);
    }

    private HttpResponse<String> send(String method, String path, String body, String contentType) {
        try {
            if (body == null && "GET".equals(method)) {
                return http.requestText("GET", uri(path), null, "application/xml");
            }
            return http.requestText(method, uri(path), body, contentType != null ? contentType : "application/xml");
        } catch (Exception e) {
            throw connectionError(e);
        }
    }

    private TerminalException connectionError(Exception e) {
        if (e instanceof HttpConnectTimeoutException || e instanceof HttpTimeoutException || e instanceof ConnectException
                || (e.getCause() instanceof ConnectException)) {
            return new TerminalException("Terminal javob bermadi (" + baseUrl + ") — qurilma yoqilganini va router VPN'ga ulanganini tekshiring", e);
        }
        return new TerminalException("Terminal bilan aloqa xatosi: " + e.getClass().getSimpleName()
            + (e.getMessage() != null ? " - " + e.getMessage() : ""), e);
    }

    private JsonNode checkJson(HttpResponse<String> resp, String action) {
        authCheck(resp, action);
        JsonNode n;
        try {
            n = JSON.readTree(resp.body() == null || resp.body().isBlank() ? "{}" : resp.body());
        } catch (Exception e) {
            throw new TerminalException("Terminal " + action + " so'roviga noto'g'ri javob qaytardi (HTTP " + resp.statusCode() + ")");
        }
        int status = n.path("statusCode").asInt(1);
        if (resp.statusCode() >= 300 || status != 1) {
            throw new TerminalException("Terminal " + action + " so'rovini rad etdi: " + describeError(n, resp.statusCode()));
        }
        return n;
    }

    private String checkXml(HttpResponse<String> resp, String action) {
        authCheck(resp, action);
        String body = resp.body() == null ? "" : resp.body();
        String status = xmlTag(body, "statusCode");
        if (resp.statusCode() >= 300 || (status != null && !"1".equals(status))) {
            String sub = xmlTag(body, "subStatusCode");
            String str = xmlTag(body, "statusString");
            throw new TerminalException("Terminal " + action + " so'rovini rad etdi: HTTP " + resp.statusCode()
                + (str != null ? " " + str : "") + (sub != null ? " (" + sub + ")" : ""));
        }
        return body;
    }

    private void authCheck(HttpResponse<?> resp, String action) {
        if (resp.statusCode() == 401) {
            throw new TerminalException("Terminal login yoki paroli noto'g'ri (" + action + "). Diqqat: bir necha marta noto'g'ri urinishdan keyin Hikvision qurilmani vaqtincha bloklaydi");
        }
    }

    private static String describeError(JsonNode n, int httpStatus) {
        Map<String, String> parts = new LinkedHashMap<>();
        for (String k : new String[]{"statusString", "subStatusCode", "errorMsg"}) {
            if (n.hasNonNull(k) && !n.path(k).asText().isBlank()) parts.put(k, n.path(k).asText());
        }
        String sub = parts.getOrDefault("subStatusCode", "");
        String hint = switch (sub) {
            case "faceDataPictureNotDetected", "faceNotDetected", "noFace" -> " — rasmda yuz aniqlanmadi, aniqroq old tomondan rasm yuklang";
            case "pictureSizeExceedLimit", "imageSizeExceeded" -> " — rasm hajmi juda katta";
            case "faceLibNumOverLimit", "userNumExceed" -> " — qurilma xotirasi to'lgan";
            case "employeeNoAlreadyExist" -> " — bu ID qurilmada allaqachon bor";
            default -> "";
        };
        return "HTTP " + httpStatus + " " + String.join(" / ", parts.values()) + hint;
    }

    private static String xmlTag(String xml, String tag) {
        if (xml == null) return null;
        Matcher m = Pattern.compile("<" + tag + "(?:\\s[^>]*)?>([^<]*)</" + tag + ">").matcher(xml);
        return m.find() ? m.group(1).trim() : null;
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }
}
