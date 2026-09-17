package com.maktab.faceterminal;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * HTTP Digest Authentication (RFC 2617/7616, MD5, qop=auth) — Hikvision ISAPI va ko'pgina
 * boshqa qurilma-tomon HTTP API'lari shu bilan himoyalangan, lekin Java'ning standart
 * java.net.http.HttpClient'i Digest'ni o'zi qo'llab-quvvatlamaydi (faqat Basic). Shu sabab
 * qo'lda: (1) autentifikatsiyasiz so'rov -> 401 + WWW-Authenticate qaytadi -> (2) shu
 * challenge asosida Authorization: Digest header hisoblanib, so'rov qayta yuboriladi.
 */
public class DigestAuthHttpClient {

    private final HttpClient httpClient;
    private final String username;
    private final String password;
    private final AtomicInteger nonceCount = new AtomicInteger(0);

    public DigestAuthHttpClient(String username, String password) {
        this.username = username;
        this.password = password;
        // MUHIM (2026-09-17): trust-all SSLContext faqat sertifikat ISHONCHINI o'chiradi —
        // Java'ning java.net.http.HttpClient'i ALOHIDA, standart yoqilgan HOSTNAME/ENDPOINT
        // tekshiruvini ("Subject Alternative Name" moslikmi) o'chirmasa, kamera/terminal
        // sertifikatlarida odatda SAN umuman yo'qligi sabab "certificate_unknown: No subject
        // alternative names present" xatosi bilan barbir rad etadi. Shu sabab SSLParameters'da
        // endpointIdentificationAlgorithm ham bo'shatiladi.
        javax.net.ssl.SSLParameters noHostnameCheck = new javax.net.ssl.SSLParameters();
        noHostnameCheck.setEndpointIdentificationAlgorithm("");
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(8))
            .sslContext(TrustAllSslContext.INSTANCE)
            .sslParameters(noHostnameCheck)
            .build();
    }

    /** JSON body bilan so'rov (masalan ISAPI UserInfo/Record). */
    public HttpResponse<String> requestJson(String method, URI uri, String jsonBody) throws Exception {
        HttpRequest.BodyPublisher body = jsonBody != null
            ? HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8)
            : HttpRequest.BodyPublishers.noBody();
        return executeWithDigest(method, uri, body, "application/json", null);
    }

    /**
     * multipart/form-data so'rov (masalan FDLib/FDSetUp — JSON qism + rasm binary qismi).
     * Hikvision ISAPI'ning ko'p endpointlari qat'iy multipart tuzilishni talab qiladi:
     * birinchi qism "FaceDataRecord" (JSON, Content-Type: application/json), ikkinchisi
     * "img" (rasm binary).
     */
    public HttpResponse<String> requestMultipart(URI uri, String jsonPartName, String json,
                                                  String filePartName, byte[] imageBytes, String imageContentType) throws Exception {
        return requestMultipart("POST", uri, jsonPartName, json, filePartName, imageBytes, imageContentType);
    }

    /** ISAPI'da ba'zi multipart endpointlar PUT talab qiladi (masalan FDLib/FDSetUp). */
    public HttpResponse<String> requestMultipart(String method, URI uri, String jsonPartName, String json,
                                                  String filePartName, byte[] imageBytes, String imageContentType) throws Exception {
        String boundary = "----maktabFaceBoundary" + System.currentTimeMillis();
        byte[] multipartBody = buildMultipartBody(boundary, jsonPartName, json, filePartName, imageBytes, imageContentType);
        return executeWithDigest(method, uri, () -> HttpRequest.BodyPublishers.ofByteArray(multipartBody),
            "multipart/form-data; boundary=" + boundary, null, HttpResponse.BodyHandlers.ofString());
    }

    /** Ixtiyoriy matnli body (masalan XML: eshik boshqaruvi, reboot, vaqt). body null bo'lsa bo'sh. */
    public HttpResponse<String> requestText(String method, URI uri, String body, String contentType) throws Exception {
        return executeWithDigest(method, uri,
            () -> body != null ? HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8) : HttpRequest.BodyPublishers.noBody(),
            contentType, null, HttpResponse.BodyHandlers.ofString());
    }

    /** Binary GET (masalan voqea snapshot rasmi). */
    public HttpResponse<byte[]> getBytes(URI uri) throws Exception {
        return executeWithDigest("GET", uri, HttpRequest.BodyPublishers::noBody, "application/octet-stream", null,
            HttpResponse.BodyHandlers.ofByteArray());
    }

    private HttpResponse<String> executeWithDigest(String method, URI uri, HttpRequest.BodyPublisher body,
                                                     String contentType, String existingAuthHeader) throws Exception {
        return executeWithDigest(method, uri, () -> body, contentType, existingAuthHeader, HttpResponse.BodyHandlers.ofString());
    }

    /**
     * Body har urinishda yangidan yaratiladi (Supplier) — 401 challenge'dan keyingi qayta
     * yuborishda bir marta o'qilgan publisher qayta ishlatilib qolmasligi uchun.
     */
    private <T> HttpResponse<T> executeWithDigest(String method, URI uri, java.util.function.Supplier<HttpRequest.BodyPublisher> body,
                                                   String contentType, String existingAuthHeader,
                                                   HttpResponse.BodyHandler<T> handler) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri)
            .timeout(java.time.Duration.ofSeconds(15))
            .header("Content-Type", contentType)
            .method(method, body.get());
        if (existingAuthHeader != null) {
            builder.header("Authorization", existingAuthHeader);
        }
        // MUHIM (2026-09-17): HttpRequest#timeout ba'zi tarmoq holatlarida (ulanish o'rnatiladi,
        // lekin javob paketlari hech qachon kelmaydi — masalan ko'p qavatli VPN orqali rasm
        // yuklashda) ishonchli ishlamaydi — so'rov CHEKSIZ osilib qolishi mumkin, bu esa yagona
        // Spring scheduler oqimini butunlay to'xtatib qo'yadi (FaceTerminalMonitor). Shu sabab
        // sendAsync + orTimeout bilan QATTIQ, JVM darajasidagi muhlat qo'shiladi — HttpClient'ning
        // o'z muhlati ishlamasa ham, bu albatta ishlaydi.
        HttpResponse<T> response;
        try {
            response = httpClient.sendAsync(builder.build(), handler)
                .orTimeout(16, TimeUnit.SECONDS)
                .get();
        } catch (java.util.concurrent.ExecutionException e) {
            if (e.getCause() instanceof TimeoutException) {
                throw new java.net.http.HttpTimeoutException("So'rov 16 soniyada javob bermadi (qattiq muhlat): " + uri);
            }
            if (e.getCause() instanceof Exception cause) throw cause;
            throw e;
        }

        if (response.statusCode() != 401 || existingAuthHeader != null) {
            return response; // muvaffaqiyat, yoki Digest bilan ham 401 (noto'g'ri parol)
        }

        String challenge = response.headers().firstValue("WWW-Authenticate").orElse(null);
        if (challenge == null || !challenge.toLowerCase().startsWith("digest")) {
            return response; // Digest emas — chaqiruvchi xatoni o'zi ko'radi
        }

        String authHeader = buildDigestHeader(challenge, method, uri.getRawPath() + queryOf(uri));
        return executeWithDigest(method, uri, body, contentType, authHeader, handler);
    }

    private String queryOf(URI uri) {
        return uri.getRawQuery() != null ? "?" + uri.getRawQuery() : "";
    }

    private String buildDigestHeader(String challenge, String method, String digestUri) throws Exception {
        Map<String, String> params = parseChallenge(challenge);
        String realm = params.get("realm");
        String nonce = params.get("nonce");
        String qop = params.get("qop");
        String opaque = params.get("opaque");

        String ha1 = md5(username + ":" + realm + ":" + password);
        String ha2 = md5(method + ":" + digestUri);

        String nc = String.format("%08x", nonceCount.incrementAndGet());
        String cnonce = Long.toHexString(System.nanoTime());

        String response;
        StringBuilder header = new StringBuilder("Digest ");
        header.append("username=\"").append(username).append("\", ");
        header.append("realm=\"").append(realm).append("\", ");
        header.append("nonce=\"").append(nonce).append("\", ");
        header.append("uri=\"").append(digestUri).append("\", ");

        if (qop != null && !qop.isBlank()) {
            String qopValue = qop.contains("auth") ? "auth" : qop.split(",")[0].trim();
            response = md5(ha1 + ":" + nonce + ":" + nc + ":" + cnonce + ":" + qopValue + ":" + ha2);
            header.append("qop=").append(qopValue).append(", ");
            header.append("nc=").append(nc).append(", ");
            header.append("cnonce=\"").append(cnonce).append("\", ");
        } else {
            response = md5(ha1 + ":" + nonce + ":" + ha2);
        }
        header.append("response=\"").append(response).append("\"");
        if (opaque != null) header.append(", opaque=\"").append(opaque).append("\"");
        return header.toString();
    }

    private Map<String, String> parseChallenge(String challenge) {
        Map<String, String> result = new HashMap<>();
        String body = challenge.substring(challenge.indexOf(' ') + 1);
        Pattern p = Pattern.compile("(\\w+)=\"?([^\",]+)\"?");
        Matcher m = p.matcher(body);
        while (m.find()) {
            result.put(m.group(1).trim(), m.group(2).trim());
        }
        return result;
    }

    private String md5(String input) throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : digest) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private byte[] buildMultipartBody(String boundary, String jsonPartName, String json,
                                       String filePartName, byte[] imageBytes, String imageContentType) throws Exception {
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        String crlf = "\r\n";

        out.write(("--" + boundary + crlf).getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"" + jsonPartName + "\"" + crlf).getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Type: application/json" + crlf + crlf).getBytes(StandardCharsets.UTF_8));
        out.write(json.getBytes(StandardCharsets.UTF_8));
        out.write(crlf.getBytes(StandardCharsets.UTF_8));

        out.write(("--" + boundary + crlf).getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"" + filePartName + "\"; filename=\"face.jpg\"" + crlf).getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Type: " + imageContentType + crlf + crlf).getBytes(StandardCharsets.UTF_8));
        out.write(imageBytes);
        out.write(crlf.getBytes(StandardCharsets.UTF_8));

        out.write(("--" + boundary + "--" + crlf).getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }
}
