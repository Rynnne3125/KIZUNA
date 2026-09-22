package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.AiAuditResolveRequest;
import com.kizuna.dto.request.AiSandboxRequest;
import com.kizuna.model.AiAuditEntry;
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

    // 1. AI Sandbox & Prompt Studio
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
        AiAuditEntry resolved = aiGovernanceService.resolveAudit(id, principal.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Xử lý khiếu nại AI thành công (" + resolved.getStatus() + ")", resolved));
    }

    // 4. Giám sát Token & Latency Metrics
    @GetMapping("/ai/metrics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAiMetrics() {
        Map<String, Object> metrics = aiGovernanceService.getMetrics();
        return ResponseEntity.ok(ApiResponse.success("Lấy thông số giám sát AI thành công", metrics));
    }

    // 5. Biểu đồ Phễu rơi rụng học viên theo 28 mốc
    @GetMapping("/analytics/drop-off-funnel")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDropOffFunnel() {
        List<Map<String, Object>> funnel = aiGovernanceService.getDropOffFunnel();
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu phễu rơi rụng thành công", funnel));
    }

    // 6. Báo cáo từ vựng & Kanji hay làm sai nhất
    @GetMapping("/analytics/hardest-items")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHardestItems() {
        List<Map<String, Object>> items = aiGovernanceService.getHardestItems();
        return ResponseEntity.ok(ApiResponse.success("Lấy báo cáo kiến thức khó nhất thành công", items));
    }
}
