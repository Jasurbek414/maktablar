package com.maktab.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.maktab.model.User;
import com.maktab.security.CurrentUserService;
import com.maktab.service.AiToolService;
import com.maktab.service.AnthropicClient;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AI chat — maktab ma'lumotlariga asoslangan yordamchi (Anthropic Claude, tool-use).
 * Claude HECH QACHON xom SQL yoki bevosita repository'ga kirish huquqiga ega emas —
 * faqat AiToolService'dagi, chaqiruvchining o'z ko'lami bilan CHEKLANGAN, oldindan
 * belgilangan funksiyalarni "so'rashi" mumkin. Shu sabab AI hech qachon boshqa
 * maktab/o'quvchi ma'lumotini oshkor qila olmaydi — xuddi qolgan API'lar kabi.
 */
@RestController
@RequestMapping("/api/ai-chat")
public class AiChatController {

    @Autowired private AnthropicClient anthropicClient;
    @Autowired private AiToolService toolService;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    private final ObjectMapper mapper = new ObjectMapper();

    private static final int MAX_TOOL_ITERATIONS = 5;

    @PostMapping
    public ResponseEntity<?> chat(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                   @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        if (!anthropicClient.isConfigured()) {
            return ResponseEntity.status(503).body(Map.of("error", i18n.msg("error.ai.not_configured")));
        }

        Object rawMessages = body.get("messages");
        if (!(rawMessages instanceof List<?> list) || list.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.request.invalid_data")));
        }

        try {
            ArrayNode messages = mapper.createArrayNode();
            for (Object item : list) {
                if (!(item instanceof Map<?, ?> m)) continue;
                ObjectNode node = mapper.createObjectNode();
                node.put("role", String.valueOf(m.get("role")));
                node.put("content", String.valueOf(m.get("content")));
                messages.add(node);
            }

            String system = buildSystemPrompt(caller);
            ArrayNode tools = buildToolDefinitions();

            String finalText = null;
            for (int i = 0; i < MAX_TOOL_ITERATIONS && finalText == null; i++) {
                JsonNode response = anthropicClient.sendMessage(system, messages, tools);
                String stopReason = response.path("stop_reason").asText();
                JsonNode content = response.path("content");

                if (!"tool_use".equals(stopReason)) {
                    finalText = extractText(content);
                    break;
                }

                // Claude bir yoki bir nechta vositani chaqirmoqchi — javobning o'zini
                // "assistant" xabari sifatida qo'shamiz, so'ng har bir vosita natijasini
                // "tool_result" content-blok bilan yangi "user" xabarida qaytaramiz.
                ObjectNode assistantMsg = mapper.createObjectNode();
                assistantMsg.put("role", "assistant");
                assistantMsg.set("content", content);
                messages.add(assistantMsg);

                ArrayNode toolResults = mapper.createArrayNode();
                for (JsonNode block : content) {
                    if (!"tool_use".equals(block.path("type").asText())) continue;
                    String toolName = block.path("name").asText();
                    String toolUseId = block.path("id").asText();
                    JsonNode input = block.path("input");
                    Object result = executeTool(caller, toolName, input);

                    ObjectNode toolResult = mapper.createObjectNode();
                    toolResult.put("type", "tool_result");
                    toolResult.put("tool_use_id", toolUseId);
                    toolResult.put("content", mapper.writeValueAsString(result));
                    toolResults.add(toolResult);
                }

                ObjectNode userMsg = mapper.createObjectNode();
                userMsg.put("role", "user");
                userMsg.set("content", toolResults);
                messages.add(userMsg);
            }

            if (finalText == null) {
                finalText = i18n.msg("error.ai.too_many_steps");
            }
            return ResponseEntity.ok(Map.of("reply", finalText));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(Map.of("error", i18n.msg("error.ai.not_configured")));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", i18n.msg("error.ai.request_failed")));
        }
    }

    private String extractText(JsonNode content) {
        StringBuilder sb = new StringBuilder();
        for (JsonNode block : content) {
            if ("text".equals(block.path("type").asText())) {
                sb.append(block.path("text").asText());
            }
        }
        return sb.length() > 0 ? sb.toString() : null;
    }

