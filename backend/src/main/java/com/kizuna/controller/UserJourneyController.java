package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/user/journey")
public class UserJourneyController {

    @GetMapping("/progress")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProgress(
            @AuthenticationPrincipal UserPrincipal principal) {
        Map<String, Object> progress = new HashMap<>();
        progress.put("username", principal.getUsername());
        progress.put("role", principal.getRole());
        progress.put("currentStage", 1);
        progress.put("currentMilestone", "Chặng 1: Bảng chữ cái Hiragana & Katakana");
        progress.put("streakDays", 7);
        progress.put("totalXp", 450);
        progress.put("status", "USER_ACCESS_GRANTED");

        return ResponseEntity.ok(ApiResponse.success("User journey progress fetched successfully", progress));
    }

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitMilestoneReview(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> submission) {
        Map<String, Object> result = new HashMap<>(submission);
        result.put("username", principal.getUsername());
        result.put("scoredXp", 50);
        result.put("result", "PASSED");

        return ResponseEntity.ok(ApiResponse.success("Review submitted successfully by USER", result));
    }
}
