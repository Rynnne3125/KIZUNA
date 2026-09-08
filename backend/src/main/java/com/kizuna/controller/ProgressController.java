package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.ProgressSubmitRequest;
import com.kizuna.dto.response.ProgressSummaryResponse;
import com.kizuna.model.UserProgress;
import com.kizuna.security.SecurityUtils;
import com.kizuna.service.ProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Study Progress & Spaced Repetition (SRS)", description = "Endpoints for tracking user learning, SM-2 spaced repetition and streaks")
@RestController
@RequestMapping("/api/v1/progress")
@RequiredArgsConstructor
@SecurityRequirement(name = "FirebaseBearerAuth")
public class ProgressController {

    private final ProgressService progressService;

    @Operation(summary = "Submit flashcard / quiz result using SM-2 algorithm")
    @PostMapping
    public ResponseEntity<ApiResponse<UserProgress>> submitProgress(
            @Valid @RequestBody ProgressSubmitRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        UserProgress updatedProgress = progressService.recordProgress(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Study progress recorded successfully", updatedProgress));
    }

    @Operation(summary = "Get user overall learning progress summary, streaks, and XP")
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<ProgressSummaryResponse>> getProgressSummary() {
        String userId = SecurityUtils.getCurrentUserId();
        ProgressSummaryResponse summary = progressService.getProgressSummary(userId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @Operation(summary = "Get list of flashcard items due for review today")
    @GetMapping("/due")
    public ResponseEntity<ApiResponse<List<UserProgress>>> getDueReviews() {
        String userId = SecurityUtils.getCurrentUserId();
        List<UserProgress> dueReviews = progressService.getDueReviews(userId);
        return ResponseEntity.ok(ApiResponse.success(dueReviews));
    }
}
