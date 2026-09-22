package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.SrsReviewRequest;
import com.kizuna.model.UserSrsItem;
import com.kizuna.security.UserPrincipal;
import com.kizuna.service.SpacedRepetitionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/user/srs")
public class UserSrsController {

    private final SpacedRepetitionService spacedRepetitionService;

    public UserSrsController(SpacedRepetitionService spacedRepetitionService) {
        this.spacedRepetitionService = spacedRepetitionService;
    }

    // 1. Lấy danh sách thẻ SRS đến hạn ôn tập hôm nay
    @GetMapping("/today")
    public ResponseEntity<ApiResponse<List<UserSrsItem>>> getDueItemsToday(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<UserSrsItem> items = spacedRepetitionService.getDueItemsToday(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thẻ cần ôn tập hôm nay thành công", items));
    }

    // 2. Gửi kết quả đánh giá thẻ (0-5 sao) theo thuật toán SM-2
    @PostMapping("/{itemId}/review")
    public ResponseEntity<ApiResponse<UserSrsItem>> reviewItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String itemId,
            @Valid @RequestBody SrsReviewRequest request) {
        UserSrsItem updated = spacedRepetitionService.reviewItem(principal.getId(), itemId, request);
        return ResponseEntity.ok(ApiResponse.success("Đánh giá thẻ thành công (+5 Điểm Năng Động)", updated));
    }

    // 3. Lấy tất cả thẻ trong hàng đợi ôn tập của học viên
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<UserSrsItem>>> getAllUserItems(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<UserSrsItem> items = spacedRepetitionService.getAllUserItems(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy toàn bộ thẻ ôn tập thành công", items));
    }
}
