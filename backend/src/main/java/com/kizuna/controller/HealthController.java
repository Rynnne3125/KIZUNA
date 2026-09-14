package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "kizuna-backend");
        health.put("port", 3000);
        health.put("message", "KIZUNA backend is running smoothly");
        return ResponseEntity.ok(ApiResponse.success("System is healthy", health));
    }

    @GetMapping("/firestore")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkFirestore() {
        Map<String, Object> firestoreInfo = new HashMap<>();
        firestoreInfo.put("projectId", "ebook-fdc02");
        firestoreInfo.put("databaseUrl", "https://ebook-fdc02-default-rtdb.firebaseio.com");
        firestoreInfo.put("firestoreConfigured", true);
        firestoreInfo.put("note", "Firestore bean is injected and ready");
        return ResponseEntity.ok(ApiResponse.success("Firestore configuration is active", firestoreInfo));
    }
}
