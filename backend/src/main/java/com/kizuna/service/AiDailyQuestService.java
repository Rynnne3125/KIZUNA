package com.kizuna.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.kizuna.dto.request.DailyQuestGenerateRequest;
import com.kizuna.model.AiTelemetryEvent;
import com.kizuna.model.GrammarItem;
import com.kizuna.model.KanjiItem;
import com.kizuna.model.VocabularyItem;
import com.kizuna.repository.CurriculumRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Sinh 3 Nhiệm Vụ Ngày (Daily Quests) cá nhân hóa từ tiến độ học tập (user_progress) qua Gemini API.
 * - Tối ưu token: cache 1 bộ/ngày/học viên (Firestore + memory), prompt cô đọng (~300 tokens).
 * - Đảm bảo độ tin cậy: schema JSON chuẩn + kiểm tra 4 đáp án khác nhau + lọc 100% không tiếng Anh + có độ khó.
 */
@Service
public class AiDailyQuestService {

    private static final Logger logger = LoggerFactory.getLogger(AiDailyQuestService.class);
    private static final String COLLECTION_NAME = "daily_quests";
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final Pattern JAPANESE_PATTERN = Pattern.compile("[\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FAF]");
    private static final Pattern LATIN_WORD_PATTERN = Pattern.compile("\\b[A-Za-zÀ-ỹ]{2,}\\b");
    private static final Pattern PURE_ASCII_PATTERN = Pattern.compile("^[A-Za-z]+$");

    // Danh sách từ tiếng Anh phổ biến tuyệt đối không được xuất hiện trong đề/đáp án/giải thích
    private static final Set<String> DISALLOWED_ENGLISH_WORDS = Set.of(
            "the", "and", "for", "with", "this", "that", "from", "into", "which", "what",
            "when", "where", "who", "why", "how", "is", "are", "was", "were", "be", "been",
            "have", "has", "had", "does", "did", "will", "would", "could", "should", "must",
            "might", "option", "options", "answer", "answers", "correct", "incorrect", "wrong",
            "choose", "select", "question", "sentence", "meaning", "means", "grammar",
            "vocabulary", "reading", "explanation", "because", "therefore", "however",
            "although", "example", "note", "hint", "please", "refers", "used", "using",
            "particle", "particles", "verb", "verbs", "noun", "nouns", "adjective", "adverb",
            "polite", "casual", "form", "tense", "passive", "causative", "honorific", "humble",
            "false", "true", "none", "above", "below", "between", "instead", "about", "after",
            "before", "during", "without", "under", "over", "again", "always", "never",
            "often", "sometimes", "usually", "today", "tomorrow", "yesterday", "morning",
            "evening", "night", "person", "people", "friend", "student", "teacher", "school",
            "company", "station", "train", "book", "water", "food", "time", "year", "month",
            "week", "day", "hour", "minute", "following", "statement", "context", "situation",
            "phrase", "word", "words", "character", "characters", "level", "difficulty",
            "try", "check", "right", "left", "only", "also", "very", "much", "many", "more",
            "most", "some", "any", "each", "every", "other", "another", "both", "either",
            "neither", "such", "than", "then", "there", "here", "these", "those", "your",
            "you", "they", "them", "their", "our", "she", "his", "her", "its", "not"
    );

    private static final List<String> REQUIRED_CATEGORIES = List.of(
            "GRAMMAR_TRAP",
            "KANJI_CONTEXT",
            "READING_INFERENCE"
    );

    private final AiRuntimeService aiRuntimeService;
    private final CurriculumRepository curriculumRepository;
    private final ObjectMapper json;
    private final Firestore firestore;
    private final Map<String, Map<String, Object>> dailyMemoryCache = new ConcurrentHashMap<>();

    @Autowired
    public AiDailyQuestService(
            AiRuntimeService aiRuntimeService,
            CurriculumRepository curriculumRepository,
            ObjectMapper json,
            @Autowired(required = false) Firestore firestore) {
        this.aiRuntimeService = aiRuntimeService;
        this.curriculumRepository = curriculumRepository;
        this.json = json;
        this.firestore = firestore;
    }

