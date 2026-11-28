package com.kizuna.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kizuna.dto.request.DailyQuestGenerateRequest;
import com.kizuna.repository.CurriculumRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AiDailyQuestServiceTest {

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void detectsDisallowedEnglishWhileAllowingVietnameseAndJapanese() {
        assertTrue(AiDailyQuestService.containsDisallowedEnglish("Choose the correct particle for this sentence"));
        assertTrue(AiDailyQuestService.containsDisallowedEnglish("Đây là grammar explanation"));
        assertFalse(AiDailyQuestService.containsDisallowedEnglish("Phân biệt trợ từ 「に」 và 「で」 trong câu chuẩn JLPT N5."));
        assertFalse(AiDailyQuestService.containsDisallowedEnglish("「図書館で勉強する」 dùng 「で」 chỉ nơi diễn ra hành động."));
    }

    @Test
    void rejectsGeminiQuestsWithEnglishOrDuplicateOptions() {
        var runtime = new AiRuntimeService(json, null, "", "gemini-3.5-flash-lite", 10);
        var repo = new CurriculumRepository(json, null);
        var svc = new AiDailyQuestService(runtime, repo, json, null);

        String badBody = """
                {
                  "candidates": [{
                    "content": {
                      "parts": [{
                        "text": "{\\"quests\\":[{\\"category\\":\\"GRAMMAR_TRAP\\",\\"title\\":\\"Choose correct answer\\",\\"passage\\":\\"\\",\\"question\\":\\"私は学生（　）です。\\",\\"options\\":[\\"は\\",\\"は\\",\\"に\\",\\"で\\"],\\"correctIndex\\":0,\\"explanation\\":\\"Because it is topic particle.\\"},{\\"category\\":\\"KANJI_CONTEXT\\",\\"title\\":\\"Phân biệt cách đọc Hán tự\\",\\"passage\\":\\"\\",\\"question\\":\\"「二十日」 đọc thế nào?\\",\\"options\\":[\\"はつか\\",\\"ふつか\\",\\"みっか\\",\\"よっか\\"],\\"correctIndex\\":0,\\"explanation\\":\\"Ngày 20 trong tháng đọc là はつか.\\"}]}"
                      }]
                    }
                  }]
                }
                """;

        List<Map<String, Object>> parsed = svc.parseAndValidateGeminiQuests(badBody);
        assertEquals(1, parsed.size());
        assertEquals("KANJI_CONTEXT", parsed.get(0).get("category"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void generatesThreeNonEnglishQuestsAndCachesPerUserAndDate() {
        var runtime = new AiRuntimeService(json, null, "", "gemini-3.5-flash-lite", 10);
        var repo = new CurriculumRepository(json, null);
        var svc = new AiDailyQuestService(runtime, repo, json, null);

        var req = new DailyQuestGenerateRequest();
        req.setUserId("usr_test_1");
        req.setDate("2026-11-26");
        req.setLevel("N4");
        req.setVocabLearned(40);
        req.setKanjiLearned(10);
        req.setGrammarLearned(12);

        Map<String, Object> first = svc.generateOrGetDailyQuests(req);
        assertEquals(false, first.get("cached"));
        List<Map<String, Object>> quests = (List<Map<String, Object>>) first.get("quests");
        assertEquals(3, quests.size());
        for (Map<String, Object> q : quests) {
            assertFalse(AiDailyQuestService.containsDisallowedEnglish(String.valueOf(q.get("title"))));
            assertFalse(AiDailyQuestService.containsDisallowedEnglish(String.valueOf(q.get("question"))));
            assertFalse(AiDailyQuestService.containsDisallowedEnglish(String.valueOf(q.get("explanation"))));
        }

        Map<String, Object> second = svc.generateOrGetDailyQuests(req);
        assertEquals(true, second.get("cached"));
    }
}
