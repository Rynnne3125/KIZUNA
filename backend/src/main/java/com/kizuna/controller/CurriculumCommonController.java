package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.response.LeaderboardResponse;
import com.kizuna.model.*;
import com.kizuna.security.UserPrincipal;
import com.kizuna.service.CurriculumService;
import com.kizuna.service.LeaderboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class CurriculumCommonController {

    private final CurriculumService curriculumService;
    private final LeaderboardService leaderboardService;

    public CurriculumCommonController(CurriculumService curriculumService,
                                    LeaderboardService leaderboardService) {
        this.curriculumService = curriculumService;
        this.leaderboardService = leaderboardService;
    }

    // --- STAGES ---
    @GetMapping("/curriculum/stages")
    public ResponseEntity<ApiResponse<List<Stage>>> getAllStages() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách các chặng thành công", curriculumService.getAllStages()));
    }

    @GetMapping("/curriculum/stages/{id}")
    public ResponseEntity<ApiResponse<Stage>> getStageById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin chặng thành công", curriculumService.getStageById(id)));
    }

    // --- MILESTONES ---
    @GetMapping("/curriculum/milestones")
    public ResponseEntity<ApiResponse<List<Milestone>>> getMilestones(@RequestParam(required = false) String stageId) {
        List<Milestone> milestones = (stageId != null && !stageId.isBlank())
                ? curriculumService.getMilestonesByStage(stageId)
                : curriculumService.getAllMilestones();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mốc học thành công", milestones));
    }

    @GetMapping("/curriculum/milestones/{id}")
    public ResponseEntity<ApiResponse<Milestone>> getMilestoneById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết mốc học thành công", curriculumService.getMilestoneById(id)));
    }

    // --- VOCABULARY ---
    @GetMapping("/curriculum/milestones/{id}/vocabulary")
    public ResponseEntity<ApiResponse<List<VocabularyItem>>> getMilestoneVocabulary(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách từ vựng của mốc thành công", curriculumService.getVocabularyByMilestone(id)));
    }

    // --- KANJI ---
    @GetMapping("/curriculum/milestones/{id}/kanji")
    public ResponseEntity<ApiResponse<List<KanjiItem>>> getMilestoneKanji(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chữ Hán của mốc thành công", curriculumService.getKanjiByMilestone(id)));
    }

    // --- GRAMMAR ---
    @GetMapping("/curriculum/milestones/{id}/grammar")
    public ResponseEntity<ApiResponse<List<GrammarItem>>> getMilestoneGrammar(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cấu trúc ngữ pháp của mốc thành công", curriculumService.getGrammarByMilestone(id)));
    }

    // --- LEADERBOARD (Shared for both User and Admin) ---
    @GetMapping("/leaderboard")
    public ResponseEntity<ApiResponse<LeaderboardResponse>> getLeaderboard(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false, defaultValue = "all-time") String type) {
        String currentUserId = principal != null ? principal.getId() : null;
        LeaderboardResponse response = leaderboardService.getLeaderboard(currentUserId, type);
        return ResponseEntity.ok(ApiResponse.success("Lấy bảng xếp hạng thành công", response));
    }
}