    public Map<String, Object> generateOrGetDailyQuests(DailyQuestGenerateRequest req) {
        String date = normalizeDate(req.getDate());
        String userId = safeStr(req.getUserId(), "guest");
        String cacheKey = userId + "_" + date;

        // 1. Kiểm tra bộ nhớ cache theo ngày (0 token)
        if (!"guest".equals(userId)) {
            Map<String, Object> mem = dailyMemoryCache.get(cacheKey);
            if (mem != null) {
                Map<String, Object> copy = new LinkedHashMap<>(mem);
                copy.put("cached", true);
                return copy;
            }

            Map<String, Object> remote = loadFromFirestore(cacheKey);
            if (remote != null) {
                dailyMemoryCache.put(cacheKey, remote);
                Map<String, Object> copy = new LinkedHashMap<>(remote);
                copy.put("cached", true);
                return copy;
            }
        }

        // 2. Làm giàu tiến độ thực tế từ Firestore user_progress nếu có
        EnrichedProgress progress = enrichProgress(req, userId);

        // 3. Thử sinh bộ 3 câu hỏi bằng Gemini API với prompt cô đọng
        long started = System.nanoTime();
        String activeModel = aiRuntimeService.getConfig().getModel();
        List<Map<String, Object>> quests = new ArrayList<>();
        String source = "CURATED_FALLBACK";

        if (aiRuntimeService.hasApiKey() && aiRuntimeService.tryAcquireSlot()) {
            try {
                aiRuntimeService.reserveDailyCall();
                String prompt = buildCompactPrompt(progress, date);
                Map<String, Object> payload = buildGeminiPayload(prompt);
                HttpResponse<String> response = aiRuntimeService.sendGeminiGenerateContent(payload);
                long latencyMs = Duration.ofNanos(System.nanoTime() - started).toMillis();

                if (response.statusCode() == 200) {
                    List<Map<String, Object>> parsed = parseAndValidateGeminiQuests(response.body());
                    if (!parsed.isEmpty()) {
                        quests.addAll(parsed);
                        source = "GEMINI_LIVE";
                        aiRuntimeService.recordEvent(new AiTelemetryEvent(
                                "evt_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 5),
                                "DAILY_QUEST",
                                activeModel,
                                parsed.size() == 3 ? "HIGH" : "MODERATE",
                                progress.milestoneId,
                                progress.level,
                                latencyMs,
                                "SUCCESS",
                                200,
                                System.currentTimeMillis()
                        ));
                    }
                } else {
                    logger.warn("Gemini Daily Quest HTTP {} (latency={}ms)", response.statusCode(), latencyMs);
                    if (response.statusCode() == 429) {
                        aiRuntimeService.recordRateLimit429("DAILY_QUEST", progress.level);
                    }
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                logger.warn("Gemini Daily Quest fallback ({}): {}", e.getClass().getSimpleName(), e.getMessage());
            } finally {
                aiRuntimeService.releaseSlot();
            }
        }

        // 4. Bổ sung đủ 3 câu hỏi chuẩn tiếng Việt + tiếng Nhật nếu Gemini thiếu hoặc lỗi
        List<Map<String, Object>> finalQuests = ensureThreeValidQuests(quests, progress, date, userId);
        if (quests.isEmpty()) {
            source = "CURATED_FALLBACK";
        } else if (quests.size() < 3) {
            source = "GEMINI_HYBRID";
        }

        Map<String, Object> bundle = new LinkedHashMap<>();
        bundle.put("date", date);
        bundle.put("userId", userId);
        bundle.put("level", progress.level);
        bundle.put("weakFocus", progress.weakFocusVi);
        bundle.put("source", source);
        bundle.put("model", "CURATED_FALLBACK".equals(source) ? "kizuna-curated-jlpt" : activeModel);
        bundle.put("cached", false);
        bundle.put("bonusClaimed", false);
        bundle.put("quests", finalQuests);
        bundle.put("generatedAt", java.time.Instant.now().toString());

        if (!"guest".equals(userId)) {
            dailyMemoryCache.put(cacheKey, bundle);
            saveToFirestore(cacheKey, bundle);
        }
        return bundle;
    }

    private Map<String, Object> buildGeminiPayload(String prompt) {
        Map<String, Object> questSchema = Map.of(
                "type", "OBJECT",
                "properties", Map.of(
                        "category", Map.of("type", "STRING", "enum", REQUIRED_CATEGORIES),
                        "title", Map.of("type", "STRING"),
                        "passage", Map.of("type", "STRING"),
                        "question", Map.of("type", "STRING"),
                        "options", Map.of("type", "ARRAY", "items", Map.of("type", "STRING")),
                        "correctIndex", Map.of("type", "INTEGER"),
                        "explanation", Map.of("type", "STRING")
                ),
                "required", List.of("category", "title", "passage", "question", "options", "correctIndex", "explanation")
        );

        return Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.35,
                        "maxOutputTokens", 1150,
                        "responseMimeType", "application/json",
                        "responseSchema", Map.of(
                                "type", "OBJECT",
                                "properties", Map.of(
                                        "quests", Map.of("type", "ARRAY", "items", questSchema)
                                ),
                                "required", List.of("quests")
                        )
                )
        );
    }

    /**
     * Prompt siêu gọn để tối ưu token (~260-360 input tokens) nhưng vẫn tạo câu hỏi khó và neo theo trình độ.
     */
    private String buildCompactPrompt(EnrichedProgress p, String date) {
        String grounding = buildCompactCurriculumGrounding(p.level, p.milestoneId);
        return "Tạo 3 câu trắc nghiệm luyện tập tiếng Nhật hằng ngày có ĐỘ KHÓ KHÁ/BẪY chuẩn JLPT " + p.level + ".\n"
                + "QUY TẮC BẮT BUỘC:\n"
                + "1) Chỉ dùng TIẾNG VIỆT và TIẾNG NHẬT (Kanji/Hiragana/Katakana). CẤM TUYỆT ĐỐI mọi từ tiếng Anh.\n"
                + "2) Mỗi câu có đúng 4 đáp án khác nhau hoàn toàn, không lộ đáp án, 3 đáp án nhiễu phải dễ nhầm lẫn.\n"
                + "3) 3 câu gồm: GRAMMAR_TRAP (bẫy trợ từ/chia thể/sắc thái), KANJI_CONTEXT (chọn Kanji/cách đọc trong ngữ cảnh câu), READING_INFERENCE (đoạn ngắn 2-3 câu tiếng Nhật + câu hỏi suy luận).\n"
                + "4) Giải thích ngắn gọn bằng tiếng Việt (1-2 câu), nêu rõ vì sao đáp án đúng và bẫy ở đâu.\n"
                + "Hồ sơ học viên (" + date + "): Cấp=" + p.level
                + "|Từ=" + p.vocabLearned + "|Kanji=" + p.kanjiLearned
                + "|Ngữ pháp=" + p.grammarLearned + "|Đề=" + p.examsCompleted
                + "|Trọng tâm yếu=" + p.weakFocusVi
                + (p.milestoneTitle.isEmpty() ? "" : "|Mốc=" + truncate(p.milestoneTitle, 45)) + "\n"
                + (grounding.isEmpty() ? "" : "Ngữ liệu tham chiếu: " + grounding);
    }

    private String buildCompactCurriculumGrounding(String level, String milestoneId) {
        StringBuilder sb = new StringBuilder();

        List<GrammarItem> grammars = !milestoneId.isEmpty()
                ? curriculumRepository.getGrammarByMilestoneId(milestoneId)
                : List.of();
        if (grammars.isEmpty()) {
            grammars = curriculumRepository.getAllGrammar().stream()
                    .filter(g -> level.equalsIgnoreCase(g.getJlptLevel()))
                    .limit(3)
                    .toList();
        }
        if (!grammars.isEmpty()) {
            sb.append("NP:");
            grammars.stream().limit(3).forEach(g ->
                    sb.append(truncate(safeStr(g.getPattern(), ""), 24))
                            .append("=")
                            .append(truncate(safeStr(g.getTitleVi(), ""), 26))
                            .append(";"));
        }

        List<VocabularyItem> vocabs = !milestoneId.isEmpty()
                ? curriculumRepository.getVocabularyByMilestoneId(milestoneId)
                : List.of();
        if (vocabs.isEmpty()) {
            vocabs = curriculumRepository.getAllVocabulary().stream()
                    .filter(v -> level.equalsIgnoreCase(v.getJlptLevel()))
                    .limit(4)
                    .toList();
        }
        if (!vocabs.isEmpty()) {
            sb.append(" TV:");
            vocabs.stream().limit(4).forEach(v ->
                    sb.append(truncate(safeStr(v.getTerm(), ""), 16))
                            .append("(").append(truncate(safeStr(v.getReading(), ""), 16)).append(")=")
                            .append(truncate(safeStr(v.getVietnameseMeaning(), ""), 22))
                            .append(";"));
        }

        List<KanjiItem> kanjis = !milestoneId.isEmpty()
                ? curriculumRepository.getKanjiByMilestoneId(milestoneId)
                : List.of();
        if (kanjis.isEmpty()) {
            kanjis = curriculumRepository.getAllKanji().stream()
                    .filter(k -> level.equalsIgnoreCase(k.getJlptLevel()))
                    .limit(3)
                    .toList();
        }
        if (!kanjis.isEmpty()) {
            sb.append(" KJ:");
            kanjis.stream().limit(3).forEach(k ->
                    sb.append(safeStr(k.getKanji(), ""))
                            .append("[").append(truncate(safeStr(k.getSinoVietnamese(), ""), 14)).append("]=")
                            .append(truncate(safeStr(k.getVietnameseMeaning(), ""), 18))
                            .append(";"));
        }

        return sb.toString().trim();
    }

    /**
     * Phân tích JSON từ Gemini và lọc bỏ mọi câu hỏi sai cấu trúc hoặc chứa tiếng Anh.
     */
    public List<Map<String, Object>> parseAndValidateGeminiQuests(String rawBody) {
        List<Map<String, Object>> valid = new ArrayList<>();
        if (rawBody == null || rawBody.isBlank()) return valid;
        try {
            JsonNode root = json.readTree(rawBody);
            JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
            for (JsonNode part : parts) {
                if (part.path("thought").asBoolean(false) || !part.path("text").isTextual()) continue;
                JsonNode parsed = json.readTree(part.path("text").asText());
                JsonNode arr = parsed.path("quests");
                if (!arr.isArray()) continue;

                for (JsonNode qNode : arr) {
                    Map<String, Object> normalized = normalizeAndValidateQuestNode(qNode);
                    if (normalized != null) {
                        valid.add(normalized);
                    }
                    if (valid.size() >= 3) break;
                }
                if (!valid.isEmpty()) break;
            }
        } catch (Exception e) {
            logger.warn("Failed parsing Gemini daily quest JSON: {}", e.getMessage());
        }
        return valid;
    }

    private Map<String, Object> normalizeAndValidateQuestNode(JsonNode qNode) {
        String category = qNode.path("category").asText("").trim().toUpperCase(Locale.ROOT);
        if (!REQUIRED_CATEGORIES.contains(category)) {
            category = "GRAMMAR_TRAP";
        }
        String title = qNode.path("title").asText("").trim();
        String passage = qNode.path("passage").asText("").trim();
        String question = qNode.path("question").asText("").trim();
        String explanation = qNode.path("explanation").asText("").trim();
        int correctIndex = qNode.path("correctIndex").asInt(-1);

        JsonNode optsNode = qNode.path("options");
        if (!optsNode.isArray() || optsNode.size() != 4) return null;

        List<String> options = new ArrayList<>(4);
        Set<String> seenOptions = new HashSet<>();
        for (JsonNode opt : optsNode) {
            String val = opt.asText("").trim();
            if (val.isEmpty() || !seenOptions.add(val.toLowerCase(Locale.ROOT))) {
                return null;
            }
            options.add(val);
        }

        if (title.isEmpty() || question.isEmpty() || explanation.isEmpty()) return null;
        if (correctIndex < 0 || correctIndex > 3) return null;

        // Phải có ký tự tiếng Nhật trong đề/đoạn văn/đáp án
        String jpSample = passage + " " + question + " " + String.join(" ", options);
        if (!JAPANESE_PATTERN.matcher(jpSample).find()) return null;

        // Chặn tuyệt đối tiếng Anh ở tất cả các trường
        if (containsDisallowedEnglish(title)
                || containsDisallowedEnglish(passage)
                || containsDisallowedEnglish(question)
                || containsDisallowedEnglish(explanation)
                || options.stream().anyMatch(AiDailyQuestService::containsDisallowedEnglish)) {
            return null;
        }

        return buildQuestItem(
                "dq_" + category.toLowerCase(Locale.ROOT),
                category,
                title,
                passage,
                question,
                options,
                correctIndex,
                explanation
        );
    }

    /**
     * Kiểm tra chuỗi có chứa từ tiếng Anh không. Cho phép tiếng Nhật, tiếng Việt có dấu và thuật ngữ JLPT (N1..N5).
     */
    public static boolean containsDisallowedEnglish(String text) {
        if (text == null || text.isBlank()) return false;
        Matcher m = LATIN_WORD_PATTERN.matcher(text);
        while (m.find()) {
            String word = m.group();
            String lower = word.toLowerCase(Locale.ROOT);
            if (DISALLOWED_ENGLISH_WORDS.contains(lower)) {
                return true;
            }
            // Kiểm tra hậu tố tiếng Anh thuần ASCII (vd: "-tion", "-ment", "-ness", "-ing", "-able")
            if (PURE_ASCII_PATTERN.matcher(word).matches() && word.length() >= 5) {
                if (lower.endsWith("tion") || lower.endsWith("sion") || lower.endsWith("ment")
                        || lower.endsWith("ness") || lower.endsWith("able") || lower.endsWith("ible")
                        || lower.endsWith("ious") || lower.endsWith("eous") || lower.endsWith("less")) {
                    return true;
                }
            }
        }
        return false;
    }

    private List<Map<String, Object>> ensureThreeValidQuests(
            List<Map<String, Object>> generated,
            EnrichedProgress progress,
            String date,
            String userId) {
        List<Map<String, Object>> result = new ArrayList<>();
        Set<String> usedCategories = new HashSet<>();

        for (Map<String, Object> q : generated) {
            String cat = String.valueOf(q.get("category"));
            if (usedCategories.add(cat)) {
                result.add(q);
            }
        }

        int seed = Math.abs((date + ":" + userId + ":" + progress.level).hashCode());
        for (int i = 0; i < REQUIRED_CATEGORIES.size(); i++) {
            String cat = REQUIRED_CATEGORIES.get(i);
            if (!usedCategories.contains(cat)) {
                result.add(pickFallbackQuest(progress.level, cat, seed + i));
                usedCategories.add(cat);
            }
        }

        // Gán id duy nhất và phần thưởng chuẩn theo từng hạng mục
        for (int i = 0; i < result.size(); i++) {
            Map<String, Object> q = result.get(i);
            q.put("id", "dq_" + date.replace("-", "") + "_" + (i + 1));
            q.put("order", i + 1);
            q.put("completed", false);
        }
        return result;
    }

    private Map<String, Object> buildQuestItem(
            String id,
            String category,
            String title,
            String passage,
            String question,
            List<String> options,
            int correctIndex,
            String explanation) {
        int pointsReward = "READING_INFERENCE".equals(category) ? 25 : ("KANJI_CONTEXT".equals(category) ? 20 : 15);
        int xpReward = pointsReward * 2;

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", id);
        item.put("category", category);
        item.put("categoryLabel", categoryLabelVi(category));
        item.put("difficultyLabel", "Thử thách");
        item.put("title", title);
        item.put("passage", passage);
        item.put("question", question);
        item.put("options", options);
        item.put("correctIndex", correctIndex);
        item.put("explanation", explanation);
        item.put("pointsReward", pointsReward);
        item.put("xpReward", xpReward);
        item.put("completed", false);
        return item;
    }

    private String categoryLabelVi(String category) {
        return switch (category) {
            case "GRAMMAR_TRAP" -> "Bẫy Ngữ Pháp";
            case "KANJI_CONTEXT" -> "Hán Tự Ngữ Cảnh";
            case "READING_INFERENCE" -> "Đọc Hiểu Suy Luận";
            default -> "Thử Thách Ngày";
        };
    }

    private Map<String, Object> pickFallbackQuest(String level, String category, int seed) {
        List<Map<String, Object>> bank = getFallbackBank(level, category);
        Map<String, Object> chosen = bank.get(Math.floorMod(seed, bank.size()));
        return new LinkedHashMap<>(chosen);
    }

    private List<Map<String, Object>> getFallbackBank(String level, String category) {
        if ("N5".equals(level)) {
            if ("GRAMMAR_TRAP".equals(category)) {
                return List.of(
                        buildQuestItem("fb_n5_g1", category,
                                "Phân biệt trợ từ chỉ nơi chốn 「に」 và 「で」",
                                "",
                                "Chọn trợ từ đúng điền vào chỗ trống:\n毎日、図書館（　　）日本語を勉強して、５時（　　）家へ帰ります。",
                                List.of("で ／ に", "に ／ で", "を ／ に", "へ ／ で"),
                                0,
                                "「図書館で勉強する」 dùng 「で」 chỉ nơi diễn ra hành động; 「５時に帰る」 dùng 「に」 chỉ thời điểm cụ thể."),
                        buildQuestItem("fb_n5_g2", category,
                                "Bẫy phủ định lịch sự với tính từ đuôi い",
                                "",
                                "Chọn dạng chia đúng của tính từ 「いい」 (tốt) trong câu:\n昨日のテストはあまり（　　　　）。",
                                List.of("よくなかったです", "いくなかったです", "よくないでした", "いいじゃなかったです"),
                                0,
                                "「いい」 khi chia quá khứ phủ định phải biến đổi gốc thành 「よ」 → 「よくなかったです」 (không phải 「いくない」).")
                );
            }
            if ("KANJI_CONTEXT".equals(category)) {
                return List.of(
                        buildQuestItem("fb_n5_k1", category,
                                "Cách đọc đặc biệt của từ chỉ thời gian",
                                "",
                                "Cách đọc đúng của từ gạch chân trong câu sau là gì?\n「先月、<u>二十日</u>に日本へ来ました。」",
                                List.of("はつか", "にじゅうにち", "はたち", "ふつか"),
                                0,
                                "「二十日」 khi chỉ ngày 20 trong tháng đọc đặc biệt là 「はつか」; còn 「はたち」 là 20 tuổi (二十歳)."),
                        buildQuestItem("fb_n5_k2", category,
                                "Phân biệt Kanji cùng âm đọc và ngữ cảnh",
                                "",
                                "Chọn chữ Hán thích hợp điền vào chỗ trống:\n雨が降っていますから、傘を（　）行ってください。",
                                List.of("持って", "待って", "買って", "立って"),
                                0,
                                "Trời đang mưa nên hãy 「持って」 (mang theo) ô; dễ nhầm với 「待って」 (đợi) có bộ thủ tương đồng.")
                );
            }
            return List.of(
                    buildQuestItem("fb_n5_r1", category,
                            "Suy luận lịch trình qua hội thoại ngắn",
                            "田中：山田さん、明日の映画は何時からですか。\n山田：３時からです。でも、その前に昼ご飯を食べませんか。\n田中：いいですね。じゃあ、１時半に駅で会いましょう。",
                            "Hai người sẽ gặp nhau lúc mấy giờ và để làm gì trước?",
                            List.of("Gặp lúc 13:30 ở nhà ga để đi ăn trưa trước khi xem phim",
                                    "Gặp lúc 15:00 ở rạp chiếu phim rồi mới ăn trưa",
                                    "Gặp lúc 13:30 ở nhà hàng gần trường học",
                                    "Xem phim lúc 13:30 rồi 15:00 mới gặp nhau ở nhà ga"),
                            0,
                            "「その前に」 (trước đó) chỉ việc ăn trưa trước 3 giờ; 「１時半」 là 1 giờ 30 chiều và 「駅で」 là tại nhà ga.")
            );
        }

        if ("N4".equals(level)) {
            if ("GRAMMAR_TRAP".equals(category)) {
                return List.of(
                        buildQuestItem("fb_n4_g1", category,
                                "Phân biệt 「〜ように」 và 「〜ために」",
                                "",
                                "Chọn đáp án tự nhiên nhất:\n日本語が上手になる（　　　）、毎日ニュースを聞いています。",
                                List.of("ように", "ために", "そうに", "ことに"),
                                0,
                                "Động từ trước chỗ trống là 「上手になる」 (trạng thái khả năng/biến đổi không hoàn toàn do ý chí trực tiếp) nên đi với 「ように」.")
                );
            }
            if ("KANJI_CONTEXT".equals(category)) {
                return List.of(
                        buildQuestItem("fb_n4_k1", category,
                                "Phân biệt Kanji đồng âm trong đời sống",
                                "",
                                "Chọn chữ Hán phù hợp với nghĩa trong câu:\n大切な約束を忘れて、友達に（　　　）しまいました。",
                                List.of("怒られて", "叱って", "謝られて", "笑って"),
                                0,
                                "Quên cuộc hẹn quan trọng nên bị bạn giận → dùng thể bị động 「怒られてしまいました」.")
                );
            }
            return List.of(
                    buildQuestItem("fb_n4_r1", category,
                            "Đọc hiểu thông báo tại nơi làm việc",
                            "お知らせ：来週の月曜日は祝日のため、図書館は休みです。ただし、返却ボックスは２４時間使えますので、本を返す人は利用してください。",
                            "Người muốn trả sách vào thứ Hai tuần sau cần làm gì?",
                            List.of("Bỏ sách vào hộp trả sách bên ngoài vì thư viện đóng cửa nghỉ lễ",
                                    "Vào quầy thư viện trả trực tiếp như ngày thường",
                                    "Chờ đến thứ Ba mới được phép trả sách",
                                    "Chỉ trả được sách trước 5 giờ chiều ngày thứ Hai"),
                            0,
                            "Thứ Hai nghỉ lễ (休み) nhưng hộp trả sách (返却ボックス) vẫn hoạt động 24/24.")
            );
        }

        // N3, N2, N1
        if ("GRAMMAR_TRAP".equals(category)) {
            return List.of(
                    buildQuestItem("fb_n3_g1", category,
                            "Phân biệt sắc thái 「〜わけではない」 và 「〜はずがない」",
                            "",
                            "Chọn cách diễn đạt đúng sắc thái không phủ nhận hoàn toàn:\n甘いものが嫌いな（　　　　）が、健康のためにあまり食べないようにしている。",
                            List.of("わけではない", "はずがない", "に違いない", "べきではない"),
                            0,
                            "「〜わけではない」 mang nghĩa \"không hẳn là ghét đồ ngọt, nhưng vì sức khỏe nên hạn chế ăn\".")
            );
        }
        if ("KANJI_CONTEXT".equals(category)) {
            return List.of(
                    buildQuestItem("fb_n3_k1", category,
                            "Chọn từ Hán tự chuẩn văn viết thương mại",
                            "",
                            "Chọn từ thích hợp điền vào chỗ trống:\n会議の資料は、昨日のうちに全員に（　　）済みです。",
                            List.of("配布", "配達", "配送", "配置"),
                            0,
                            "「配布（はいふ）」 dùng cho việc phát tài liệu/tờ rơi cho nhiều người; còn 「配達」 là giao hàng/thư.")
            );
        }
        return List.of(
                buildQuestItem("fb_n3_r1", category,
                        "Đọc hiểu suy luận ý kiến tác giả",
                        "最近のスマホは機能が多すぎて、かえって使いにくいという声もある。しかし、必要な機能だけを選んで設定すれば、生活はずっと便利になるはずだ。",
                        "Tác giả cho rằng điều quan trọng khi sử dụng điện thoại nhiều tính năng là gì?",
                        List.of("Chỉ chọn và cài đặt những tính năng thực sự cần thiết cho bản thân",
                                "Quay lại dùng điện thoại đời cũ ít tính năng hơn",
                                "Học thuộc toàn bộ mọi tính năng của máy trước khi dùng",
                                "Hạn chế dùng điện thoại trong sinh hoạt hằng ngày"),
                        0,
                        "Sau từ chuyển ý 「しかし」, tác giả khẳng định nếu chỉ chọn và thiết lập những chức năng cần thiết (必要な機能だけを選んで設定すれば) thì sẽ rất tiện lợi.")
        );
    }

    private EnrichedProgress enrichProgress(DailyQuestGenerateRequest req, String userId) {
        String level = normalizeLevel(req.getLevel());
        int vocab = req.getVocabLearned();
        int kanji = req.getKanjiLearned();
        int grammar = req.getGrammarLearned();
        int exams = req.getExamsCompleted();
        String milestoneId = safeStr(req.getCurrentMilestoneId(), "");
        String milestoneTitle = safeStr(req.getCurrentMilestoneTitle(), "");

        if (firestore != null && !"guest".equals(userId)) {
            try {
                DocumentSnapshot snap = firestore.collection("user_progress").document(userId)
                        .get().get(2, TimeUnit.SECONDS);
                if (snap.exists()) {
                    if (vocab == 0 && snap.contains("vocabLearned")) vocab = toInt(snap.get("vocabLearned"));
                    if (kanji == 0 && snap.contains("kanjiLearned")) kanji = toInt(snap.get("kanjiLearned"));
                    if (grammar == 0 && snap.contains("grammarLearned")) grammar = toInt(snap.get("grammarLearned"));
                    if (exams == 0 && snap.contains("examsCompleted")) exams = toInt(snap.get("examsCompleted"));
                    if (milestoneId.isEmpty() && snap.contains("currentMilestoneId")) {
                        milestoneId = safeStr(String.valueOf(snap.get("currentMilestoneId")), "");
                    }
                    if (milestoneTitle.isEmpty() && snap.contains("currentMilestoneTitle")) {
                        milestoneTitle = safeStr(String.valueOf(snap.get("currentMilestoneTitle")), "");
                    }
                }
            } catch (Exception e) {
                logger.debug("Enrich progress from Firestore skipped: {}", e.getMessage());
            }
        }

        // Xác định mảng học còn yếu nhất để ưu tiên câu hỏi phù hợp
        String weakFocusVi;
        if (kanji <= vocab && kanji <= grammar) {
            weakFocusVi = "Hán tự và đọc hiểu ngữ cảnh";
        } else if (grammar <= vocab) {
            weakFocusVi = "Ngữ pháp và phân biệt trợ từ";
        } else {
            weakFocusVi = "Vận dụng từ vựng và phản xạ đề thi";
        }

        return new EnrichedProgress(level, milestoneId, milestoneTitle, vocab, kanji, grammar, exams, weakFocusVi);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> loadFromFirestore(String docId) {
        if (firestore == null) return null;
        try {
            DocumentSnapshot snap = firestore.collection(COLLECTION_NAME).document(docId)
                    .get().get(2, TimeUnit.SECONDS);
            if (snap.exists() && snap.getData() != null) {
                Map<String, Object> data = new LinkedHashMap<>(snap.getData());
                Object qObj = data.get("quests");
                if (qObj instanceof List<?> list && list.size() == 3) {
                    return data;
                }
            }
        } catch (Exception e) {
            logger.debug("Firestore daily_quests read skipped: {}", e.getMessage());
        }
        return null;
    }

    private void saveToFirestore(String docId, Map<String, Object> bundle) {
        if (firestore == null) return;
        try {
            firestore.collection(COLLECTION_NAME).document(docId).set(bundle);
        } catch (Exception e) {
            logger.debug("Firestore daily_quests write skipped: {}", e.getMessage());
        }
    }

    private static String normalizeDate(String dateRaw) {
        if (dateRaw != null && dateRaw.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            return dateRaw;
        }
        return LocalDate.now(VN_ZONE).toString();
    }

    private static String normalizeLevel(String raw) {
        if (raw == null) return "N5";
        String upper = raw.trim().toUpperCase(Locale.ROOT);
        if (List.of("N5", "N4", "N3", "N2", "N1").contains(upper)) return upper;
        return "N5";
    }

    private static int toInt(Object val) {
        if (val instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(val));
        } catch (Exception e) {
            return 0;
        }
    }

    private static String safeStr(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value.trim() : fallback;
    }

    private static String truncate(String str, int maxLen) {
        if (str == null) return "";
        return str.length() <= maxLen ? str : str.substring(0, maxLen);
    }

    private record EnrichedProgress(
            String level,
            String milestoneId,
            String milestoneTitle,
            int vocabLearned,
            int kanjiLearned,
            int grammarLearned,
            int examsCompleted,
            String weakFocusVi
    ) {}
}
