package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.model.SystemSettings;
import com.kizuna.repository.SystemSettingsRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/system")
public class SystemStatusController {

    private final SystemSettingsRepository settingsRepository;

    public SystemStatusController(SystemSettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPublicStatus() {
        SystemSettings s = settingsRepository.getSettings();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("maintenanceMode", s.isMaintenanceMode());
        payload.put("maintenanceMessage", s.getMaintenanceMessage());
        payload.put("allowNewRegistrations", s.isAllowNewRegistrations());
        payload.put("aiSenseiEnabled", s.isAiSenseiEnabled());
        payload.put("serverTime", Instant.now().toString());
        return ResponseEntity.ok(ApiResponse.success("System status fetched", payload));
    }
}