    private Object executeTool(User caller, String toolName, JsonNode input) {
        try {
            return switch (toolName) {
                case "search_students" -> toolService.searchStudents(caller, input.path("query").asText(""));
                case "get_student_attendance" -> toolService.getStudentAttendance(caller, input.path("studentId").asLong());
                case "get_student_notes" -> toolService.getStudentNotes(caller, input.path("studentId").asLong());
                case "search_teachers" -> toolService.searchTeachers(caller, input.path("query").asText(""));
                case "list_classes" -> toolService.listClasses(caller);
                case "get_school_overview" -> toolService.getSchoolOverview(caller);
                default -> Map.of("error", "Noma'lum vosita: " + toolName);
            };
        } catch (Exception e) {
            return Map.of("error", "Vositani bajarishda xatolik: " + e.getMessage());
        }
    }

    private String buildSystemPrompt(User caller) {
        return "Siz \"Maktab Davomad\" platformasining ichki AI yordamchisisiz. Foydalanuvchi: "
                + caller.getFullName() + " (" + caller.getRole() + "). "
                + "Faqat sizga berilgan vositalar (tools) orqali olingan HAQIQIY ma'lumotlardan foydalaning — "
                + "hech qachon son yoki faktni o'zingiz o'ylab topmang (fabrikatsiya qilmang). "
                + "Agar vosita natijasida \"error\" bo'lsa yoki ma'lumot topilmasa, buni ochiq ayting. "
                + "O'quvchilar haqida psixologik yoki shaxsiy xulosa/tashxis chiqarmang — faqat davomat, "
                + "izohlar va sinf/maktab statistikasi kabi ob'ektiv ma'lumotlar bilan cheklaning. "
                + "Javoblaringiz qisqa, aniq va o'zbek tilida bo'lsin (agar foydalanuvchi boshqa tilda yozmasa).";
    }

    private ArrayNode buildToolDefinitions() {
        ArrayNode tools = mapper.createArrayNode();
        tools.add(tool("search_students",
                "Ismi yoki familiyasi bo'yicha o'quvchilarni qidiradi (chaqiruvchining ko'lami ichida). Natijada har biri uchun id, fullName, className, schoolName qaytadi.",
                Map.of("query", "string:Qidiruv matni (ism yoki familiya qismi)"), List.of("query")));
        tools.add(tool("get_student_attendance",
                "Berilgan o'quvchi ID'sining so'nggi 30 kunlik HAQIQIY davomat statistikasi (kelgan/kelmagan kunlar soni, foiz).",
                Map.of("studentId", "integer:O'quvchi ID'si (avval search_students orqali topiladi)"), List.of("studentId")));
        tools.add(tool("get_student_notes",
                "Berilgan o'quvchi ID'si uchun xodimlar (o'qituvchi/direktor) yozgan izohlar tarixi.",
                Map.of("studentId", "integer:O'quvchi ID'si"), List.of("studentId")));
        tools.add(tool("search_teachers",
                "Ismi bo'yicha o'qituvchilarni qidiradi (chaqiruvchining ko'lami ichida). Natijada fan va telefon ham qaytadi.",
                Map.of("query", "string:Qidiruv matni"), List.of("query")));
        tools.add(tool("list_classes", "Chaqiruvchi ko'lamidagi barcha sinflar ro'yxati (nomi, sinf rahbari, o'quvchilar soni).", Map.of(), List.of()));
        tools.add(tool("get_school_overview", "Chaqiruvchi ko'lamidagi maktab(lar) haqida umumiy statistika: nomi, o'quvchilar/sinflar/o'qituvchilar soni.", Map.of(), List.of()));
        return tools;
    }

    /** properties: {paramName -> "type:description"} */
    private ObjectNode tool(String name, String description, Map<String, String> properties, List<String> required) {
        ObjectNode t = mapper.createObjectNode();
        t.put("name", name);
        t.put("description", description);
        ObjectNode schema = mapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = mapper.createObjectNode();
        for (var entry : properties.entrySet()) {
            String[] parts = entry.getValue().split(":", 2);
            ObjectNode prop = mapper.createObjectNode();
            prop.put("type", parts[0]);
            if (parts.length > 1) prop.put("description", parts[1]);
            props.set(entry.getKey(), prop);
        }
        schema.set("properties", props);
        if (!required.isEmpty()) {
            ArrayNode req = mapper.createArrayNode();
            required.forEach(req::add);
            schema.set("required", req);
        }
        t.set("input_schema", schema);
        return t;
    }
}
