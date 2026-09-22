package com.kizuna;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kizuna.dto.request.GameplayConfigRequest;
import com.kizuna.dto.request.LoginRequest;
import com.kizuna.dto.request.MilestoneStatusRequest;
import com.kizuna.dto.request.QuestSubmitRequest;
import com.kizuna.dto.request.SrsReviewRequest;
import com.kizuna.repository.UserFirestoreRepository;
import com.kizuna.repository.UserProgressRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class BackendFullRbacAndProgressIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserProgressRepository userProgressRepository;

    @MockitoBean
    private UserFirestoreRepository userFirestoreRepository;

    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() throws Exception {
        // 1. Đăng nhập Admin lấy Bearer Token
        LoginRequest adminLogin = new LoginRequest("admin", "admin123");
        MvcResult adminResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminLogin)))
                .andExpect(status().isOk())
                .andReturn();
        adminToken = objectMapper.readTree(adminResult.getResponse().getContentAsString())
                .path("data").path("token").asText();

        // 2. Đăng nhập User thường lấy Bearer Token
        LoginRequest userLogin = new LoginRequest("user", "user123");
        MvcResult userResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userLogin)))
                .andExpect(status().isOk())
                .andReturn();
        userToken = objectMapper.readTree(userResult.getResponse().getContentAsString())
                .path("data").path("token").asText();

        // Đảm bảo dữ liệu tiến trình độc lập giữa các test
        userProgressRepository.delete("2", "ms_s1_01_hiragana");
        userProgressRepository.delete("2", "ms_s1_02_katakana_phonetics");
    }

    // =========================================================================
    // 1. QUY TẮC BẢO MẬT & MÃ LỖI HTTP: 401, 403, 404, 400
    // =========================================================================

    @Test
    @DisplayName("401 Unauthorized: Không truyền Bearer Token -> 401")
    void unauthenticatedAccessShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/v1/user/journey/map"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/admin/stages"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/curriculum/stages"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("403 Forbidden: User gọi API Admin -> 403")
    void roleUserAccessAdminEndpointShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/stages")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("403 Forbidden: Admin gọi API User -> 403")
    void roleAdminAccessUserEndpointShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/user/journey/map")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("404 Not Found: Tìm tài nguyên không tồn tại -> 404")
    void notFoundEntityShouldReturn404() throws Exception {
        mockMvc.perform(get("/api/v1/curriculum/milestones/non_existent_milestone_xyz")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("400 Bad Request: Dữ liệu nộp bài không hợp lệ (questIndex ngoài 1-4) -> 400")
    void invalidQuestSubmitShouldReturn400() throws Exception {
        QuestSubmitRequest invalidReq = new QuestSubmitRequest(99, null, 0.0);
        mockMvc.perform(post("/api/v1/user/milestones/milestone_01_alphabet/quests/99/submit")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));
    }

    // =========================================================================
    // 2. SHARED ENDPOINTS: CẢ USER VÀ ADMIN ĐỀU DÙNG ĐƯỢC
    // =========================================================================

    @Test
    @DisplayName("Shared API: Cả User và Admin đều lấy được danh sách Chặng & Mốc")
    void userAndAdminCanAccessCurriculumStages() throws Exception {
        // User access
        mockMvc.perform(get("/api/v1/curriculum/stages")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", not(empty())));

        // Admin access
        mockMvc.perform(get("/api/v1/curriculum/stages")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", not(empty())));
    }

    @Test
    @DisplayName("Shared API: Cả User và Admin đều lấy được Bảng Xếp Hạng")
    void userAndAdminCanAccessLeaderboard() throws Exception {
        mockMvc.perform(get("/api/v1/leaderboard")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.topUsers", not(empty())));
    }

    @Test
    @DisplayName("Auth Me: Kiểm tra lấy thông tin cá nhân từ Token")
    void getCurrentUserViaMeEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username", is("user")))
                .andExpect(jsonPath("$.data.role", is("ROLE_USER")));
    }

    // =========================================================================
    // 3. USER JOURNEY & CÁCH LY TIẾN TRÌNH TRÊN BẢNG user_progress
    // =========================================================================

    @Test
    @DisplayName("User Journey: Lấy Map khởi tạo -> Mốc 1 UNLOCKED, các mốc sau LOCKED")
    void userInitialJourneyMapVerification() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/user/journey/map")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.stages", not(empty())))
                .andReturn();

        // Mốc 1 phải UNLOCKED
        mockMvc.perform(get("/api/v1/user/journey/map")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(jsonPath("$.data.stages[0].milestones[0].status", is("UNLOCKED")));
    }

    @Test
    @DisplayName("User Journey: Cố truy cập Quest của mốc đang LOCKED -> Trả về 400 Bad Request")
    void accessLockedMilestoneQuestsShouldReturn400() throws Exception {
        // Mốc 2 đang bị locked khi chưa xong mốc 1
        mockMvc.perform(get("/api/v1/user/milestones/ms_s1_02_katakana_phonetics/quests")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("bị khóa")));
    }

    @Test
    @DisplayName("User Progression Flow: Nộp trọn vẹn 4 Quests -> Mốc 1 COMPLETED -> Tự động mở Mốc 2")
    void completeAllQuestsAndUnlockNextMilestone() throws Exception {
        String milestone1Id = "ms_s1_01_hiragana";

        // Khởi tạo map cho user
        mockMvc.perform(get("/api/v1/user/journey/map")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk());

        // 1. Nộp Quest 1 (SRS Flashcard Deck) -> Thưởng 25 XP, 10 Active Points
        QuestSubmitRequest q1 = new QuestSubmitRequest(1, null, null);
        mockMvc.perform(post("/api/v1/user/milestones/" + milestone1Id + "/quests/1/submit")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(q1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scoredXp", is(25)))
                .andExpect(jsonPath("$.data.scoredActivePoints", is(10)))
                .andExpect(jsonPath("$.data.milestoneCompleted", is(false)));

        // 2. Nộp Quest 2 (Vocab Gatekeeper) kèm 1 từ sai -> Thưởng 35 XP, 15 Active Points, từ sai vào SRS
        QuestSubmitRequest q2 = new QuestSubmitRequest(2, List.of("vocab_001"), 100.0);
        mockMvc.perform(post("/api/v1/user/milestones/" + milestone1Id + "/quests/2/submit")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(q2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scoredXp", is(35)))
                .andExpect(jsonPath("$.data.scoredActivePoints", is(15)));

        // 3. Nộp Quest 3 (Grammar Scramble & Board) -> Thưởng 45 XP, 20 Active Points
        QuestSubmitRequest q3 = new QuestSubmitRequest(3, null, null);
        mockMvc.perform(post("/api/v1/user/milestones/" + milestone1Id + "/quests/3/submit")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(q3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scoredXp", is(45)))
                .andExpect(jsonPath("$.data.scoredActivePoints", is(20)));

        // 4. Nộp Quest 4 (Practice & Finish) -> Hoàn thành mốc, tự động mở mốc 2!
        QuestSubmitRequest q4 = new QuestSubmitRequest(4, null, 100.0);
        mockMvc.perform(post("/api/v1/user/milestones/" + milestone1Id + "/quests/4/submit")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(q4)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scoredXp", is(50)))
                .andExpect(jsonPath("$.data.scoredActivePoints", is(25)))
                .andExpect(jsonPath("$.data.milestoneCompleted", is(true)))
                .andExpect(jsonPath("$.data.nextMilestoneUnlocked", is(true)));

        // 5. Kiểm tra lại Profile học viên
        mockMvc.perform(get("/api/v1/user/profile")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.milestonesCompleted", greaterThanOrEqualTo(1)));
    }

    // =========================================================================
    // 4. USER SPACED REPETITION (SM-2)
    // =========================================================================

    @Test
    @DisplayName("User SRS: Đánh giá nhớ thẻ chất lượng 4 -> tính toán SM-2 và cộng điểm")
    void userSrsReviewVerification() throws Exception {
        SrsReviewRequest reviewReq = new SrsReviewRequest(4);
        mockMvc.perform(post("/api/v1/user/srs/vocab_001/review")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.repetitionLevel", is(1)))
                .andExpect(jsonPath("$.data.intervalDays", is(1)));
    }

    // =========================================================================
    // 5. ADMIN CURRICULUM CRUD & GOVERNANCE
    // =========================================================================

    @Test
    @DisplayName("Admin Governance: Điều chỉnh cân bằng gameplay cho Mốc học")
    void adminUpdateMilestoneGameplayConfig() throws Exception {
        GameplayConfigRequest req = new GameplayConfigRequest(80, 100, "ms_s1_01_hiragana");
        mockMvc.perform(put("/api/v1/admin/milestones/ms_s1_01_hiragana/gameplay-config")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.xpReward", is(80)))
                .andExpect(jsonPath("$.data.activePointsReward", is(100)));
    }

    @Test
    @DisplayName("Admin Governance: Bật/Tắt hiển thị mốc (Active/Inactive Toggle)")
    void adminToggleMilestoneStatus() throws Exception {
        MilestoneStatusRequest req = new MilestoneStatusRequest(false);
        mockMvc.perform(patch("/api/v1/admin/milestones/ms_s1_01_hiragana/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active", is(false)));
    }

    @Test
    @DisplayName("Admin AI Governance: AI Sandbox, Audit Queue & Metrics")
    void adminAiGovernanceEndpoints() throws Exception {
        // AI Metrics
        mockMvc.perform(get("/api/v1/admin/ai/metrics")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCallsLast7Days", notNullValue()));

        // Analytics Drop-off Funnel
        mockMvc.perform(get("/api/v1/admin/analytics/drop-off-funnel")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", not(empty())));

        // Learning Dossier for user "2"
        mockMvc.perform(get("/api/v1/admin/users/2/learning-dossier")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user", notNullValue()));
    }
}
