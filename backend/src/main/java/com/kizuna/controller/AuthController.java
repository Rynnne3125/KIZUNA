package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.response.UserProfileResponse;
import com.kizuna.security.FirebaseUserPrincipal;
import com.kizuna.security.SecurityUtils;
import com.kizuna.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Authentication & User Profile", description = "Endpoints for managing user accounts and syncing Firebase Auth")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@SecurityRequirement(name = "FirebaseBearerAuth")
public class AuthController {

    private final UserService userService;

    @Operation(summary = "Get and sync current user profile using Firebase Token")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getCurrentUser() {
        FirebaseUserPrincipal principal = SecurityUtils.getCurrentUserRequired();
        UserProfileResponse profile = userService.syncFirebaseUser(principal);
        return ResponseEntity.ok(ApiResponse.success("User profile synchronized", profile));
    }

    @Operation(summary = "Update user's target JLPT level (N5, N4, N3, N2, N1)")
    @PatchMapping("/target-level")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateTargetLevel(
            @RequestParam String level) {
        String uid = SecurityUtils.getCurrentUserId();
        UserProfileResponse updated = userService.updateTargetLevel(uid, level);
        return ResponseEntity.ok(ApiResponse.success("Target JLPT level updated", updated));
    }
}
