package com.maktab.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Anthropic Messages API bilan to'g'ridan-to'g'ri HTTP orqali muloqot — rasmiy SDK
 * qo'shilmadi (yangi Maven bog'liqligi kiritmaslik uchun), chunki bu API oddiy
 * JSON POST bilan to'liq ishlaydi. java.net.http.HttpClient (JDK 17, qo'shimcha
 * kutubxonasiz) + Jackson (Spring Boot'da allaqachon bor) ishlatiladi.
 */
@Component
public class AnthropicClient {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";

    @Value("${app.ai.anthropic-api-key:}")
    private String apiKey;

    @Value("${app.ai.model:claude-sonnet-5}")
    private String model;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * @param systemPrompt tizim ko'rsatmasi
     * @param messages     Anthropic formatidagi xabarlar massivi (role: user/assistant, content: matn yoki block'lar)
     * @param tools        tool ta'riflari (nullable — bo'sh bo'lsa tool'siz so'rov)
     * @return Anthropic javobi (xom JSON) — chaqiruvchi "content"/"stop_reason"ni o'zi tahlil qiladi
     */
    public JsonNode sendMessage(String systemPrompt, JsonNode messages, JsonNode tools) throws IOException, InterruptedException {
        if (!isConfigured()) {
            throw new IllegalStateException("ANTHROPIC_API_KEY o'rnatilmagan");
        }
        var body = mapper.createObjectNode();
        body.put("model", model);
        body.put("max_tokens", 1536);
        body.put("system", systemPrompt);
        body.set("messages", messages);
        if (tools != null && !tools.isEmpty()) {
            body.set("tools", tools);
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("content-type", "application/json")
                .header("x-api-key", apiKey)
                .header("anthropic-version", ANTHROPIC_VERSION)
                .timeout(Duration.ofSeconds(60))
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode json = mapper.readTree(response.body());
        if (response.statusCode() >= 400) {
            String errMsg = json.path("error").path("message").asText(response.body());
            throw new IOException("Anthropic API xatosi (" + response.statusCode() + "): " + errMsg);
        }
        return json;
    }

    public ObjectMapper mapper() {
        return mapper;
    }
}
