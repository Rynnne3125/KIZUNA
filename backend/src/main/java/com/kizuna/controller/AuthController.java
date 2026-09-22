package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.LoginRequest;
import com.kizuna.dto.response.LoginResponse;
import com.kizuna.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
        LoginResponse response = userService.login(loginRequest);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<com.kizuna.dto.response.UserResponse>> getCurrentUser(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.kizuna.security.UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized"));
        }
        com.kizuna.dto.response.UserResponse response = userService.getCurrentUser(principal.getUsername());
        return ResponseEntity.ok(ApiResponse.success("User profile fetched successfully", response));
    }
}