package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.AiAuditResolveRequest;
import com.kizuna.dto.request.AiConfigUpdateRequest;
import com.kizuna.dto.request.AiSandboxRequest;
import com.kizuna.model.AiAuditEntry;
import com.kizuna.model.AiRuntimeConfig;
import com.kizuna.security.UserPrincipal;
import com.kizuna.service.AiGovernanceService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminAiController {

    private final AiGovernanceService aiGovernanceService;

    public AdminAiController(AiGovernanceService aiGovernanceService) {
        this.aiGovernanceService = aiGovernanceService;
    }

    // 1. AI Sandbox & Prompt Studio (Whitelist-controlled evaluation)
    @PostMapping("/ai/sandbox-test")
    public ResponseEntity<ApiResponse<Map<String, Object>>> runSandboxTest(
            @Valid @RequestBody AiSandboxRequest request) {
        Map<String, Object> result = aiGovernanceService.runSandbox(request);
        return ResponseEntity.ok(ApiResponse.success("Thử nghiệm Prompt AI thành công", result));
    }

    // 2. Danh sách khiếu nại kiểm duyệt AI (Human-in-the-loop Audit Queue)
    @GetMapping("/ai/audit-queue")
    public ResponseEntity<ApiResponse<List<AiAuditEntry>>> getAuditQueue() {
        List<AiAuditEntry> queue = aiGovernanceService.getAuditQueue();
        return ResponseEntity.ok(ApiResponse.success("Lấy hàng đợi kiểm duyệt AI thành công", queue));
    }

    // 3. Phê duyệt/Bác bỏ khiếu nại AI (Hoàn Điểm Năng Động cho học viên)
    @PostMapping("/ai/audit-queue/{id}/resolve")
    public ResponseEntity<ApiResponse<AiAuditEntry>> resolveAudit(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody AiAuditResolveRequest request) {
        String adminUser = principal != null ? principal.getUsername() : "admin";
        AiAuditEntry resolved = aiGovernanceService.resolveAudit(id, adminUser, request);
        return ResponseEntity.ok(ApiResponse.success("Xử lý khiếu nại AI thành công (" + resolved.getStatus() + ")", resolved));
    }

    // 4. Giám sát Token & Latency Metrics
    @GetMapping("/ai/metrics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAiMetrics() {
        Map<String, Object> metrics = aiGovernanceService.getMetrics();
        return ResponseEntity.ok(ApiResponse.success("Lấy thông số giám sát AI thành công", metrics));
    }

    // 5. Giám sát AI Xếp lớp & Hạn mức Gemini (Stage 1 P0: AI Placement Monitor)
    @GetMapping("/ai/placement-monitor")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPlacementMonitor() {
        Map<String, Object> monitor = aiGovernanceService.getPlacementMonitor();
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu giám sát AI Placement thành công", monitor));
    }

    // 6. Cấu hình tham số AI động (Model Gemini, Daily Limit, Sensei Prompt)
    @GetMapping("/ai/config")
    public ResponseEntity<ApiResponse<AiRuntimeConfig>> getAiConfig() {
        return ResponseEntity.ok(ApiResponse.success("Lấy cấu hình AI thành công", aiGovernanceService.getAiConfig()));
    }

    @PutMapping("/ai/config")
    public ResponseEntity<ApiResponse<AiRuntimeConfig>> updateAiConfig(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiConfigUpdateRequest request) {
        String adminUser = principal != null ? principal.getUsername() : "admin";
        AiRuntimeConfig updated = aiGovernanceService.updateAiConfig(request, adminUser);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cấu hình AI thành công", updated));
    }

    // 7. Biểu đồ Phễu rơi rụng học viên theo cột mốc
    @GetMapping("/analytics/drop-off-funnel")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDropOffFunnel() {
        List<Map<String, Object>> funnel = aiGovernanceService.getDropOffFunnel();
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu phễu rơi rụng thành công", funnel));
    }

    // 8. Báo cáo từ vựng & Kanji hay làm sai nhất
    @GetMapping("/analytics/hardest-items")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHardestItems() {
        List<Map<String, Object>> items = aiGovernanceService.getHardestItems();
        return ResponseEntity.ok(ApiResponse.success("Lấy báo cáo kiến thức khó nhất thành công", items));
    }
}
