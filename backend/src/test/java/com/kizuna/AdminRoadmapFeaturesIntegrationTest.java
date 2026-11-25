package com.kizuna;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kizuna.dto.request.AiAppealCreateRequest;
import com.kizuna.dto.request.AiAuditResolveRequest;
import com.kizuna.dto.request.AiConfigUpdateRequest;
import com.kizuna.dto.request.AiSenseiEvaluateRequest;
import com.kizuna.dto.request.LoginRequest;
import com.kizuna.model.GrammarItem;
import com.kizuna.model.JlptExam;
import com.kizuna.model.KanjiItem;
import com.kizuna.model.SystemSettings;
import com.kizuna.model.User;
import com.kizuna.model.VocabularyItem;
import com.kizuna.repository.UserFirestoreRepository;
import com.kizuna.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class AdminRoadmapFeaturesIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private UserFirestoreRepository userFirestoreRepository;

    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() throws Exception {
        // Test email-based admin login as well as username login
        LoginRequest adminLogin = new LoginRequest("admin@kizuna.com", "admin123");
        MvcResult adminResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminLogin)))
                .andExpect(status().isOk())
                .andReturn();
        adminToken = objectMapper.readTree(adminResult.getResponse().getContentAsString())
                .path("data").path("token").asText();

        LoginRequest userLogin = new LoginRequest("user", "user123");
        MvcResult userResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userLogin)))
                .andExpect(status().isOk())
                .andReturn();
        userToken = objectMapper.readTree(userResult.getResponse().getContentAsString())
                .path("data").path("token").asText();
    }

    @Test
    @DisplayName("P0: AI Placement Monitor & Dynamic AI Config Update")
    void aiPlacementMonitorAndDynamicConfig() throws Exception {
        mockMvc.perform(get("/api/v1/admin/ai/placement-monitor")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.dailyLimit", greaterThanOrEqualTo(0)))
                .andExpect(jsonPath("$.data.confidenceDistribution.HIGH", notNullValue()))
                .andExpect(jsonPath("$.data.levelDistribution.N5", notNullValue()));

        AiConfigUpdateRequest update = new AiConfigUpdateRequest();
        update.setModel("gemini-2.5-flash");
        update.setDailyLimit(250);
        update.setTimeoutSeconds(6);
        update.setSenseiEnabled(true);

        mockMvc.perform(put("/api/v1/admin/ai/config")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.model", is("gemini-2.5-flash")))
                .andExpect(jsonPath("$.data.dailyLimit", is(250)));

        // Invalid model pattern must be rejected with 400
        AiConfigUpdateRequest invalid = new AiConfigUpdateRequest();
        invalid.setModel("gpt-4-invalid");
        mockMvc.perform(put("/api/v1/admin/ai/config")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());

        // Restore default config
        AiConfigUpdateRequest restore = new AiConfigUpdateRequest();
        restore.setModel("gemini-3.5-flash-lite");
        restore.setDailyLimit(100);
        restore.setTimeoutSeconds(5);
        mockMvc.perform(put("/api/v1/admin/ai/config")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(restore)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("P1: Auto Anti-Cheat Anomaly Scanner, Maintenance Settings & Activity Logs")
    void antiCheatScannerSettingsAndLogs() throws Exception {
        User suspicious = new User("suspect_1", "cheater", "pw", "Suspicious User", "cheat@kizuna.com", "ROLE_USER", true);
        suspicious.setActivePoints(3200);
        suspicious.setTotalXp(50);
        suspicious.setCurrentStreak(40);
        suspicious.setLevel("Tân binh");
        suspicious.setCreatedAt(Instant.now().toString());
        when(userFirestoreRepository.getAllUsers()).thenReturn(List.of(suspicious));

        mockMvc.perform(get("/api/v1/admin/anti-cheat/anomalies")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].userId", is("suspect_1")))
                .andExpect(jsonPath("$.data[0].severity", is("HIGH")))
                .andExpect(jsonPath("$.data[0].flags", hasItem("STREAK_EXCEEDS_ACCOUNT_AGE")));

        // Toggle maintenance mode & verify public status endpoint
        SystemSettings s = new SystemSettings();
        s.setMaintenanceMode(true);
        s.setMaintenanceMessage("Đang nâng cấp dữ liệu N5-N1");
        s.setAllowNewRegistrations(false);
        s.setAiSenseiEnabled(true);

        mockMvc.perform(put("/api/v1/admin/settings")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.maintenanceMode", is(true)));

        mockMvc.perform(get("/api/v1/system/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.maintenanceMode", is(true)))
                .andExpect(jsonPath("$.data.maintenanceMessage", is("Đang nâng cấp dữ liệu N5-N1")));

        // Reset maintenance mode to false
        s.setMaintenanceMode(false);
        mockMvc.perform(put("/api/v1/admin/settings")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(s)))
                .andExpect(status().isOk());

        // Verify activity logs captured the settings update
        mockMvc.perform(get("/api/v1/admin/activity-logs")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", not(empty())))
                .andExpect(jsonPath("$.data[0].action", is("SYSTEM_SETTINGS_UPDATE")));
    }

    @Test
    @DisplayName("P1: Bulk CSV Import (Vocabulary & Kanji), Grammar/Exams CRUD & Backup")
    void bulkImportGrammarExamAndBackup() throws Exception {
        VocabularyItem v1 = new VocabularyItem();
        v1.setTerm("学生");
        v1.setReading("がくせい");
        v1.setVietnameseMeaning("Sinh viên");
        v1.setLevel("N5");

        mockMvc.perform(post("/api/v1/admin/vocabulary/bulk")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(v1))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.importedCount", is(1)));

        KanjiItem k1 = new KanjiItem();
        k1.setKanji("学");
        k1.setSinoVietnamese("HỌC");
        k1.setVietnameseMeaning("Học tập");
        k1.setStrokeCount(8);

        mockMvc.perform(post("/api/v1/admin/kanji/bulk")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(k1))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.importedCount", is(1)));

        GrammarItem g = new GrammarItem();
        g.setPattern("N1 は N2 です");
        g.setTitleVi("N1 là N2");
        mockMvc.perform(post("/api/v1/admin/grammar")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(g)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.pattern", is("N1 は N2 です")));

        JlptExam ex = new JlptExam();
        ex.setLabel("JLPT N5 Test 2026");
        ex.setLevel("N5");
        mockMvc.perform(post("/api/v1/admin/exams")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ex)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.label", is("JLPT N5 Test 2026")));

        mockMvc.perform(get("/api/v1/admin/curriculum/backup")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.counts.stages", greaterThan(0)));
    }

    @Test
    @DisplayName("P2: Quest 4 AI Sensei Whitelist Evaluation & Human-in-the-loop Appeal Loop")
    void aiSenseiEvaluateAndRealAppealResolution() throws Exception {
        // 1. Evaluate a sentence with particle mistake 「私わ」
        AiSenseiEvaluateRequest evalReq = new AiSenseiEvaluateRequest();
        evalReq.setMilestoneId("ms_minna_b01");
        evalReq.setMilestoneTitle("Bài 1: Giới thiệu bản thân");
        evalReq.setStudentInput("私わ学生です。");
        evalReq.setRequiredKeywords(List.of("です"));
        evalReq.setWhitelistVocabulary(List.of("私", "学生"));

        mockMvc.perform(post("/api/v1/ai/sensei/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(evalReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.evaluatedScore", notNullValue()))
                .andExpect(jsonPath("$.data.particleErrors", not(empty())));

        // 2. Learner submits real appeal for user "2"
        int initialPoints = userRepository.findById("2").map(User::getActivePoints).orElse(0);
        AiAppealCreateRequest appealReq = new AiAppealCreateRequest();
        appealReq.setUserId("2");
        appealReq.setUsername("user");
        appealReq.setMilestoneId("ms_minna_b01");
        appealReq.setMilestoneTitle("Bài 1: Giới thiệu bản thân");
        appealReq.setStudentInput("初めまして、アンです。");
        appealReq.setAiFeedback("Thiếu 私は");
        appealReq.setAiScore(6);
        appealReq.setStudentReason("Trong giao tiếp tự nhiên người Nhật thường lược bỏ 私は ạ!");

        MvcResult appealRes = mockMvc.perform(post("/api/v1/ai/appeals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(appealReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status", is("PENDING")))
                .andReturn();
        String auditId = objectMapper.readTree(appealRes.getResponse().getContentAsString())
                .path("data").path("id").asText();

        // 3. Admin approves appeal -> refunds +30 AP to user "2"
        AiAuditResolveRequest resolveReq = new AiAuditResolveRequest("APPROVE", 30, "Đồng ý lược bỏ chủ ngữ tự nhiên");
        mockMvc.perform(post("/api/v1/admin/ai/audit-queue/" + auditId + "/resolve")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resolveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("APPROVED")))
                .andExpect(jsonPath("$.data.bonusPointsAwarded", is(30)));

        int updatedPoints = userRepository.findById("2").map(User::getActivePoints).orElse(0);
        org.junit.jupiter.api.Assertions.assertEquals(initialPoints + 30, updatedPoints);

        // 4. Verify ROLE_USER is still forbidden from Admin endpoints
        mockMvc.perform(get("/api/v1/admin/ai/placement-monitor")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/anti-cheat/anomalies")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Quest SRS Cards CRUD: Admin creates/updates FLASHCARD_SRS quest with explicit srsCards and User reads them")
    void adminQuestSrsCardsCrudAndUserRead() throws Exception {
        String questPayload = """
                {
                  "id": "quest_test_srs_b01",
                  "milestoneId": "ms_minna_b01",
                  "stepIndex": 1,
                  "questType": "FLASHCARD_SRS",
                  "title": "Thẻ SRS tùy chỉnh Bài 1",
                  "description": "Bộ thẻ chọn lọc",
                  "xpReward": 45,
                  "activePointsReward": 20,
                  "srsCardIds": ["v_test_1", "k_test_1"],
                  "srsCards": [
                    {
                      "id": "v_test_1",
                      "itemType": "VOCABULARY",
                      "term": "先生",
                      "reading": "せんせい",
                      "sinoVietnamese": "TIÊN SINH",
                      "meaning": "Giáo viên",
                      "exampleJp": "田中さんは先生です。",
                      "exampleVi": "Anh Tanaka là giáo viên."
                    },
                    {
                      "id": "k_test_1",
                      "itemType": "KANJI",
                      "term": "学",
                      "reading": "ガク / まな.ぶ",
                      "sinoVietnamese": "HỌC",
                      "meaning": "Học tập",
                      "exampleJp": "日本語を学びます。",
                      "exampleVi": "Tôi học tiếng Nhật."
                    }
                  ]
                }
                """;

        mockMvc.perform(post("/api/v1/admin/quests")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(questPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.questType", is("FLASHCARD_SRS")))
                .andExpect(jsonPath("$.data.srsCards", hasSize(2)))
                .andExpect(jsonPath("$.data.srsCards[0].term", is("先生")))
                .andExpect(jsonPath("$.data.srsCardIds", hasSize(2)));

        mockMvc.perform(get("/api/v1/curriculum/milestones/ms_minna_b01/quests")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id=='quest_test_srs_b01')].srsCards[0].term", hasItem("先生")));

        mockMvc.perform(delete("/api/v1/admin/quests/quest_test_srs_b01")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }
}
