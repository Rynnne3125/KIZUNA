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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/journey")
public class AdminJourneyController {

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getJourneyOverview(
            @AuthenticationPrincipal UserPrincipal principal) {
        Map<String, Object> data = new HashMap<>();
        data.put("adminUsername", principal.getUsername());
        data.put("role", principal.getRole());
        data.put("totalStages", 5);
        data.put("totalMilestones", 24);
        data.put("aiPromptsConfigured", 12);
        data.put("status", "ADMIN_ACCESS_GRANTED");

        return ResponseEntity.ok(ApiResponse.success("Admin journey overview fetched successfully", data));
    }

    @PostMapping("/milestone")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createMilestone(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> milestoneData) {
        Map<String, Object> result = new HashMap<>(milestoneData);
        result.put("createdById", principal.getId());
        result.put("createdBy", principal.getUsername());
        result.put("milestoneId", "MS-" + System.currentTimeMillis());
        result.put("status", "CREATED");

        return ResponseEntity.ok(ApiResponse.success("Milestone created successfully by ADMIN", result));
    }
}
