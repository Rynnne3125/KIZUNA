package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.QuestSubmitRequest;
import com.kizuna.dto.response.JourneyMapResponse;
import com.kizuna.dto.response.QuestSubmitResult;
import com.kizuna.model.MilestoneQuest;
import com.kizuna.model.UserProgress;
import com.kizuna.security.UserPrincipal;
import com.kizuna.service.UserProgressService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/user")
public class UserJourneyController {

    private final UserProgressService userProgressService;

    public UserJourneyController(UserProgressService userProgressService) {
        this.userProgressService = userProgressService;
    }

    // 1. Lấy bản đồ hành trình cá nhân hóa
    @GetMapping("/journey/map")
    public ResponseEntity<ApiResponse<JourneyMapResponse>> getJourneyMap(
            @AuthenticationPrincipal UserPrincipal principal) {
        JourneyMapResponse mapResponse = userProgressService.getJourneyMap(principal.getId(), principal.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Lấy bản đồ hành trình thành công", mapResponse));
    }

    // 2. Lấy danh sách 4 bài học của mốc (chỉ cho phép nếu mốc đã UNLOCKED/COMPLETED)
    @GetMapping("/milestones/{id}/quests")
    public ResponseEntity<ApiResponse<List<MilestoneQuest>>> getMilestoneQuests(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id) {
        List<MilestoneQuest> quests = userProgressService.getMilestoneQuestsForUser(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách bài học của mốc thành công", quests));
    }

    // 3. Nộp bài học: Chấm điểm, lưu user_progress, hoàn thành mở mốc tiếp theo
    @PostMapping("/milestones/{milestoneId}/quests/{questIndex}/submit")
    public ResponseEntity<ApiResponse<QuestSubmitResult>> submitQuest(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String milestoneId,
            @PathVariable int questIndex,
            @Valid @RequestBody QuestSubmitRequest request) {
        QuestSubmitResult result = userProgressService.submitQuest(
                principal.getId(),
                principal.getUsername(),
                milestoneId,
                questIndex,
                request
        );
        return ResponseEntity.ok(ApiResponse.success(result.getFeedbackMessage(), result));
    }

    // 4. Xem toàn bộ tiến độ của học viên
    @GetMapping("/progress")
    public ResponseEntity<ApiResponse<List<UserProgress>>> getUserProgress(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<UserProgress> progressList = userProgressService.getUserProgressList(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử tiến độ thành công", progressList));
    }

    // 5. Xem tiến độ 1 mốc cụ thể
    @GetMapping("/progress/{milestoneId}")
    public ResponseEntity<ApiResponse<UserProgress>> getMilestoneProgress(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String milestoneId) {
        UserProgress progress = userProgressService.getUserMilestoneProgress(principal.getId(), milestoneId);
        return ResponseEntity.ok(ApiResponse.success("Lấy tiến độ mốc thành công", progress));
    }
}
