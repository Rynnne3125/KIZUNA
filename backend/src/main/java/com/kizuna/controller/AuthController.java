package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.LoginRequest;
import com.kizuna.dto.response.LoginResponse;
import com.kizuna.dto.response.UserResponse;
import com.kizuna.security.UserPrincipal;
import com.kizuna.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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

    @PostMapping("/firebase-exchange")
    public ResponseEntity<ApiResponse<LoginResponse>> exchangeFirebaseToken(@RequestBody Map<String, String> body) {
        String idToken = body.get("idToken");
        LoginResponse response = userService.exchangeFirebaseIdToken(idToken);
        return ResponseEntity.ok(ApiResponse.success("Firebase session exchanged for JWT", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized"));
        }
        UserResponse response = userService.getCurrentUser(principal.getUsername());
        return ResponseEntity.ok(ApiResponse.success("User profile fetched successfully", response));
    }
}
