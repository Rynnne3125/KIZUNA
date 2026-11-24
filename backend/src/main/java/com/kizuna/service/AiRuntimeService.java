package com.kizuna.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.kizuna.dto.request.AiConfigUpdateRequest;
import com.kizuna.dto.request.AiSenseiEvaluateRequest;
import com.kizuna.model.AiRuntimeConfig;
import com.kizuna.model.AiTelemetryEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class AiRuntimeService {

    private static final Logger logger = LoggerFactory.getLogger(AiRuntimeService.class);
    private static final String MODEL_REGEX = "^gemini-[a-z0-9.-]+$";
    private static final int MAX_EVENTS = 300;
    private static final String CONFIG_COLLECTION = "system_config";
    private static final String CONFIG_DOC_ID = "ai_config";
    private static final String LOGS_COLLECTION = "ai_placement_logs";

    private final ObjectMapper json;
    private final Firestore firestore;
    private final HttpClient client;
    private final String apiKey;

    private final AiRuntimeConfig config = new AiRuntimeConfig();
    private final Semaphore inFlight = new Semaphore(2);
    private final AtomicInteger rateLimitErrors429 = new AtomicInteger(0);
    private final CopyOnWriteArrayList<AiTelemetryEvent> events = new CopyOnWriteArrayList<>();

    private LocalDate budgetDate;
    private int callsToday;

    @Autowired
    public AiRuntimeService(
            ObjectMapper json,
            @Autowired(required = false) Firestore firestore,
            @Value("${GEMINI_API_KEY:}") String apiKey,
            @Value("${KIZUNA_GEMINI_MODEL:gemini-3.5-flash-lite}") String model,
            @Value("${KIZUNA_AI_DAILY_LIMIT:100}") int dailyLimit) {
        if (model == null || !model.matches(MODEL_REGEX)) {
            throw new IllegalArgumentException("Invalid Gemini model ID");
        }
        this.json = json;
        this.firestore = firestore;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.config.setModel(model);
        this.config.setDailyLimit(Math.max(0, dailyLimit));
        this.config.setTimeoutSeconds(5);
        this.config.setMaxConcurrency(2);
        this.config.setUpdatedAt(Instant.now().toString());
        this.client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
        loadConfigFromFirestoreIfAvailable();
    }

    private void loadConfigFromFirestoreIfAvailable() {
        if (firestore == null) return;
        try {
            DocumentSnapshot snap = firestore.collection(CONFIG_COLLECTION)
                    .document(CONFIG_DOC_ID)
                    .get()
                    .get(2, TimeUnit.SECONDS);
            if (snap.exists()) {
                AiRuntimeConfig saved = snap.toObject(AiRuntimeConfig.class);
                if (saved != null) {
                    if (saved.getModel() != null && saved.getModel().matches(MODEL_REGEX)) {
                        this.config.setModel(saved.getModel());
                    }
                    if (saved.getDailyLimit() >= 0) {
                        this.config.setDailyLimit(saved.getDailyLimit());
                    }
                    if (saved.getTimeoutSeconds() >= 2 && saved.getTimeoutSeconds() <= 30) {
                        this.config.setTimeoutSeconds(saved.getTimeoutSeconds());
                    }
                    this.config.setSenseiEnabled(saved.isSenseiEnabled());
                    if (saved.getSenseiSystemPrompt() != null && !saved.getSenseiSystemPrompt().isBlank()) {
                        this.config.setSenseiSystemPrompt(saved.getSenseiSystemPrompt());
                    }
                    if (saved.getUpdatedBy() != null) this.config.setUpdatedBy(saved.getUpdatedBy());
                    if (saved.getUpdatedAt() != null) this.config.setUpdatedAt(saved.getUpdatedAt());
                }
            }
        } catch (Exception e) {
            logger.debug("Skipping remote AI config load (non-fatal): {}", e.getMessage());
        }
    }

    public boolean hasApiKey() {
        return !apiKey.isEmpty();
    }

    public synchronized AiRuntimeConfig getConfig() {
        AiRuntimeConfig copy = new AiRuntimeConfig();
        copy.setModel(config.getModel());
        copy.setDailyLimit(config.getDailyLimit());
        copy.setTimeoutSeconds(config.getTimeoutSeconds());
        copy.setMaxConcurrency(config.getMaxConcurrency());
        copy.setSenseiEnabled(config.isSenseiEnabled());
        copy.setSenseiSystemPrompt(config.getSenseiSystemPrompt());
        copy.setUpdatedBy(config.getUpdatedBy());
        copy.setUpdatedAt(config.getUpdatedAt());
        return copy;
    }

    public synchronized AiRuntimeConfig updateConfig(AiConfigUpdateRequest req, String adminUsername) {
        if (req.getModel() != null && !req.getModel().isBlank()) {
            String trimmed = req.getModel().trim();
            if (!trimmed.matches(MODEL_REGEX)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Gemini model ID");
            }
            config.setModel(trimmed);
        }
        if (req.getDailyLimit() != null) {
            config.setDailyLimit(Math.max(0, req.getDailyLimit()));
        }
        if (req.getTimeoutSeconds() != null) {
            config.setTimeoutSeconds(Math.max(2, Math.min(30, req.getTimeoutSeconds())));
        }
        if (req.getSenseiEnabled() != null) {
            config.setSenseiEnabled(req.getSenseiEnabled());
        }
        if (req.getSenseiSystemPrompt() != null && !req.getSenseiSystemPrompt().isBlank()) {
            config.setSenseiSystemPrompt(req.getSenseiSystemPrompt().trim());
        }
        config.setUpdatedBy(adminUsername != null ? adminUsername : "admin");
        config.setUpdatedAt(Instant.now().toString());

        if (firestore != null) {
            try {
                firestore.collection(CONFIG_COLLECTION).document(CONFIG_DOC_ID).set(config);
            } catch (Exception e) {
                logger.debug("Firestore persist for ai_config skipped: {}", e.getMessage());
            }
        }
        return getConfig();
    }

    public boolean tryAcquireSlot() {
        return inFlight.tryAcquire();
    }

    public void releaseSlot() {
        inFlight.release();
    }

    public int getActiveInFlight() {
        return Math.max(0, config.getMaxConcurrency() - inFlight.availablePermits());
    }

    public synchronized void reserveDailyCall() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        if (!today.equals(budgetDate)) {
            budgetDate = today;
            callsToday = 0;
        }
        if (callsToday >= config.getDailyLimit()) {
            rateLimitErrors429.incrementAndGet();
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Daily Gemini quota exceeded");
        }
        callsToday++;
    }

    public void recordRateLimit429(String type, String assignedLevel) {
        rateLimitErrors429.incrementAndGet();
        recordEvent(new AiTelemetryEvent(
                "evt_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 5),
                type,
                config.getModel(),
                "N/A",
                null,
                assignedLevel,
                0,
                "RATE_LIMITED",
                429,
                System.currentTimeMillis()
        ));
    }

    public void recordEvent(AiTelemetryEvent event) {
        events.add(0, event);
        while (events.size() > MAX_EVENTS) {
            events.remove(events.size() - 1);
        }
        if (firestore != null) {
            try {
                firestore.collection(LOGS_COLLECTION).document(event.getId()).set(event);
            } catch (Exception e) {
                logger.debug("Firestore persist for ai_placement_logs skipped: {}", e.getMessage());
            }
        }
    }

    public List<AiTelemetryEvent> getRecentEvents(int limit) {
        int safe = Math.max(1, Math.min(limit, MAX_EVENTS));
        return events.stream().limit(safe).toList();
    }

    public synchronized Map<String, Object> getQuotaAndMonitorSnapshot() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        if (!today.equals(budgetDate)) {
            budgetDate = today;
            callsToday = 0;
        }

        int limit = config.getDailyLimit();
        int remaining = Math.max(0, limit - callsToday);
        double usagePercent = limit > 0 ? Math.min(100.0, Math.round((callsToday * 1000.0) / limit) / 10.0) : 100.0;

        List<AiTelemetryEvent> placementEvents = events.stream()
                .filter(e -> "PLACEMENT".equalsIgnoreCase(e.getType()))
                .toList();

        long highCount = placementEvents.stream().filter(e -> "HIGH".equalsIgnoreCase(e.getConfidence())).count();
        long modCount = placementEvents.stream().filter(e -> "MODERATE".equalsIgnoreCase(e.getConfidence())).count();
        long lowCount = placementEvents.stream().filter(e -> "LOW".equalsIgnoreCase(e.getConfidence())).count();

        List<AiTelemetryEvent> successEvents = events.stream()
                .filter(e -> "SUCCESS".equalsIgnoreCase(e.getStatus()) && e.getLatencyMs() > 0)
                .toList();

        long avgLatencyMs = successEvents.isEmpty() ? 0 :
                Math.round(successEvents.stream().mapToLong(AiTelemetryEvent::getLatencyMs).average().orElse(0));
        long maxLatencyMs = successEvents.stream().mapToLong(AiTelemetryEvent::getLatencyMs).max().orElse(0);
        long minLatencyMs = successEvents.stream().mapToLong(AiTelemetryEvent::getLatencyMs).min().orElse(0);

        long totalCalls = events.size();
        long successCount = events.stream().filter(e -> "SUCCESS".equalsIgnoreCase(e.getStatus())).count();
        long fallbackCount = events.stream().filter(e -> "FALLBACK".equalsIgnoreCase(e.getStatus()) || "ERROR".equalsIgnoreCase(e.getStatus())).count();
        double successRate = totalCalls > 0 ? Math.round((successCount * 1000.0) / totalCalls) / 10.0 : 100.0;

        Map<String, Long> levelDist = new LinkedHashMap<>();
        for (String lvl : List.of("N5", "N4", "N3", "N2", "N1")) {
            levelDist.put(lvl, placementEvents.stream()
                    .filter(e -> lvl.equalsIgnoreCase(e.getAssignedLevel()))
                    .count());
        }

        Map<String, Object> confidenceDist = new LinkedHashMap<>();
        confidenceDist.put("HIGH", highCount);
        confidenceDist.put("MODERATE", modCount);
        confidenceDist.put("LOW", lowCount);

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("model", config.getModel());
        snapshot.put("apiKeyConfigured", hasApiKey());
        snapshot.put("senseiEnabled", config.isSenseiEnabled());
        snapshot.put("callsToday", callsToday);
        snapshot.put("dailyLimit", limit);
        snapshot.put("remainingToday", remaining);
        snapshot.put("quotaUsagePercent", usagePercent);
        snapshot.put("budgetDate", today.toString());
        snapshot.put("inFlightActive", getActiveInFlight());
        snapshot.put("inFlightMax", config.getMaxConcurrency());
        snapshot.put("timeoutSeconds", config.getTimeoutSeconds());
        snapshot.put("rateLimitErrors429Count", rateLimitErrors429.get());
        snapshot.put("totalRecordedCalls", totalCalls);
        snapshot.put("totalPlacementCalls", placementEvents.size());
        snapshot.put("successCount", successCount);
        snapshot.put("fallbackOrErrorCount", fallbackCount);
        snapshot.put("successRatePercent", successRate);
        snapshot.put("averageLatencyMs", avgLatencyMs);
        snapshot.put("minLatencyMs", minLatencyMs);
        snapshot.put("maxLatencyMs", maxLatencyMs);
        snapshot.put("confidenceDistribution", confidenceDist);
        snapshot.put("levelDistribution", levelDist);
        snapshot.put("recentEvents", getRecentEvents(25));
        snapshot.put("config", getConfig());
        return snapshot;
    }

    public HttpResponse<String> sendGeminiGenerateContent(Map<String, Object> payload) throws IOException, InterruptedException {
        String currentModel = config.getModel();
        int timeoutSec = config.getTimeoutSeconds();
        HttpRequest upstream = HttpRequest.newBuilder(
                        URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + currentModel + ":generateContent"))
                .timeout(Duration.ofSeconds(timeoutSec))
                .header("x-goog-api-key", apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)))
                .build();
        return client.send(upstream, HttpResponse.BodyHandlers.ofString());
    }

    /**
     * AI Sensei Whitelist Sentence Evaluator (Stage 3 P2).
     * Uses live Gemini API when GEMINI_API_KEY is available and within quota;
     * otherwise falls back to deterministic Japanese particle & whitelist evaluator so learners always get rich feedback.
     */
    public Map<String, Object> evaluateSenseiSentence(AiSenseiEvaluateRequest req, String overrideSystemPrompt) {
        long started = System.nanoTime();
        String studentInput = req.getStudentInput() == null ? "" : req.getStudentInput().trim();
        String activeModel = config.getModel();

        if (config.isSenseiEnabled() && hasApiKey() && inFlight.tryAcquire()) {
            try {
                reserveDailyCall();
                String sysPrompt = (overrideSystemPrompt != null && !overrideSystemPrompt.isBlank())
                        ? overrideSystemPrompt
                        : config.getSenseiSystemPrompt();

                String prompt = sysPrompt + "\n\n"
                        + "Nhiệm vụ chấm bài viết tiếng Nhật (Quest 4 - Whitelist Controlled):\n"
                        + "- Cột mốc: " + safeStr(req.getMilestoneTitle(), req.getMilestoneId()) + "\n"
                        + "- Câu nói của Sensei/Đối tác: " + safeStr(req.getPartnerSpeechJp(), "N/A") + "\n"
                        + "- Yêu cầu cho học viên: " + safeStr(req.getLearnerPrompt(), "Viết câu tiếng Nhật tự nhiên") + "\n"
                        + "- Từ khóa trọng tâm bắt buộc: " + req.getRequiredKeywords() + "\n"
                        + "- Whitelist từ vựng của mốc: " + req.getWhitelistVocabulary() + "\n"
                        + "- Whitelist ngữ pháp của mốc: " + req.getWhitelistGrammar() + "\n"
                        + "- Câu trả lời của học viên: " + studentInput + "\n\n"
                        + "Hãy chấm điểm thang 0-10, kiểm tra lỗi trợ từ (は, が, を, に, で, へ, の), đánh giá tuân thủ Whitelist, đưa ra nhận xét sư phạm ngắn gọn bằng tiếng Việt và 1 câu gợi ý tự nhiên chuẩn người Nhật.";

                Map<String, Object> payload = Map.of(
                        "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                        "generationConfig", Map.of(
                                "temperature", 0.2,
                                "maxOutputTokens", 1024,
                                "responseMimeType", "application/json",
                                "responseSchema", Map.of(
                                        "type", "OBJECT",
                                        "properties", Map.of(
                                                "score", Map.of("type", "INTEGER"),
                                                "passed", Map.of("type", "BOOLEAN"),
                                                "whitelistCompliant", Map.of("type", "BOOLEAN"),
                                                "particleErrors", Map.of("type", "ARRAY", "items", Map.of("type", "STRING")),
                                                "pedagogicalFeedback", Map.of("type", "STRING"),
                                                "naturalExpressionSuggestion", Map.of("type", "STRING")
                                        ),
                                        "required", List.of("score", "passed", "whitelistCompliant", "particleErrors", "pedagogicalFeedback", "naturalExpressionSuggestion")
                                )
                        )
                );

                HttpResponse<String> response = sendGeminiGenerateContent(payload);
                long latencyMs = Duration.ofNanos(System.nanoTime() - started).toMillis();
                if (response.statusCode() == 200) {
                    JsonNode root = json.readTree(response.body());
                    JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
                    for (JsonNode part : parts) {
                        if (!part.path("thought").asBoolean(false) && part.path("text").isTextual()) {
                            JsonNode parsed = json.readTree(part.path("text").asText());
                            int score = Math.max(0, Math.min(10, parsed.path("score").asInt(7)));
                            boolean passed = parsed.path("passed").asBoolean(score >= 6);
                            boolean compliant = parsed.path("whitelistCompliant").asBoolean(true);
                            List<String> particleErrors = new ArrayList<>();
                            if (parsed.path("particleErrors").isArray()) {
                                for (JsonNode err : parsed.path("particleErrors")) {
                                    if (err.isTextual() && !err.asText().isBlank()) {
                                        particleErrors.add(err.asText());
                                    }
                                }
                            }
                            recordEvent(new AiTelemetryEvent(
                                    "evt_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 5),
                                    "SENSEI",
                                    activeModel,
                                    score >= 8 ? "HIGH" : (score >= 5 ? "MODERATE" : "LOW"),
                                    req.getMilestoneId(),
                                    null,
                                    latencyMs,
                                    "SUCCESS",
                                    200,
                                    System.currentTimeMillis()
                            ));

                            Map<String, Object> result = new LinkedHashMap<>();
                            result.put("milestoneId", req.getMilestoneId());
                            result.put("milestoneTitle", safeStr(req.getMilestoneTitle(), req.getMilestoneId()));
                            result.put("studentInput", studentInput);
                            result.put("evaluatedScore", score);
                            result.put("passed", passed);
                            result.put("whitelistCompliant", compliant);
                            result.put("particleErrors", particleErrors);
                            result.put("pedagogicalFeedback", parsed.path("pedagogicalFeedback").asText("Bài làm hợp lệ."));
                            result.put("naturalExpressionSuggestion", parsed.path("naturalExpressionSuggestion").asText(studentInput));
                            result.put("model", activeModel);
                            result.put("source", "GEMINI_LIVE");
                            result.put("latencyMs", latencyMs);
                            result.put("status", "SUCCESS");
                            return result;
                        }
                    }
                }
            } catch (ResponseStatusException rse) {
                if (rse.getStatusCode().value() == 429) {
                    recordRateLimit429("SENSEI", null);
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                logger.debug("Gemini Sensei live evaluation fell back to local analyzer: {}", e.getMessage());
            } finally {
                inFlight.release();
            }
        }

        return evaluateSenseiLocally(req, started);
    }

    private Map<String, Object> evaluateSenseiLocally(AiSenseiEvaluateRequest req, long startedNanos) {
        String input = req.getStudentInput() == null ? "" : req.getStudentInput().trim();
        List<String> particleErrors = new ArrayList<>();
        List<String> matchedWhitelist = new ArrayList<>();

        boolean hasJapaneseChars = input.matches(".*[\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FAF].*");
        boolean hasPoliteEnding = input.contains("です") || input.contains("ます") || input.contains("ました")
                || input.contains("ません") || input.contains("ください") || input.contains("ありがとう")
                || input.contains("おはよう") || input.contains("こんにちは") || input.contains("よろしく");

        // Check required keywords
        List<String> required = req.getRequiredKeywords() != null ? req.getRequiredKeywords() : List.of();
        boolean hasRequired = required.isEmpty() || required.stream().anyMatch(k -> k != null && !k.isBlank() && input.contains(k));

        // Check whitelist vocabulary coverage
        List<String> whitelist = req.getWhitelistVocabulary() != null ? req.getWhitelistVocabulary() : List.of();
        for (String term : whitelist) {
            if (term != null && term.length() >= 1 && input.contains(term)) {
                matchedWhitelist.add(term);
            }
        }

        // Common Japanese particle mistake heuristics for Vietnamese learners
        if (input.contains("私わ") || input.contains("わたしわ")) {
            particleErrors.add("Lỗi trợ từ chủ đề: dùng 「は」 thay vì 「わ」 sau 「私／わたし」.");
        }
        if (input.contains("行きます") && input.contains("を") && !input.contains("へ") && !input.contains("に")) {
            particleErrors.add("Động từ di chuyển 「行きます」 thường đi với trợ từ 「へ」 hoặc 「に」 chỉ đích đến thay vì 「を」.");
        }
        if (input.contains("です。") && input.contains("ます。")) {
            // two sentences is fine, check awkward double copula
        }
        if (input.contains("はは") || input.contains("をを") || input.contains("にに")) {
            particleErrors.add("Phát hiện lặp trợ từ liên tiếp không tự nhiên trong câu.");
        }
        if (hasJapaneseChars && input.length() >= 6 && !input.contains("は") && !input.contains("が")
                && !input.contains("を") && !input.contains("に") && !input.contains("で") && !input.contains("の")
                && !input.contains("おはよう") && !input.contains("初めまして") && !input.contains("ありがとう")) {
            particleErrors.add("Câu còn thiếu trợ từ liên kết (như は / が / を / に / で) giữa các thành phần.");
        }

        int score = 4;
        if (!hasJapaneseChars) {
            score = 2;
            particleErrors.add("Vui lòng nhập câu bằng chữ tiếng Nhật (Hiragana / Katakana / Kanji).");
        } else {
            if (input.length() >= 4) score += 1;
            if (hasPoliteEnding) score += 2;
            if (hasRequired) score += 2;
            if (!matchedWhitelist.isEmpty()) score += 1;
            score -= Math.min(3, particleErrors.size() * 2);
            score = Math.max(1, Math.min(10, score));
        }

        boolean passed = score >= 6;
        boolean whitelistCompliant = hasJapaneseChars && (whitelist.isEmpty() || !matchedWhitelist.isEmpty() || hasRequired);

        StringBuilder feedback = new StringBuilder();
        if (!hasJapaneseChars) {
            feedback.append("Câu trả lời chưa sử dụng ký tự tiếng Nhật. Hãy chuyển bàn phím sang Hiragana/Kanji để luyện viết.");
        } else if (passed) {
            feedback.append("Tốt lắm! Câu viết đúng sắc thái lịch sự và phù hợp ngữ cảnh cột mốc");
            if (!matchedWhitelist.isEmpty()) {
                feedback.append(" (đã vận dụng tốt từ Whitelist: ").append(String.join(", ", matchedWhitelist.subList(0, Math.min(3, matchedWhitelist.size())))).append(")");
            }
            feedback.append(".");
            if (!particleErrors.isEmpty()) {
                feedback.append(" Lưu ý nhỏ về trợ từ để câu tự nhiên hơn.");
            }
        } else {
            feedback.append("Câu viết cần chỉnh sửa thêm. ");
            if (!hasRequired && !required.isEmpty()) {
                feedback.append("Hãy vận dụng mẫu câu trọng tâm [").append(String.join(" / ", required)).append("]. ");
            }
            if (!hasPoliteEnding) {
                feedback.append("Nên dùng đuôi câu lịch sự (〜です / 〜ます). ");
            }
            if (!particleErrors.isEmpty()) {
                feedback.append(particleErrors.get(0));
            }
        }

        String suggestion = (req.getSampleAnswer() != null && !req.getSampleAnswer().isBlank())
                ? req.getSampleAnswer()
                : (input.endsWith("。") ? input : input + "。");

        long latencyMs = Math.max(12, Duration.ofNanos(System.nanoTime() - startedNanos).toMillis());
        recordEvent(new AiTelemetryEvent(
                "evt_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 5),
                "SENSEI",
                "kizuna-whitelist-evaluator",
                score >= 8 ? "HIGH" : (score >= 5 ? "MODERATE" : "LOW"),
                req.getMilestoneId(),
                null,
                latencyMs,
                "FALLBACK",
                200,
                System.currentTimeMillis()
        ));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("milestoneId", req.getMilestoneId());
        result.put("milestoneTitle", safeStr(req.getMilestoneTitle(), req.getMilestoneId()));
        result.put("studentInput", input);
        result.put("evaluatedScore", score);
        result.put("passed", passed);
        result.put("whitelistCompliant", whitelistCompliant);
        result.put("matchedWhitelistTerms", matchedWhitelist);
        result.put("particleErrors", particleErrors);
        result.put("pedagogicalFeedback", feedback.toString().trim());
        result.put("naturalExpressionSuggestion", suggestion);
        result.put("model", hasApiKey() ? config.getModel() + " (fallback)" : "kizuna-whitelist-local");
        result.put("source", "WHITELIST_FALLBACK");
        result.put("latencyMs", latencyMs);
        result.put("status", "SUCCESS");
        return result;
    }

    private String safeStr(String value, String fallback) {
        if (value != null && !value.isBlank()) return value;
        return fallback != null ? fallback : "";
    }
}
