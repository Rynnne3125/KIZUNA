package com.kizuna.controller;

import com.google.cloud.firestore.Firestore;
import com.kizuna.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@Tag(name = "Health Check", description = "Endpoints for monitoring server status and database connectivity")
@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
public class HealthController {

    private final Firestore firestore;
    private final Environment environment;

    @Operation(summary = "Check backend and Firestore status")
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        Map<String, Object> healthInfo = new HashMap<>();
        healthInfo.put("status", "UP");
        healthInfo.put("service", "kizuna-backend");
        healthInfo.put("activeProfiles", environment.getActiveProfiles());
        healthInfo.put("javaVersion", System.getProperty("java.version"));
        healthInfo.put("firestoreConnected", firestore != null);

        return ResponseEntity.ok(ApiResponse.success("Kizuna Backend is running smoothly", healthInfo));
    }
}
